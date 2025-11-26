import * as THREE from 'three';
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { Chunk } from './Chunk.js';
import { SeededRandom } from '../Utils/SeededRandom.js';

export class World {
  constructor(game) {
    this.game = game;
    this.chunks = new Map();
    this.chunkSize = 16;
    this.chunkHeight = 200;
    this.renderDistance = 6; // High detail distance
    this.farRenderDistance = 16; // Low detail distance (Immense)
    this.seaLevel = 40;
    
    // Default seed
    this.seed = Math.random();
    this.setupNoise();
    
    this.modifications = new Map(); // Key: "x,y,z", Value: blockType

    this.params = {
        terrainScale: 30,
        terrainOffset: 0
    };
    
    this.lastDebugTime = 0;
    this.lastChunkUpdatePos = { x: -999, z: -999 };
    this.chunksToLoad = [];

    // Génération initiale synchrone
    this.generateInitialChunks();
  }

  setupNoise() {
      const rng = new SeededRandom(this.seed);
      // Create noise functions using the seeded random
      this.noise3D = createNoise3D(() => rng.random());
      this.noise2D = createNoise2D(() => rng.random());
      this.biomeNoise = createNoise2D(() => rng.random());
  }

  setSeed(seed) {
      console.log("Setting world seed:", seed);
      this.seed = seed;
      this.setupNoise();
      
      // Clear and regenerate
      this.chunks.forEach(chunk => {
          if (chunk.meshes) {
              Object.values(chunk.meshes).forEach(mesh => {
                  this.game.scene.remove(mesh);
                  mesh.geometry.dispose();
                  mesh.material.dispose();
              });
          }
          if (chunk.waterMesh) {
              this.game.scene.remove(chunk.waterMesh);
              chunk.waterMesh.geometry.dispose();
              chunk.waterMesh.material.dispose();
          }
      });
      this.chunks.clear();
      this.chunksToLoad = []; // Clear pending chunks
      this.lastChunkUpdatePos = { x: -999, z: -999 }; // Force update
      this.update(0); // Trigger update immediately
  }

  setModifications(modifications) {
      this.modifications = new Map();
      for (const [key, value] of Object.entries(modifications)) {
          this.modifications.set(key, value);
      }
      // If we receive modifications after generation, we might need to update chunks
      // But usually this is called at start.
      // If called later, we should probably re-render affected chunks.
  }

  addModification(x, y, z, type) {
      const key = `${x},${y},${z}`;
      this.modifications.set(key, type);
      this.setBlock(x, y, z, type);
  }

  getBiome(x, z) {
    // Echelle très large pour les biomes (500-1000 blocs)
    const value = this.biomeNoise(x * 0.001, z * 0.001);
    if (value < -0.2) return 'Ocean';
    if (value < -0.1) return 'Beach';
    if (value < 0.05) return 'Desert';
    if (value < 0.5) return 'Pine Forest';
    return 'Mountain';
  }

  getBiomeData(x, z) {
    const value = this.biomeNoise(x * 0.001, z * 0.001);
    // Map noise value (-1 to 1) to temp/humidity
    
    let temperature = 0.5;
    let humidity = 0.5;

    if (value < -0.2) { // Ocean
        temperature = 0.5;
        humidity = 0.9;
    } else if (value < -0.1) { // Beach
        temperature = 0.8;
        humidity = 0.4;
    } else if (value < 0.05) { // Desert
        temperature = 2.0; // Hot
        humidity = 0.0; // Dry
    } else if (value < 0.5) { // Pine Forest
        temperature = 0.3; // Cold
        humidity = 0.8; // Wet
    } else { // Mountain
        temperature = 0.2; // Very Cold
        humidity = 0.3; // Dry-ish
    }
    
    return { temperature, humidity };
  }

  getHeight(x, z) {
    const noise = this.biomeNoise(x * 0.001, z * 0.001);
    const localNoise = this.noise2D(x * 0.02, z * 0.02); // Detail
    
    let height = this.seaLevel; // Base sea level (30)
    
    if (noise < -0.2) {
        // Ocean
        // Smooth transition from -0.2 downwards
        // noise: -1 ... -0.2
        // t = 0 (at -0.2) to 1 (at -1)
        // height = 30 - t * depth
        const t = (noise + 0.2) / -0.8; // 0 to 1 approx
        height = this.seaLevel - (t * 30) + (localNoise * 2); // Deeper oceans
    } else if (noise < -0.1) {
        // Beach
        // noise: -0.2 ... -0.1
        // height: 30 ... 32
        const t = (noise + 0.2) / 0.1; // 0 to 1
        height = this.seaLevel + (t * 3) + (localNoise * 1);
    } else {
        // Land
        // noise: -0.1 ... 1
        // height: 32 ... up
        
        // Base land rise
        height = this.seaLevel + 3 + (noise + 0.1) * 30; 
        
        // Biome specific additions
        if (noise > 0.5) { // Mountain
             // Exponential mountain growth
             const mountainFactor = (noise - 0.5) * 2; // 0 to 1
             height += Math.pow(mountainFactor, 1.5) * 140 + (localNoise * 10);
        } else {
             height += localNoise * 5; // Normal terrain roughness
        }
    }
    
    return Math.min(this.chunkHeight - 1, Math.max(1, Math.floor(height)));
  }

