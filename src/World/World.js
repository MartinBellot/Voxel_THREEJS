import * as THREE from 'three';
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { Chunk } from './Chunk.js';
import { SeededRandom } from '../Utils/SeededRandom.js';

export class World {
  constructor(game) {
    this.game = game;
    this.chunks = new Map();
    this.chunkSize = 16;
    this.chunkHeight = 640;
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
    this.isHighAltitude = false;

    // Génération initiale synchrone
    this.generateInitialChunks();
  }

  setupNoise() {
      const rng = new SeededRandom(this.seed);
      // Create noise functions using the seeded random
      this.noise3D = createNoise3D(() => rng.random());
      this.noise2D = createNoise2D(() => rng.random());
      this.biomeNoise = createNoise2D(() => rng.random());
      this.humidityNoise = createNoise2D(() => rng.random());
  }

  getVolcanoData(x, z) {
      const gridSize = 512;
      const gridX = Math.floor(x / gridSize);
      const gridZ = Math.floor(z / gridSize);
      
      let closestDist = Infinity;
      let volcanoCenter = null;

      for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
          for (let gz = gridZ - 1; gz <= gridZ + 1; gz++) {
              // Pseudo-random based on grid coords
              // Use a simple hash to seed the random for this grid cell
              // We need a deterministic seed based on gx, gz and world seed
              const cellSeed = (this.seed * 10000 + gx * 3412.123 + gz * 9871.321) % 1;
              const rng = new SeededRandom(cellSeed);
              
              // 10% chance of volcano in this grid (Very rare)
              if (rng.random() < 0.1) {
                  const vx = gx * gridSize + rng.random() * gridSize;
                  const vz = gz * gridSize + rng.random() * gridSize;
                  
                  const dist = Math.sqrt((x - vx)**2 + (z - vz)**2);
                  if (dist < closestDist) {
                      closestDist = dist;
                      volcanoCenter = { x: vx, z: vz };
                  }
              }
          }
      }
      
