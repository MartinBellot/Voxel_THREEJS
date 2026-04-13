import * as THREE from 'three';
import { createNoise3D, createNoise2D } from 'simplex-noise';
import { Chunk } from './Chunk.js';
import { SeededRandom } from '../Utils/SeededRandom.js';
import { BlockType, isLiquid, isSolid } from './Block.js';
import { VillageGenerator } from './VillageGenerator.js';

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
    this.liquidQueueSet = new Set();
    this.liquidTimer = 0;
    this.liquidTickRate = 0.25; // Process liquids every 0.25s (water) / 1.25s lava

    // Source block tracking: "x,y,z" -> true means this is a player-placed source
    this.liquidSources = new Set();
    // Retraction queue: blocks scheduled for removal check
    this.retractionQueue = [];
    this.retractionQueueSet = new Set();

    // Shared materials (created lazily, reused by all chunks)
    this._terrainMaterial = null;
    this._waterMaterial = null;

    // Biome data cache to avoid redundant noise calls
    this._biomeCache = new Map();
    this._biomeCacheSize = 0;
    this._maxBiomeCacheSize = 10000;

    // Village generator
    this.villageGenerator = new VillageGenerator(this);

    // Crop growth
    this.cropTimer = 0;
    this.cropTickRate = 5.0; // Check crops every 5 seconds (random tick equivalent)
    this.crops = new Map(); // "x,y,z" -> blockType

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
      this.noise3D = createNoise3D(() => rng.random());
      this.noise2D = createNoise2D(() => rng.random());
      this.biomeNoise = createNoise2D(() => rng.random());
      this.humidityNoise = createNoise2D(() => rng.random());
      this.riverNoise = createNoise2D(() => rng.random());
      this.riverNoise2 = createNoise2D(() => rng.random());
      this.riverWarpX = createNoise2D(() => rng.random());
      this.riverWarpZ = createNoise2D(() => rng.random());
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

  getRiverData(x, z) {
    // Domain warping: distort coordinates for natural meanders
    const warpScale = 0.002;
    const warpStrength = 120;
    const wx = x + this.riverWarpX(x * warpScale, z * warpScale) * warpStrength;
    const wz = z + this.riverWarpZ(x * warpScale, z * warpScale) * warpStrength;

    // Two perpendicular river networks with warped coords
    const n1 = this.riverNoise(wx * 0.0025, wz * 0.001);
    const n2 = this.riverNoise2(wx * 0.001, wz * 0.0025);

    // Add detail noise for small-scale variation
    const detail = this.noise2D(x * 0.01, z * 0.01) * 0.015;

    const r1 = Math.abs(n1) + detail * 0.5;
    const r2 = Math.abs(n2) + detail * 0.5;

    // Width varies naturally along the river
    const widthNoise = this.noise2D(x * 0.003, z * 0.003);
    const baseWidth = 0.035 + widthNoise * 0.012;

    let riverDist, width;
    if (r1 < r2) {
      riverDist = r1;
      width = baseWidth;
    } else {
      riverDist = r2;
      width = baseWidth * 0.65;
    }

    const isRiver = riverDist < width;
    const t = isRiver ? 1 - riverDist / width : 0;
    const depth = Math.floor(t * 4) + 2;

    return { isRiver, depth, t, riverDist, width };
  }

  getLakeData(x, z) {
    const gridSize = 350;
    const gridX = Math.floor(x / gridSize);
    const gridZ = Math.floor(z / gridSize);

    let closestDist = Infinity;
    let lakeCenter = null;
    let lakeRadius = 0;

    for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
      for (let gz = gridZ - 1; gz <= gridZ + 1; gz++) {
        const cellSeed = (this.seed * 30000 + gx * 5123.123 + gz * 8901.321) % 1;
        const rng = new SeededRandom(cellSeed);

        if (rng.random() < 0.25) {
          const lx = gx * gridSize + rng.random() * gridSize;
          const lz = gz * gridSize + rng.random() * gridSize;
          const dist = Math.sqrt((x - lx) ** 2 + (z - lz) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            lakeCenter = { x: lx, z: lz };
            lakeRadius = 12 + rng.random() * 28;
          }
        }
      }
    }

    return { dist: closestDist, center: lakeCenter, radius: lakeRadius };
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
      this.villageGenerator = new VillageGenerator(this);
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
        const t = volcanoData.dist / volcanoRadius;
        let volcanoH = baseHeight + (maxVolcanoHeight - baseHeight) * (1 - Math.pow(t, 0.8));
        if (volcanoData.dist < craterRadius) {
            const ct = volcanoData.dist / craterRadius;
            const rimHeight = baseHeight + (maxVolcanoHeight - baseHeight) * (1 - Math.pow(craterRadius/volcanoRadius, 0.8));
            volcanoH = 5 + (rimHeight - 5) * Math.pow(ct, 4);
        }
        volcanoH += localNoise * 3;
        return Math.min(this.chunkHeight - 1, Math.max(1, Math.floor(volcanoH)));
    }

    // Smoothstep helper for blending
    const smoothstep = (edge0, edge1, x) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    let height = this.seaLevel;
    
    // Blend width for transitions
    const elevBlend = 0.06;
    const humBlend = 0.08;
    
    // Calculate heights for each elevation zone with smooth blending
    // Ocean height
    const oceanT = Math.max(0, Math.min(1, (elevation + 0.2) / -0.8));
    const oceanHeight = this.seaLevel - (oceanT * 30) + (localNoise * 2);
    
    // Beach height  
    const beachT = Math.max(0, Math.min(1, (elevation + 0.2) / 0.1));
    const beachHeight = this.seaLevel + (beachT * 3) + (localNoise * 1);
    
    // Land base height
    const landBase = this.seaLevel + 3 + (elevation + 0.1) * 30;
    
    // Biome-specific land height modifiers (each calculated independently)
    const desertH = landBase + localNoise * 2;
    const savannaH = landBase + localNoise * 3;
    const swampH = this.seaLevel + 1 + localNoise * 2;
    const jungleH = landBase + localNoise * 6;
    const mushroomH = landBase + localNoise * 8;
    const forestPlainsH = landBase + localNoise * 5;
    
    // Mountain height
    const mountainFactor = Math.max(0, (elevation - 0.6) * 2.5);
    let mountainH = landBase + Math.pow(mountainFactor, 1.2) * 180 + (localNoise * 10);
    if (mountainFactor > 0.5) {
      mountainH = Math.max(mountainH, 100 + localNoise * 10);
    }

    // Blend humidity-based biome heights smoothly
    let landHeight;
    
    // Humidity weights using smoothstep transitions
    const wDesert = 1 - smoothstep(-0.4 - humBlend, -0.4 + humBlend, humidity);
    const wSavanna = smoothstep(-0.4 - humBlend, -0.4 + humBlend, humidity) * (1 - smoothstep(-0.15 - humBlend, -0.15 + humBlend, humidity));
    const wForest = smoothstep(-0.15 - humBlend, -0.15 + humBlend, humidity) * (1 - smoothstep(0.15 - humBlend, 0.15 + humBlend, humidity));
    const wJungle = smoothstep(0.15 - humBlend, 0.15 + humBlend, humidity) * (1 - smoothstep(0.35 - humBlend, 0.35 + humBlend, humidity));
    const wSwamp = smoothstep(0.35 - humBlend, 0.35 + humBlend, humidity) * (1 - smoothstep(0.6 - humBlend, 0.6 + humBlend, humidity));
    const wMushroom = smoothstep(0.6 - humBlend, 0.6 + humBlend, humidity);
    
    const wTotal = wDesert + wSavanna + wForest + wJungle + wSwamp + wMushroom;
    if (wTotal > 0) {
      landHeight = (wDesert * desertH + wSavanna * savannaH + wForest * forestPlainsH + 
                    wJungle * jungleH + wSwamp * swampH + wMushroom * mushroomH) / wTotal;
    } else {
      landHeight = forestPlainsH;
    }

    // Blend between Ocean -> Beach -> Land -> Mountain using elevation
    const oceanToBeach = smoothstep(-0.2 - elevBlend, -0.2 + elevBlend, elevation);
    const beachToLand = smoothstep(-0.1 - elevBlend, -0.1 + elevBlend, elevation);
    const landToMountain = smoothstep(0.6 - elevBlend, 0.6 + elevBlend, elevation);
    
    // Layer the blends
    height = oceanHeight * (1 - oceanToBeach) + beachHeight * oceanToBeach;
    height = height * (1 - beachToLand) + landHeight * beachToLand;
    height = height * (1 - landToMountain) + mountainH * landToMountain;

    // River carving (skip ocean, beach, mountain, desert)
    const isOcean = elevation < -0.2;
    const isBeach = elevation >= -0.2 && elevation < -0.1;
    const isMountain = elevation > 0.6;
    const isDesert = !isOcean && !isBeach && !isMountain && humidity < -0.4;

    if (!isOcean && !isBeach && !isMountain && !isDesert) {
      const riverData = this.getRiverData(x, z);
      if (riverData.isRiver && height > this.seaLevel - 5) {
        const riverBed = this.seaLevel - riverData.depth;
        height = Math.min(height, riverBed);
      } else if (riverData.riverDist < riverData.width * 3 && height > this.seaLevel + 2) {
        const bankBlend = (riverData.riverDist - riverData.width) / (riverData.width * 2);
        const bankTarget = this.seaLevel + 1;
        height = bankTarget + (height - bankTarget) * Math.min(1, Math.max(0, bankBlend));
      }

      const lakeData = this.getLakeData(x, z);
      if (lakeData.center && lakeData.dist < lakeData.radius) {
        const lt = lakeData.dist / lakeData.radius;
        const lakeDepth = (1 - lt * lt) * 7;
        const lakeBed = this.seaLevel + 1 - lakeDepth;
        height = Math.min(height, lakeBed);
      } else if (lakeData.center && lakeData.dist < lakeData.radius * 1.4) {
        const shoreBlend = (lakeData.dist - lakeData.radius) / (lakeData.radius * 0.4);
        const shoreTarget = this.seaLevel + 2;
        if (height > shoreTarget) {
          height = shoreTarget + (height - shoreTarget) * Math.min(1, Math.max(0, shoreBlend));
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

    // Process crop growth
    this.updateCrops(delta);
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

    const previousType = chunk.getBlock(localX, Math.floor(y), localZ);
    
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
      if (previousType === BlockType.WATER || previousType === BlockType.LAVA) {
        this.liquidSources.delete(`${x},${y},${z}`);
      }
      this.scheduleLiquidRetraction(x, y, z);
      this.scheduleLiquidUpdate(x, y, z);
    }
    if (type === BlockType.WATER || type === BlockType.LAVA) {
      this.liquidSources.add(`${x},${y},${z}`);
      this.scheduleLiquidUpdate(x, y, z);
    }
  }

  setBlockDirect(x, y, z, type) {
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

  scheduleLiquidUpdate(x, y, z) {
    const offsets = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of offsets) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const block = this.getBlock(nx, ny, nz);
      if (block === BlockType.WATER || block === BlockType.LAVA) {
        const key = `${nx},${ny},${nz}`;
        if (!this.liquidQueueSet.has(key)) {
          this.liquidQueueSet.add(key);
          this.liquidQueue.push({ x: nx, y: ny, z: nz, key, type: block, dist: 0 });
        }
      }
    }
    const selfBlock = this.getBlock(x, y, z);
    if (selfBlock === BlockType.WATER || selfBlock === BlockType.LAVA) {
      const key = `${x},${y},${z}`;
      if (!this.liquidQueueSet.has(key)) {
        this.liquidQueueSet.add(key);
        this.liquidQueue.push({ x, y, z, key, type: selfBlock, dist: 0 });
      }
    }
  }

  scheduleLiquidRetraction(x, y, z) {
    const offsets = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of offsets) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const block = this.getBlock(nx, ny, nz);
      if (isLiquid(block)) {
        const key = `${nx},${ny},${nz}`;
        if (!this.retractionQueueSet.has(key)) {
          this.retractionQueueSet.add(key);
          this.retractionQueue.push({ x: nx, y: ny, z: nz, key, type: block });
        }
      }
    }
  }

  isLiquidSource(x, y, z) {
    if (this.liquidSources.has(`${x},${y},${z}`)) return true;
    const height = this.getHeight(x, z);
    if (y <= this.seaLevel && height <= this.seaLevel) return true;
    return false;
  }

  hasLiquidSupport(x, y, z, type, visited) {
    const key = `${x},${y},${z}`;
    if (visited.has(key)) return false;
    visited.add(key);
    if (visited.size > 200) return false;

    if (this.isLiquidSource(x, y, z)) return true;

    const above = this.getBlock(x, y + 1, z);
    if (above === type) {
      if (this.isLiquidSource(x, y + 1, z)) return true;
      if (this.hasLiquidSupport(x, y + 1, z, type, visited)) return true;
    }

    const flowRange = type === BlockType.WATER ? 7 : 3;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      const neighbor = this.getBlock(nx, y, nz);
      if (neighbor === type) {
        const nAbove = this.getBlock(nx, y + 1, nz);
        if (nAbove === type) return true;
        if (this.isLiquidSource(nx, y, nz)) return true;
      }
    }

    return false;
  }

  updateLiquids(delta) {
    this.liquidTimer += delta;
    if (this.liquidTimer < this.liquidTickRate) return;
    this.liquidTimer = 0;

    const chunksToUpdate = new Set();

    // Process retraction first
    const maxRetractions = 64;
    const retractBatch = this.retractionQueue.splice(0, maxRetractions);
    for (const entry of retractBatch) {
      this.retractionQueueSet.delete(entry.key);
    }

    for (const entry of retractBatch) {
      const { x, y, z, type } = entry;
      const current = this.getBlock(x, y, z);
      if (!isLiquid(current)) continue;

      const visited = new Set();
      if (!this.hasLiquidSupport(x, y, z, current, visited)) {
        this.setBlockDirect(x, y, z, BlockType.AIR);
        this.liquidSources.delete(`${x},${y},${z}`);
        const chunkKey = `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
        chunksToUpdate.add(chunkKey);

        const offsets = [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
        for (const [dx, dy, dz] of offsets) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          const neighbor = this.getBlock(nx, ny, nz);
          if (isLiquid(neighbor)) {
            const nKey = `${nx},${ny},${nz}`;
            if (!this.retractionQueueSet.has(nKey)) {
              this.retractionQueueSet.add(nKey);
              this.retractionQueue.push({ x: nx, y: ny, z: nz, key: nKey, type: neighbor });
            }
          }
        }
      }
    }

    // Process liquid spread
    const maxUpdates = 64;
    const toProcess = this.liquidQueue.splice(0, maxUpdates);
    for (const entry of toProcess) {
      this.liquidQueueSet.delete(entry.key);
    }

    for (const entry of toProcess) {
      const { x, y, z, type, dist } = entry;
      const current = this.getBlock(x, y, z);
      if (current !== type) continue;

      // Minecraft-like infinite source rule (simplified):
      // a non-source water block with 2 adjacent water sources and solid/water below becomes source.
      if (type === BlockType.WATER && !this.liquidSources.has(`${x},${y},${z}`)) {
        let adjacentSources = 0;
        const belowBlock = this.getBlock(x, y - 1, z);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of dirs) {
          const nx = x + dx;
          const nz = z + dz;
          if (this.getBlock(nx, y, nz) === BlockType.WATER && this.isLiquidSource(nx, y, nz)) {
            adjacentSources++;
          }
        }
        if (adjacentSources >= 2 && (isSolid(belowBlock) || belowBlock === BlockType.WATER)) {
          this.liquidSources.add(`${x},${y},${z}`);
        }
      }

      const flowRange = type === BlockType.WATER ? 7 : 3;

      const below = this.getBlock(x, y - 1, z);
      if (below === BlockType.AIR) {
        this.setBlockDirect(x, y - 1, z, type);
        const chunkKey = `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
        chunksToUpdate.add(chunkKey);
        const newKey = `${x},${y - 1},${z}`;
        if (!this.liquidQueueSet.has(newKey)) {
          this.liquidQueueSet.add(newKey);
          this.liquidQueue.push({ x, y: y - 1, z, key: newKey, type, dist: 0 });
        }
        continue;
      }

      if (dist >= flowRange) continue;

      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, , dz] of dirs) {
        const nx = x + dx, nz = z + dz;
        const neighbor = this.getBlock(nx, y, nz);
        if (neighbor === BlockType.AIR) {
          this.setBlockDirect(nx, y, nz, type);
          const chunkKey = `${Math.floor(nx / this.chunkSize)},${Math.floor(nz / this.chunkSize)}`;
          chunksToUpdate.add(chunkKey);
          const newKey = `${nx},${y},${nz}`;
          if (!this.liquidQueueSet.has(newKey)) {
            this.liquidQueueSet.add(newKey);
            this.liquidQueue.push({ x: nx, y, z: nz, key: newKey, type, dist: dist + 1 });
          }
        }
      }
    }

    for (const chunkKey of chunksToUpdate) {
      const chunk = this.chunks.get(chunkKey);
      if (chunk) {
        chunk.updateMesh();
        const [cx, cz] = chunkKey.split(',').map(Number);
        const neighbors = [
          `${cx - 1},${cz}`, `${cx + 1},${cz}`,
          `${cx},${cz - 1}`, `${cx},${cz + 1}`
        ];
        for (const nk of neighbors) {
          if (!chunksToUpdate.has(nk)) {
            const nc = this.chunks.get(nk);
            if (nc) nc.updateMesh();
          }
        }
      }
    }
  }

  registerCrop(x, y, z, blockType) {
    this.crops.set(`${x},${y},${z}`, blockType);
  }

  unregisterCrop(x, y, z) {
    this.crops.delete(`${x},${y},${z}`);
  }

  updateCrops(delta) {
    this.cropTimer += delta;
    if (this.cropTimer < this.cropTickRate) return;
    this.cropTimer = 0;

    // Random ticking: ~1/3 chance per crop per tick (like Minecraft's random tick)
    const toGrow = [];
    for (const [key, blockType] of this.crops) {
      if (Math.random() < 0.15) { // ~15% chance per 5s tick
        toGrow.push(key);
      }
    }

    for (const key of toGrow) {
      const [x, y, z] = key.split(',').map(Number);
      const current = this.getBlock(x, y, z);
      if (!current) continue;

      // Check the block below is farmland
      const below = this.getBlock(x, y - 1, z);
      if (below !== BlockType.FARMLAND) {
        // Crop destroyed if farmland removed
        this.setBlock(x, y, z, BlockType.AIR);
        this.unregisterCrop(x, y, z);
        continue;
      }

      // Advance crop stage
      const nextBlock = this.getNextCropStage(current);
      if (nextBlock !== null) {
        this.setBlock(x, y, z, nextBlock);
        this.crops.set(key, nextBlock);
      }
    }
  }

  getNextCropStage(blockType) {
    // Wheat: 207-214 (stages 0-7)
    if (blockType >= BlockType.WHEAT_STAGE_0 && blockType < BlockType.WHEAT_STAGE_7) {
      return blockType + 1;
    }
    // Potato: 215-218 (stages 0-3)
    if (blockType >= BlockType.POTATO_STAGE_0 && blockType < BlockType.POTATO_STAGE_3) {
      return blockType + 1;
    }
    // Carrot: 219-222 (stages 0-3)
    if (blockType >= BlockType.CARROT_STAGE_0 && blockType < BlockType.CARROT_STAGE_3) {
      return blockType + 1;
    }
    // Beetroot: 223-226 (stages 0-3)
    if (blockType >= BlockType.BEETROOT_STAGE_0 && blockType < BlockType.BEETROOT_STAGE_3) {
      return blockType + 1;
    }
    return null; // Fully grown
  }

  bonemealCrop(x, y, z) {
    const current = this.getBlock(x, y, z);
    if (!current) return false;

    const next = this.getNextCropStage(current);
    if (next !== null) {
      // Advance 2-5 stages (like Minecraft)
      let block = current;
      const advances = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < advances; i++) {
        const n = this.getNextCropStage(block);
        if (n === null) break;
        block = n;
      }
      this.setBlock(x, y, z, block);
      this.crops.set(`${x},${y},${z}`, block);
      return true;
    }
    return false;
  }
}