  generateInitialChunks() {
    const initialDistance = 2;
    for (let x = -initialDistance; x <= initialDistance; x++) {
      for (let z = -initialDistance; z <= initialDistance; z++) {
        this.generateChunk(x, z);
      }
    }
  }

  updateChunksMesh() {
    this.chunks.forEach(chunk => {
      chunk.updateMesh();
    });
  }

  update(delta) {
    const playerPos = this.game.player.camera.position;
    const chunkX = Math.floor(playerPos.x / this.chunkSize);
    const chunkZ = Math.floor(playerPos.z / this.chunkSize);
    
    // Debug info UI
    if (document.getElementById('chunk-count')) {
        document.getElementById('chunk-count').innerText = `${this.chunks.size} (CX:${chunkX}, CZ:${chunkZ})`;
    }

    // Debug info Console (every 1s)
    const now = performance.now();
    if (now - this.lastDebugTime > 1000) {
        console.log(`[World] Player: (${playerPos.x.toFixed(1)}, ${playerPos.z.toFixed(1)}) -> Chunk: [${chunkX}, ${chunkZ}]`);
        console.log(`[World] Chunks loaded: ${this.chunks.size}`);
        this.lastDebugTime = now;
    }

    // Update chunks loading queue only if player moved chunk or queue is empty (and we might need more)
    const distMoved = Math.abs(chunkX - this.lastChunkUpdatePos.x) + Math.abs(chunkZ - this.lastChunkUpdatePos.z);
    
    if (distMoved > 0 || this.chunksToLoad.length === 0) {
        this.lastChunkUpdatePos = { x: chunkX, z: chunkZ };
        
        this.chunksToLoad = [];
        for (let x = chunkX - this.farRenderDistance; x <= chunkX + this.farRenderDistance; x++) {
            for (let z = chunkZ - this.farRenderDistance; z <= chunkZ + this.farRenderDistance; z++) {
                const dist = Math.sqrt((x - chunkX)**2 + (z - chunkZ)**2);
                if (dist <= this.farRenderDistance) {
                    const key = `${x},${z}`;
                    if (!this.chunks.has(key)) {
                        this.chunksToLoad.push({ x, z, dist });
                    }
                }
            }
        }
        
        // Sort by distance
        this.chunksToLoad.sort((a, b) => a.dist - b.dist);
    }

    // Process generation queue with time budget
    const startTime = performance.now();
    const maxTime = 8; // ms max per frame for generation
    
    while (this.chunksToLoad.length > 0 && performance.now() - startTime < maxTime) {
        const chunkPos = this.chunksToLoad.shift();
        // Check again if it exists (might have been created?)
        const key = `${chunkPos.x},${chunkPos.z}`;
        if (!this.chunks.has(key)) {
             this.generateChunk(chunkPos.x, chunkPos.z);
        }
    }
    
    // Update LODs and Unload
    const renderDistSq = this.renderDistance * this.renderDistance;
    const farRenderDistSq = (this.farRenderDistance + 2) * (this.farRenderDistance + 2);

    for (const [key, chunk] of this.chunks) {
      const dx = chunk.x - chunkX;
      const dz = chunk.z - chunkZ;
      const distSq = dx * dx + dz * dz;
      
      // Update LOD
      if (distSq > renderDistSq) {
          chunk.setLOD(1);
      } else {
          chunk.setLOD(0);
      }

      // Unload if too far
      if (distSq > farRenderDistSq) {
        // console.log(`Removing chunk ${chunk.x}, ${chunk.z} (dist: ${dist})`);
        if (chunk.meshes) { 
             Object.values(chunk.meshes).forEach(mesh => {
                 this.game.scene.remove(mesh);
                 mesh.geometry.dispose();
                 mesh.material.dispose();
             });
        }
        // Also waterMesh
        if (chunk.waterMesh) {
          this.game.scene.remove(chunk.waterMesh);
          chunk.waterMesh.geometry.dispose();
          chunk.waterMesh.material.dispose();
        }
        this.chunks.delete(key);
      }
    }
  }

  generateChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (this.chunks.has(key)) return; // Double sécurité

    const chunk = new Chunk(this.game, this, chunkX, chunkZ);
    this.chunks.set(key, chunk);
  }

  getBlock(x, y, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    
    const key = `${chunkX},${chunkZ}`;
    const chunk = this.chunks.get(key);
    
    if (!chunk) return 0; // Chunk non chargé = air (ou bedrock invisible ?)
    
    // Coordonnées locales dans le chunk
    let localX = x % this.chunkSize;
    let localZ = z % this.chunkSize;
    
    if (localX < 0) localX += this.chunkSize;
    if (localZ < 0) localZ += this.chunkSize;
    
    return chunk.getBlock(localX, Math.floor(y), localZ);
  }

  setBlock(x, y, z, type) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    
    const key = `${chunkX},${chunkZ}`;
    const chunk = this.chunks.get(key);
    
    if (!chunk) return;
    
    let localX = x % this.chunkSize;
    let localZ = z % this.chunkSize;
    
    if (localX < 0) localX += this.chunkSize;
    if (localZ < 0) localZ += this.chunkSize;
    
    chunk.setBlock(localX, Math.floor(y), localZ, type);
  }
}