      return { dist: closestDist, center: volcanoCenter };
  }

  getIslandData(x, z) {
      const gridSize = 300; // Very large grid for rarity
      const gridX = Math.floor(x / gridSize);
      const gridZ = Math.floor(z / gridSize);
      
      let closestDist = Infinity;
      let islandCenter = null;
      let islandRadius = 0;

      for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
          for (let gz = gridZ - 1; gz <= gridZ + 1; gz++) {
              const cellSeed = (this.seed * 20000 + gx * 4523.123 + gz * 7891.321) % 1;
              const rng = new SeededRandom(cellSeed);
              
              // 30% chance of island in this large grid
              if (rng.random() < 0.3) {
                  const ix = gx * gridSize + rng.random() * gridSize;
                  const iz = gz * gridSize + rng.random() * gridSize;
                  
                  const dist = Math.sqrt((x - ix)**2 + (z - iz)**2);
                  if (dist < closestDist) {
                      closestDist = dist;
                      islandCenter = { x: ix, z: iz };
                      islandRadius = 40 + rng.random() * 30; // Radius 40-70
                  }
              }
          }
      }
      
      return { dist: closestDist, center: islandCenter, radius: islandRadius };
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
    const elevation = this.biomeNoise(x * 0.001, z * 0.001);
    const humidity = this.humidityNoise(x * 0.001, z * 0.001);

    if (elevation < -0.2) return 'Ocean';
    if (elevation < -0.1) return 'Beach';
    
    if (elevation > 0.6) return 'Mountain';

    // Land biomes based on humidity
    if (humidity < -0.2) return 'Desert';
    if (humidity > 0.6) return 'Mushrooms';
    return 'Pine Forest';
  }

  getBiomeData(x, z) {
    const elevation = this.biomeNoise(x * 0.001, z * 0.001);
    const humidity = this.humidityNoise(x * 0.001, z * 0.001);
    
    let temperature = 0.5;
    
    if (elevation < -0.2) { // Ocean
        temperature = 0.5;
    } else if (elevation < -0.1) { // Beach
        temperature = 0.8;
    } else if (elevation > 0.6) { // Mountain
        temperature = 0.2;
    } else {
        // Land
        if (humidity < -0.2) temperature = 2.0; // Desert
        else if (humidity > 0.6) temperature = 0.6; // Mushrooms
        else temperature = 0.3; // Pine Forest
    }
    
    return { temperature, humidity: (humidity + 1) / 2 };
  }

  getHeight(x, z) {
    const elevation = this.biomeNoise(x * 0.001, z * 0.001);
    const humidity = this.humidityNoise(x * 0.001, z * 0.001);
    const localNoise = this.noise2D(x * 0.02, z * 0.02); // Detail
    
    // Check for Volcano
    const volcanoData = this.getVolcanoData(x, z);
    const volcanoRadius = 150; 
    const craterRadius = 20;

    if (volcanoData.center && volcanoData.dist < volcanoRadius) {
        const maxVolcanoHeight = 240;
        const baseHeight = this.seaLevel + 10;
        
        // Cone shape
        // Normalized distance 0..1
        const t = volcanoData.dist / volcanoRadius;
        
        // Height based on distance (Cone)
        // Using a curve that gets steeper near the top
        let volcanoH = baseHeight + (maxVolcanoHeight - baseHeight) * (1 - Math.pow(t, 0.8));
        
        // Crater logic
        if (volcanoData.dist < craterRadius) {
            // Inside crater
            // We want it to go down to bedrock (approx height 5)
            // Smooth transition from rim to bottom
            // Rim is at craterRadius
            
            // Normalized crater distance 0..1 (0 is center)
            const ct = volcanoData.dist / craterRadius;
            
            // Height at rim
            const rimHeight = baseHeight + (maxVolcanoHeight - baseHeight) * (1 - Math.pow(craterRadius/volcanoRadius, 0.8));
            
            // Crater function: 5 at center, rimHeight at edge
            // Use power to make it steep or bowl like
            volcanoH = 5 + (rimHeight - 5) * Math.pow(ct, 4);
        }
        
        // Add roughness
        volcanoH += localNoise * 3;
        
        return Math.min(this.chunkHeight - 1, Math.max(1, Math.floor(volcanoH)));
    }

    let height = this.seaLevel; // Base sea level (30)
    
    if (elevation < -0.2) {
        // Ocean
        // Smooth transition from -0.2 downwards
        // noise: -1 ... -0.2
        // t = 0 (at -0.2) to 1 (at -1)
        // height = 30 - t * depth
        const t = (elevation + 0.2) / -0.8; // 0 to 1 approx
        height = this.seaLevel - (t * 30) + (localNoise * 2); // Deeper oceans
    } else if (elevation < -0.1) {
        // Beach
        // noise: -0.2 ... -0.1
        // height: 30 ... 32
        const t = (elevation + 0.2) / 0.1; // 0 to 1
        height = this.seaLevel + (t * 3) + (localNoise * 1);
    } else {
        // Land
        // noise: -0.1 ... 1
        // height: 32 ... up
        
        // Base land rise
        height = this.seaLevel + 3 + (elevation + 0.1) * 30; 
        
        // Biome specific additions
        if (elevation > 0.6) { // Mountain
             // Exponential mountain growth
             const mountainFactor = (elevation - 0.6) * 2.5; // Adjusted for new range
             // Target: 100 to 250
             // Base height is around 60-70 here.
             // We add up to 180 more.
             height += Math.pow(mountainFactor, 1.2) * 180 + (localNoise * 10);
             
             // Ensure minimum mountain height if deep in mountain biome
             if (mountainFactor > 0.5) {
                 height = Math.max(height, 100 + localNoise * 10);
             }
        } else {
             // Land biomes terrain
             if (humidity < -0.2) { // Desert
                 height += localNoise * 2; // Flat
             } else if (humidity > 0.6) { // Mushrooms
                 height += localNoise * 8; // Rolling hills
             } else { // Pine Forest
                 height += localNoise * 5; // Normal
             }
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

    // Check altitude change for island generation optimization
    const isHigh = playerPos.y > 300;
    if (isHigh !== this.isHighAltitude) {
        this.isHighAltitude = isHigh;
        console.log(`Altitude changed to ${isHigh ? 'High' : 'Low'}. Regenerating chunks...`);
        
        // Clear all chunks to force regeneration with/without islands
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
        this.lastChunkUpdatePos = { x: -999, z: -999 }; // Force update
    }

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

    // Update neighbor chunks if block is on the edge
    if (localX === 0) {
        const neighbor = this.chunks.get(`${chunkX - 1},${chunkZ}`);
        if (neighbor) neighbor.updateMesh();
    } else if (localX === this.chunkSize - 1) {
        const neighbor = this.chunks.get(`${chunkX + 1},${chunkZ}`);
        if (neighbor) neighbor.updateMesh();
    }

    if (localZ === 0) {
        const neighbor = this.chunks.get(`${chunkX},${chunkZ - 1}`);
        if (neighbor) neighbor.updateMesh();
    } else if (localZ === this.chunkSize - 1) {
        const neighbor = this.chunks.get(`${chunkX},${chunkZ + 1}`);
        if (neighbor) neighbor.updateMesh();
    }
  }
}
