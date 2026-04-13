import * as THREE from 'three';
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { Chunk } from './Chunk.js';
import { SeededRandom } from '../Utils/SeededRandom.js';
import { BlockType, isLiquid } from './Block.js';

export class World {
  constructor(game) {
    this.game = game;
    this.chunks = new Map();
    this.chunkSize = 16;
    this.chunkHeight = 256; // Reduced from 320 to save memory (still allows mountains)
    this.renderDistance = 6; // High detail distance
    this.farRenderDistance = 10; // Reduced from 16 for performance
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

    // Liquid flow queue
    this.liquidQueue = [];
    this.liquidTimer = 0;
    this.liquidTickRate = 0.25; // Process liquids every 0.25s (water) / 1.25s lava

    // Shared materials (created lazily, reused by all chunks)
    this._terrainMaterial = null;
    this._waterMaterial = null;

    // Biome data cache to avoid redundant noise calls
    this._biomeCache = new Map();
    this._biomeCacheSize = 0;
    this._maxBiomeCacheSize = 10000;

    // Génération initiale synchrone
    this.generateInitialChunks();
  }

  // Shared terrain material (one instance for all chunks)
  getTerrainMaterial() {
    if (!this._terrainMaterial) {
      const textureManager = this.game.textureManager;
      this._terrainMaterial = new THREE.MeshLambertMaterial({ 
        vertexColors: true,
        side: THREE.FrontSide,
        map: textureManager ? textureManager.atlasTexture : null,
        alphaTest: 0.1
      });
    }
    return this._terrainMaterial;
  }

  // Shared water material (one instance for all chunks)
  getWaterMaterial() {
    if (!this._waterMaterial) {
      const textureManager = this.game.textureManager;
      this._waterMaterial = new THREE.MeshLambertMaterial({ 
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        side: THREE.FrontSide,
        map: textureManager ? textureManager.atlasTexture : null,
        depthWrite: false
      });
    }
    return this._waterMaterial;
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
              });
          }
          if (chunk.waterMesh) {
              this.game.scene.remove(chunk.waterMesh);
              chunk.waterMesh.geometry.dispose();
          }
      });
      this.chunks.clear();
      this._biomeCache.clear();
      this._biomeCacheSize = 0;
      // Reset shared materials since atlas may change
      this._terrainMaterial = null;
      this._waterMaterial = null;
      this.chunksToLoad = [];
      this.lastChunkUpdatePos = { x: -999, z: -999 };
      this.update(0);
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
    if (humidity < -0.4) return 'Desert';
    if (humidity < -0.15) return 'Savanna';
    if (humidity > 0.6) return 'Mushrooms';
    if (humidity > 0.35) return 'Swamp';
    if (humidity > 0.15) return 'Jungle';
    
    // Temperature variation for forest type
    const temp = this.biomeNoise(x * 0.002 + 500, z * 0.002 + 500);
    if (temp > 0.2) return 'Birch Forest';
    if (temp < -0.2) return 'Pine Forest';
    return 'Plains';
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
        if (humidity < -0.4) temperature = 2.0; // Desert
        else if (humidity < -0.15) temperature = 1.5; // Savanna
        else if (humidity > 0.6) temperature = 0.6; // Mushrooms
        else if (humidity > 0.35) temperature = 0.7; // Swamp
        else if (humidity > 0.15) temperature = 0.9; // Jungle
        else temperature = 0.3; // Forest/Plains
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
             if (humidity < -0.4) { // Desert
                 height += localNoise * 2; // Flat
             } else if (humidity < -0.15) { // Savanna
                 height += localNoise * 3; // Mostly flat with slight hills
             } else if (humidity > 0.6) { // Mushrooms
                 height += localNoise * 8; // Rolling hills
             } else if (humidity > 0.35) { // Swamp
                 height = this.seaLevel + 1 + localNoise * 2; // Very flat, near water
             } else if (humidity > 0.15) { // Jungle
                 height += localNoise * 6; // Moderate hills
             } else { // Pine Forest / Birch Forest / Plains
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

  setRenderDistance(distance) {
    this.renderDistance = distance;
    this.farRenderDistance = distance + 2; // Optimized: Reduced buffer from +4 to +2
    
    // Update Fog to match new render distance
    const chunkSize = this.chunkSize;
    const fogFar = this.farRenderDistance * chunkSize;
    const fogNear = Math.max(0, (this.renderDistance - 1) * chunkSize);
    
    if (this.game.scene.fog) {
        this.game.scene.fog.near = fogNear;
        this.game.scene.fog.far = fogFar;
    }
  }

  update(delta) {
    const playerPos = this.game.player.camera.position;

    // Check altitude change for island generation optimization
    const isHigh = playerPos.y > 300;
    if (isHigh !== this.isHighAltitude) {
        this.isHighAltitude = isHigh;
        
        // Clear all chunks to force regeneration with/without islands
        this.chunks.forEach(chunk => {
            if (chunk.meshes) {
                Object.values(chunk.meshes).forEach(mesh => {
                    this.game.scene.remove(mesh);
                    mesh.geometry.dispose();
                });
            }
            if (chunk.waterMesh) {
                this.game.scene.remove(chunk.waterMesh);
                chunk.waterMesh.geometry.dispose();
            }
        });
        this.chunks.clear();
        this._biomeCache.clear();
        this._biomeCacheSize = 0;
        this.lastChunkUpdatePos = { x: -999, z: -999 };
    }

    const chunkX = Math.floor(playerPos.x / this.chunkSize);
    const chunkZ = Math.floor(playerPos.z / this.chunkSize);

    // Update chunks loading queue only if player moved chunk or queue is empty
    const distMoved = Math.abs(chunkX - this.lastChunkUpdatePos.x) + Math.abs(chunkZ - this.lastChunkUpdatePos.z);
    
    if (distMoved > 0 || this.chunksToLoad.length === 0) {
        this.lastChunkUpdatePos = { x: chunkX, z: chunkZ };
        
        this.chunksToLoad = [];
        for (let x = chunkX - this.farRenderDistance; x <= chunkX + this.farRenderDistance; x++) {
            for (let z = chunkZ - this.farRenderDistance; z <= chunkZ + this.farRenderDistance; z++) {
                const dx = x - chunkX;
                const dz = z - chunkZ;
                const distSq = dx * dx + dz * dz;
                if (distSq <= this.farRenderDistance * this.farRenderDistance) {
                    const key = `${x},${z}`;
                    if (!this.chunks.has(key)) {
                        this.chunksToLoad.push({ x, z, dist: Math.sqrt(distSq) });
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
        if (chunk.meshes) { 
             Object.values(chunk.meshes).forEach(mesh => {
                 this.game.scene.remove(mesh);
                 mesh.geometry.dispose();
                 // Don't dispose shared material
             });
        }
        if (chunk.waterMesh) {
          this.game.scene.remove(chunk.waterMesh);
          chunk.waterMesh.geometry.dispose();
          // Don't dispose shared material
        }
        this.chunks.delete(key);
      }
    }

    // Process liquid flow
    this.updateLiquids(delta);
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

    // Check for Portal Creation
    if (type === BlockType.MAGIC_STONE) {
        if (this.game.portalManager) {
            this.game.portalManager.checkPortal(this, x, y, z);
        }
    }

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
    // Trigger liquid updates for nearby blocks
    if (type === BlockType.AIR) {
      this.scheduleLiquidUpdate(x, y, z);
    }
    if (type === BlockType.WATER || type === BlockType.LAVA) {
      this.scheduleLiquidUpdate(x, y, z);
    }
  }

  scheduleLiquidUpdate(x, y, z) {
    // Check neighbors for liquids that might flow
    const offsets = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of offsets) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const block = this.getBlock(nx, ny, nz);
      if (block === BlockType.WATER || block === BlockType.LAVA) {
        const key = `${nx},${ny},${nz}`;
        if (!this.liquidQueue.some(q => q.key === key)) {
          this.liquidQueue.push({ x: nx, y: ny, z: nz, key, type: block });
        }
      }
    }
    // Also add self if it's a liquid
    const selfBlock = this.getBlock(x, y, z);
    if (selfBlock === BlockType.WATER || selfBlock === BlockType.LAVA) {
      const key = `${x},${y},${z}`;
      if (!this.liquidQueue.some(q => q.key === key)) {
        this.liquidQueue.push({ x, y, z, key, type: selfBlock });
      }
    }
  }

  updateLiquids(delta) {
    this.liquidTimer += delta;
    if (this.liquidTimer < this.liquidTickRate) return;
    this.liquidTimer = 0;

    const maxUpdates = 50; // Process at most 50 per tick
    const toProcess = this.liquidQueue.splice(0, maxUpdates);

    for (const entry of toProcess) {
      const { x, y, z, type } = entry;
      const current = this.getBlock(x, y, z);
      if (current !== type) continue; // Block changed since queued

      // Flow down
      const below = this.getBlock(x, y - 1, z);
      if (below === BlockType.AIR) {
        this.setBlock(x, y - 1, z, type);
        continue;
      }

      // Flow sideways (only if can't flow down)
      const flowRange = type === BlockType.WATER ? 7 : 3;
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, _, dz] of dirs) {
        const nx = x + dx, nz = z + dz;
        const neighbor = this.getBlock(nx, y, nz);
        if (neighbor === BlockType.AIR) {
          this.setBlock(nx, y, nz, type);
        }
      }
    }  }
}
