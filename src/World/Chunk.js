import * as THREE from 'three';
import { BlockType, BlockDefinitions, BlockModels } from './Block.js';

export class Chunk {
  constructor(game, world, x, z) {
    this.game = game;
    this.world = world;
    this.x = x;
    this.z = z;
    this.size = 16;
    this.height = this.world.chunkHeight;
    this.data = []; // Stocke les IDs des blocs
    this.meshes = {}; // Map of model -> Mesh
    this.lights = []; // Stocke les lumières dynamiques
    this.lod = 0; // 0 = High, 1 = Low
    
    this.generateData();
    this.generateMesh();
  }

  isBlockOpaque(id) {
    if (id === BlockType.AIR || id === BlockType.WATER || id === BlockType.TORCH || id === BlockType.CACTUS || id === BlockType.LEAVES || id === BlockType.PINE_LEAVES || id === BlockType.MUSHROOM_STEM || id === BlockType.MUSHROOM_CAP || id === BlockType.SAPLING || id === BlockType.FLOWER || id === BlockType.CLOUD) return false;
    return true;
  }

  // Helper to check if a face should be drawn
  shouldDrawFace(x, y, z, neighborId) {
      if (neighborId === undefined) return true; // Edge of chunk (for now draw it, or check world)
      // If neighbor is opaque, don't draw
      if (this.isBlockOpaque(neighborId)) return false;
      return true;
  }

  getBlock(x, y, z) {
    // Check height limits first - World doesn't handle vertical chunks
    if (y < 0 || y >= this.height) {
        return BlockType.AIR;
    }

    // Check horizontal limits
    if (x < 0 || x >= this.size || z < 0 || z >= this.size) {
        // Check world for neighbor chunks
        return this.world.getBlock(this.x * this.size + x, y, this.z * this.size + z);
    }
    
    return this.data[x + this.size * (y + this.height * z)];
  }

  setLOD(level) {
      if (this.lod === level) return;
      this.lod = level;
      // We could simplify the mesh for LOD 1, but for now just keep it.
      // The merged mesh is already efficient.
  }

  generateData() {
    // ...existing code...
    // Initialise le tableau de données
    this.data = new Int8Array(this.size * this.height * this.size);
    
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const worldX = this.x * this.size + x;
        const worldZ = this.z * this.size + z;
        
        const biome = this.world.getBiome(worldX, worldZ);

        // Génération de terrain basique avec bruit
        const noiseValue = this.world.noise3D(worldX * 0.05, 0, worldZ * 0.05); // Pour les grottes
        const surfaceHeight = this.world.getHeight(worldX, worldZ);
        
        // Check for Volcano
        const volcanoData = this.world.getVolcanoData(worldX, worldZ);
        const isVolcano = volcanoData.center && volcanoData.dist < 150;
        const isCrater = isVolcano && volcanoData.dist < 25;

        // Arbres : probabilité basée sur le bruit
        const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
        const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
        
        let hasTree = false;
        let hasCactus = false;

        if (biome === 'Pine Forest' && !isVolcano) {
            hasTree = treeNoise > 0.4 && pseudoRandom > 0.85; // Plus dense
        } else if (biome === 'Desert' && !isVolcano) { //CACTUS EXTREMEMENTS RARES:
            hasCactus = treeNoise > 0.5 && pseudoRandom > 0.99;
        }

        // Pre-calculate island data for this column
        const islandData = this.world.getIslandData(worldX, worldZ);
        const isNearIsland = islandData.center && islandData.dist < islandData.radius + 20; // +20 for noise margin

        for (let y = 0; y < this.height; y++) {
          const index = this.getBlockIndex(x, y, z);
          
          // Check for server modifications first
          const modKey = `${worldX},${y},${worldZ}`;
          if (this.world.modifications.has(modKey)) {
              this.data[index] = this.world.modifications.get(modKey);
              continue; // Skip procedural generation for this block
          }

          if (y === 0) {
            this.data[index] = BlockType.BEDROCK;
          } else if (y < surfaceHeight) {
             // ...existing code...
             // Volcano handling
             if (isCrater) {
                 if (y < 15) {
                     this.data[index] = BlockType.MAGMA;
                 } else {
                     if (Math.random() < 0.4) this.data[index] = BlockType.MAGMA;
                     else this.data[index] = BlockType.STONE;
                 }
                 continue;
             }

             // Grottes
             const caveNoise = this.world.noise3D(worldX * 0.05, y * 0.05, worldZ * 0.05);
             const caveEntranceNoise = this.world.noise3D(worldX * 0.03, y * 0.05, worldZ * 0.03);
             const isCaveEntrance = y > surfaceHeight - 10 && caveEntranceNoise > 0.6;

             if ((y < surfaceHeight - 3 && caveNoise > 0.4) || isCaveEntrance) {
               this.data[index] = BlockType.AIR;
             } else {
               if (biome === 'Desert' || biome === 'Beach') {
                   this.data[index] = BlockType.SAND;
               } else if (biome === 'Ocean') {
                   this.data[index] = BlockType.SAND;
               } else if (biome === 'Mushrooms') {
                   if (y === surfaceHeight - 1) {
                       this.data[index] = BlockType.MYCELIUM;
                   } else {
                       this.data[index] = BlockType.DIRT;
                   }
               } else if (biome === 'Mountain') {
                   if (y === surfaceHeight - 1) {
                       if (y > 130) {
                           this.data[index] = BlockType.SNOW;
                       } else {
                           this.data[index] = BlockType.STONE;
                       }
                   } else if (y > surfaceHeight - 4) {
                       this.data[index] = BlockType.STONE;
                   } else {
                       const coalNoise = this.world.noise3D(worldX * 0.1, y * 0.1, worldZ * 0.1);
                       if (coalNoise > 0.8) {
                           this.data[index] = BlockType.COAL_ORE;
                       } else {
                           this.data[index] = BlockType.STONE;
                       }
                   }
               } else {
                   if (y === surfaceHeight - 1) {
                     this.data[index] = BlockType.GRASS;
                   } else if (y > surfaceHeight - 4) {
                     this.data[index] = BlockType.DIRT;
                   } else {
                     const coalNoise = this.world.noise3D(worldX * 0.1, y * 0.1, worldZ * 0.1);
                     if (coalNoise > 0.8) {
                         this.data[index] = BlockType.COAL_ORE;
                     } else {
                         this.data[index] = BlockType.STONE;
                     }
                   }
               }
             }
          } else {
            // Au dessus de la surface

            // Floating Islands Generation
            // Optimization: Only generate if player is high enough
            const playerY = (this.game.player && this.game.player.camera) ? this.game.player.camera.position.y : 0;
            
            if (playerY > 300 && y > 400 && y < 600) {
                if (isNearIsland) {
                    const islandBaseY = 450;
                    const islandTopY = 500;
                    
                    // Inverted Cone Shape
                    // Radius increases as Y goes up
                    let maxR = islandData.radius;
                    
                    // Add noise to radius for natural look
                    const radiusNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1) * 5;
                    maxR += radiusNoise;

                    let currentRadius = 0;
                    if (y >= islandBaseY && y <= islandTopY) {
                        // Cone function: 0 at bottom, maxR at top
                        // Using power > 1 for "spikey" bottom (Aether style)
                        const t = (y - islandBaseY) / (islandTopY - islandBaseY);
                        currentRadius = maxR * Math.pow(t, 0.7); // 0.7 makes it a bit bowl-like, >1 makes it spikey. Let's try 0.7 for a nice floating mass.
                    } else if (y > islandTopY && y < islandTopY + 5) {
                        // Top surface roughness
                        currentRadius = maxR;
                    }

                    if (islandData.dist < currentRadius) {
                        // Inside the cone
                        if (y === islandTopY) {
                             this.data[index] = BlockType.GRASS;
                        } else if (y > islandTopY - 4) {
                             this.data[index] = BlockType.DIRT;
                        } else {
                             this.data[index] = BlockType.STONE;
                        }
                        continue;
                    }
                }
                
                // Clouds - only near islands to save perf
                if (isNearIsland && islandData.dist < islandData.radius + 40) {
                    const cloudNoise = this.world.noise3D(worldX * 0.05, y * 0.05, worldZ * 0.05);
                    const dist = Math.abs(y - 500);
                    if (cloudNoise > 0.7 && dist < 30) {
                        this.data[index] = BlockType.CLOUD;
                        continue;
                    }
                }
            }

            if (hasTree && y >= surfaceHeight && y < surfaceHeight + 7) {
                // Tree generation moved to decorateChunk
                this.data[index] = BlockType.AIR;
            } else if (hasCactus && y >= surfaceHeight && y < surfaceHeight + 3) {
                this.data[index] = BlockType.CACTUS;
            } else {
                if (y <= this.world.seaLevel && (biome === 'Ocean' || biome === 'Beach' || surfaceHeight < this.world.seaLevel)) {
                    this.data[index] = BlockType.WATER;
                } else {
                    this.data[index] = BlockType.AIR;
                }
            }
          }
        }
      }
    }
    
    // Passe de décoration
    this.decorateChunk();
  }

  // ...existing code...
  decorateChunk() {
    for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
            const worldX = this.x * this.size + x;
            const worldZ = this.z * this.size + z;
            const surfaceHeight = this.world.getHeight(worldX, worldZ);
            const biome = this.world.getBiome(worldX, worldZ);
            
            // Check block below to prevent floating trees
            if (surfaceHeight > 0) {
                const indexBelow = this.getBlockIndex(x, surfaceHeight - 1, z);
                const blockBelow = this.data[indexBelow];
                if (blockBelow === BlockType.AIR || blockBelow === BlockType.WATER) continue;
            } else {
                continue;
            }
            
            // Check for Volcano
            const volcanoData = this.world.getVolcanoData(worldX, worldZ);
            const isVolcano = volcanoData.center && volcanoData.dist < 150;

            if (biome === 'Mushrooms' && !isVolcano) {
                const mushroomNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                
                // Giant Mushrooms
                if (mushroomNoise > 0.3 && pseudoRandom > 0.95) {
                    const type = pseudoRandom > 0.97 ? 'RED' : 'BROWN';
                    this.addGiantMushroom(x, surfaceHeight, z, type);
                }
                
                // Spores on ground
                if (pseudoRandom < 0.05) {
                     const index = this.getBlockIndex(x, surfaceHeight, z);
                     // Only place if air above
                     if (this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                        this.data[index] = BlockType.SPORE_BLOCK;
                     }
                }
            } else if (biome === 'Pine Forest' && !isVolcano) {
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const hasTree = treeNoise > 0.4 && pseudoRandom > 0.85;

                if (hasTree) {
                    // Restore old tree generation (Classic Spruce)
                    // Trunk
                    for (let i = 0; i < 6; i++) {
                        if (surfaceHeight + i < this.height) {
                             const index = this.getBlockIndex(x, surfaceHeight + i, z);
                             this.data[index] = BlockType.SPRUCE_LOG;
                        }
                    }
                    // Top leaf
                    if (surfaceHeight + 6 < this.height) {
                        const index = this.getBlockIndex(x, surfaceHeight + 6, z);
                        this.data[index] = BlockType.PINE_LEAVES;
                    }
                    
                    // Leaves
                    this.addLeaves(x, surfaceHeight + 3, z, 2, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 4, z, 2, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 5, z, 1, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 6, z, 1, BlockType.PINE_LEAVES);
                }
            } else if (biome === 'Mountain' && !isVolcano) {
                // New Pine Tree in Mountains
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                // Sparse trees in mountains
                const hasTree = treeNoise > 0.3 && pseudoRandom > 0.92;

                if (hasTree) {
                    this.generatePineTree(x, surfaceHeight, z);
                }
            } else if (biome === 'Mushroom') {
                const mushroomNoise = this.world.noise2D(worldX * 0.15, worldZ * 0.15);
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const hasMushroom = mushroomNoise > 0.6 && pseudoRandom > 0.9;
                
                if (hasMushroom) {
                    this.addMushroom(x, surfaceHeight, z);
                }
            }
        }
    }
  }

  generatePineTree(x, y, z) {
      const height = 7 + Math.floor(Math.random() * 3); // 7 to 9 blocks tall
      
      // Trunk (Force placement)
      for (let i = 0; i < height; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.DARK_OAK_LOG;
          }
      }
      
      // Leaves
      // Top
      this.setBlockLocal(x, y + height, z, BlockType.DARK_OAK_LEAVES);
      this.setBlockLocal(x, y + height + 1, z, BlockType.DARK_OAK_LEAVES);
      
      // Layers going down
      let radius = 1;
      for (let i = height - 1; i > 2; i--) {
          // Every 2 blocks, increase radius
          if ((height - i) % 2 === 0) radius++;
          if (radius > 3) radius = 3;
          
          this.addLeaves(x, y + i, z, radius, BlockType.DARK_OAK_LEAVES);
      }
  }

  addMushroom(centerX, centerY, centerZ) {
      const height = 4;
      // Stem
      for (let y = 0; y < height; y++) {
          this.setBlockLocal(centerX, centerY + y, centerZ, BlockType.MUSHROOM_STEM);
      }
      // Cap
      const capY = centerY + height;
      for (let x = centerX - 2; x <= centerX + 2; x++) {
          for (let z = centerZ - 2; z <= centerZ + 2; z++) {
              this.setBlockLocal(x, capY, z, BlockType.MUSHROOM_CAP);
          }
      }
  }

  addGiantMushroom(x, y, z, type) {
      const height = 4 + Math.floor(Math.random() * 3);
      
      // Stem
      for (let i = 0; i < height; i++) {
          this.setBlockLocal(x, y + i, z, BlockType.MUSHROOM_STEM);
      }
      
      // Cap
      const capBlock = type === 'RED' ? BlockType.RED_MUSHROOM_BLOCK : BlockType.BROWN_MUSHROOM_BLOCK;
      const capY = y + height;
      
      if (type === 'RED') {
          // Red mushroom cap (more rounded/flat top)
          // 3x3 or 5x5
          for (let dx = -2; dx <= 2; dx++) {
              for (let dz = -2; dz <= 2; dz++) {
                  // Skip corners for rounded look
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                  
                  this.setBlockLocal(x + dx, capY, z + dz, capBlock);
              }
          }
          // Top layer
          for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                  this.setBlockLocal(x + dx, capY + 1, z + dz, capBlock);
              }
          }
          
          // Add pores underneath cap (optional detail)
          for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                  if (dx === 0 && dz === 0) continue; // Stem is here
                  this.setBlockLocal(x + dx, capY - 1, z + dz, BlockType.MUSHROOM_STEM_PORE);
              }
          }

      } else {
          // Brown mushroom cap (flat)
          for (let dx = -3; dx <= 3; dx++) {
              for (let dz = -3; dz <= 3; dz++) {
                  if (Math.abs(dx) + Math.abs(dz) > 4) continue; // Diamond/Circle shape
                  this.setBlockLocal(x + dx, capY, z + dz, capBlock);
              }
          }
      }
  }

  addLeaves(centerX, centerY, centerZ, radius, type) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
          for (let z = centerZ - radius; z <= centerZ + radius; z++) {
              // On ne remplace pas le tronc
              if (x === centerX && z === centerZ) continue;
              
              // Forme arrondie/carrée pour sapin
              if (Math.abs(x - centerX) + Math.abs(z - centerZ) <= radius * 1.5) {
                  this.setBlockLocal(x, centerY, z, type);
              }
          }
      }
  }

  setBlockLocal(x, y, z, type) {
      // Version safe qui ne sort pas du chunk (pour l'instant)
      if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
          return;
      }
      const index = this.getBlockIndex(x, y, z);
      if (this.data[index] === BlockType.AIR) { // On ne remplace pas les blocs existants (tronc, terrain)
          this.data[index] = type;
      }
  }

  getBlockIndex(x, y, z) {
    return x + this.size * (y + this.height * z);
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return;
    }
    this.data[this.getBlockIndex(x, y, z)] = type;
    this.updateMesh();
  }

  updateMesh() {
    // Dispose existing meshes
    Object.values(this.meshes).forEach(mesh => {
      this.game.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.meshes = {};

    // Dispose existing lights
    this.lights.forEach(light => {
        this.game.scene.remove(light);
        if (light.dispose) light.dispose();
    });
    this.lights = [];

    if (this.waterMesh) {
      this.game.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh.material.dispose();
      this.waterMesh = null;
    }
    this.generateMesh();
  }

  generateMesh() {
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    
    const waterPositions = [];
    const waterNormals = [];
    const waterColors = [];
    const waterUvs = [];

    const color = new THREE.Color();
    const textureManager = this.game.textureManager;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const blockId = this.data[this.getBlockIndex(x, y, z)];
          if (blockId === BlockType.AIR) continue;

          const def = BlockDefinitions[blockId];
          color.setHex(def.color);
          
          // Use white color if texture is available to avoid tinting
          if (def.textures && textureManager && textureManager.atlasTexture) {
             color.setHex(0xFFFFFF);
          }
          
          const isWater = blockId === BlockType.WATER;
          const isTorch = blockId === BlockType.TORCH;
          const isCactus = blockId === BlockType.CACTUS;
          
          let tintColor = null;
          if (def.textures && textureManager && textureManager.atlasTexture) {
             if (blockId === BlockType.GRASS) {
                 const worldX = x + this.x * this.size;
                 const worldZ = z + this.z * this.size;
                 const biomeData = this.world.getBiomeData(worldX, worldZ);
                 tintColor = textureManager.getBiomeColor('grass', biomeData.temperature, biomeData.humidity);
             } else if (blockId === BlockType.LEAVES || blockId === BlockType.PINE_LEAVES) {
                 const worldX = x + this.x * this.size;
                 const worldZ = z + this.z * this.size;
                 const biomeData = this.world.getBiomeData(worldX, worldZ);
                 tintColor = textureManager.getBiomeColor('foliage', biomeData.temperature, biomeData.humidity);
             }
          }
          
          // Geometry generation for Cube
          if (!isTorch && !isCactus) {
              // Check 6 faces
              // Right (x+1)
              let neighbor = this.getBlock(x + 1, y, z);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x + 1, y, z, neighbor)) {
                  this.addFace(x, y, z, 0, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Left (x-1)
              neighbor = this.getBlock(x - 1, y, z);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x - 1, y, z, neighbor)) {
                  this.addFace(x, y, z, 1, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Top (y+1)
              neighbor = this.getBlock(x, y + 1, z);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y + 1, z, neighbor)) {
                  this.addFace(x, y, z, 2, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Bottom (y-1)
              neighbor = this.getBlock(x, y - 1, z);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y - 1, z, neighbor)) {
                  this.addFace(x, y, z, 3, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Front (z+1)
              neighbor = this.getBlock(x, y, z + 1);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y, z + 1, neighbor)) {
                  this.addFace(x, y, z, 4, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Back (z-1)
              neighbor = this.getBlock(x, y, z - 1);
              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y, z - 1, neighbor)) {
                  this.addFace(x, y, z, 5, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
          } else if (isCactus) {
              this.addCactus(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else {
              // Torch Geometry (Simplified as a small box)
              // Always draw torches for now, or check if obscured (unlikely)
              this.addTorch(x, y, z, positions, normals, colors, uvs, color);

              // Add PointLight for Torch
              // Couleur orange/jaune (0xFFAA00), intensité 2.0, distance 30 (pour couvrir ~8 blocs)
              const light = new THREE.PointLight(0xFFAA00, 10, 30);
              light.position.set(
                  this.x * this.size + x + 0.5,
                  y + 0.6,
                  this.z * this.size + z + 0.5
              );
              this.game.scene.add(light);
              this.lights.push(light);
          }
        }
      }
    }

    // Create Solid Mesh
    if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Compute bounding sphere for culling
        geometry.computeBoundingSphere();

        const material = new THREE.MeshLambertMaterial({ 
            vertexColors: true,
            side: THREE.FrontSide, // Backface culling enabled by default
            map: textureManager ? textureManager.atlasTexture : null,
            transparent: true,
            alphaTest: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.x * this.size, 0, this.z * this.size);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.meshes['terrain'] = mesh;
        this.game.scene.add(mesh);
    }

    // Create Water Mesh
    if (waterPositions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
        
        geometry.computeBoundingSphere();

        const material = new THREE.MeshLambertMaterial({ 
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            side: THREE.FrontSide,
            map: textureManager ? textureManager.atlasTexture : null
        });
        
        this.waterMesh = new THREE.Mesh(geometry, material);
        this.waterMesh.position.set(this.x * this.size, 0, this.z * this.size);
        this.waterMesh.receiveShadow = true;
        
        this.game.scene.add(this.waterMesh);
    }
  }

  addFace(x, y, z, faceIndex, positions, normals, colors, uvs, color, blockId, tintColor, inset = 0) {
      // Face data
      // 0: Right, 1: Left, 2: Top, 3: Bottom, 4: Front, 5: Back
      const corners = [
          // Right (x+1)
          [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]],
          // Left (x-1)
          [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
          // Top (y+1)
          [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
          // Bottom (y-1)
          [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
          // Front (z+1)
          [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]],
          // Back (z-1)
          [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]]
      ];
      
      const faceNormals = [
          [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
      ];

      let c = corners[faceIndex];
      if (inset > 0) {
          c = c.map(p => [...p]);
          for (let i = 0; i < 4; i++) {
              if (c[i][0] === 0) c[i][0] = inset;
              else if (c[i][0] === 1) c[i][0] = 1 - inset;
              
              if (c[i][2] === 0) c[i][2] = inset;
              else if (c[i][2] === 1) c[i][2] = 1 - inset;
          }
      }
      const n = faceNormals[faceIndex];

      // UV Calculation
      const textureManager = this.game.textureManager;
      let uMin = 0, uMax = 0, vMin = 0, vMax = 0;
      
      if (textureManager && textureManager.atlasTexture) {
          const def = BlockDefinitions[blockId];
          let textureName = null;
          
          if (def.textures) {
              if (def.textures.all) textureName = def.textures.all;
              else {
                  if (faceIndex === 2) textureName = def.textures.top;
                  else if (faceIndex === 3) textureName = def.textures.bottom;
                  else textureName = def.textures.side;
              }
          }
          
          if (textureName) {
              const uv = textureManager.getUVs(textureName);
              if (uv) {
                  uMin = uv.uMin;
                  uMax = uv.uMax;
                  vMin = uv.vMin;
                  vMax = uv.vMax;

                  // Adjust UVs if inset is present to prevent texture shrinking
                  if (inset > 0) {
                      const uRange = uMax - uMin;
                      const vRange = vMax - vMin;

                      if (faceIndex === 2 || faceIndex === 3) {
                          // Top/Bottom: Inset both U and V
                          uMin += inset * uRange;
                          uMax -= inset * uRange;
                          vMin += inset * vRange;
                          vMax -= inset * vRange;
                      } else {
                          // Sides: Inset only U (width), keep V (height) full
                          uMin += inset * uRange;
                          uMax -= inset * uRange;
                      }
                  }
              }
          }
      }

      // Determine winding order based on face index
      if (faceIndex === 2 || faceIndex === 3) {
          // Original winding (0, 1, 2) and (0, 2, 3)
          // Triangle 1
          positions.push(x + c[0][0], y + c[0][1], z + c[0][2]);
          positions.push(x + c[1][0], y + c[1][1], z + c[1][2]);
          positions.push(x + c[2][0], y + c[2][1], z + c[2][2]);
          
          uvs.push(uMin, vMin);
          uvs.push(uMin, vMax);
          uvs.push(uMax, vMax);
          
          // Triangle 2
          positions.push(x + c[0][0], y + c[0][1], z + c[0][2]);
          positions.push(x + c[2][0], y + c[2][1], z + c[2][2]);
          positions.push(x + c[3][0], y + c[3][1], z + c[3][2]);
          
          uvs.push(uMin, vMin);
          uvs.push(uMax, vMax);
          uvs.push(uMax, vMin);
      } else {
          // Swapped winding (0, 2, 1) and (0, 3, 2)
          // Triangle 1
          positions.push(x + c[0][0], y + c[0][1], z + c[0][2]);
          positions.push(x + c[2][0], y + c[2][1], z + c[2][2]);
          positions.push(x + c[1][0], y + c[1][1], z + c[1][2]);
          
          uvs.push(uMin, vMin);
          uvs.push(uMax, vMax);
          uvs.push(uMin, vMax);
          
          // Triangle 2
          positions.push(x + c[0][0], y + c[0][1], z + c[0][2]);
          positions.push(x + c[3][0], y + c[3][1], z + c[3][2]);
          positions.push(x + c[2][0], y + c[2][1], z + c[2][2]);
          
          uvs.push(uMin, vMin);
          uvs.push(uMax, vMin);
          uvs.push(uMax, vMax);
      }

      let r = color.r;
      let g = color.g;
      let b = color.b;

      if (tintColor) {
          if (blockId === BlockType.GRASS) {
              if (faceIndex === 2) { // Top
                  r = tintColor.r;
                  g = tintColor.g;
                  b = tintColor.b;
              }
          } else {
              // Leaves
              r = tintColor.r;
              g = tintColor.g;
              b = tintColor.b;
          }
      }

      for (let i = 0; i < 6; i++) {
          normals.push(n[0], n[1], n[2]);
          colors.push(r, g, b);
      }
  }

  addTorch(x, y, z, positions, normals, colors, uvs, color) {
      // Simple torch geometry (thin box)
      // Center at x+0.5, y+0.5, z+0.5
      // Width 0.15, Height 0.6
      const w = 0.15 / 2;
      const h = 0.6;
      const bottom = 0; // On ground
      
      // We can reuse addFace logic but with custom corners
      // Or just manually push vertices.
      // Let's manually push a simple box (5 faces, no bottom)
      
      const cx = x + 0.5;
      const cz = z + 0.5;
      const cy = y;

      // Define corners relative to center
      const p = [
          [cx - w, cy, cz + w], // 0: FL
          [cx + w, cy, cz + w], // 1: FR
          [cx + w, cy, cz - w], // 2: BR
          [cx - w, cy, cz - w], // 3: BL
          [cx - w, cy + h, cz + w], // 4: TFL
          [cx + w, cy + h, cz + w], // 5: TFR
          [cx + w, cy + h, cz - w], // 6: TBR
          [cx - w, cy + h, cz - w]  // 7: TBL
      ];

      // Faces
      const faces = [
          [1, 5, 6, 2], // Right
          [3, 7, 4, 0], // Left
          [4, 7, 6, 5], // Top
          [0, 4, 5, 1], // Front
          [2, 6, 7, 3]  // Back
      ];
      
      const faceNormals = [
          [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]
      ];

      for (let i = 0; i < faces.length; i++) {
          const f = faces[i];
          const n = faceNormals[i];
          
          // Tri 1 (0, 2, 1) - Correct winding order
          positions.push(p[f[0]][0], p[f[0]][1], p[f[0]][2]);
          positions.push(p[f[2]][0], p[f[2]][1], p[f[2]][2]);
          positions.push(p[f[1]][0], p[f[1]][1], p[f[1]][2]);
          
          // Tri 2 (0, 3, 2) - Correct winding order
          positions.push(p[f[0]][0], p[f[0]][1], p[f[0]][2]);
          positions.push(p[f[3]][0], p[f[3]][1], p[f[3]][2]);
          positions.push(p[f[2]][0], p[f[2]][1], p[f[2]][2]);
          
          for (let k = 0; k < 6; k++) {
              normals.push(n[0], n[1], n[2]);
              colors.push(color.r, color.g, color.b);
              uvs.push(0, 0);
          }
      }
  }

  addCactus(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const inset = 1/16;
      
      // Check 6 faces
      // Right (x+1) - Always draw side faces due to inset
      this.addFace(x, y, z, 0, positions, normals, colors, uvs, color, blockId, null, inset);
      
      // Left (x-1)
      this.addFace(x, y, z, 1, positions, normals, colors, uvs, color, blockId, null, inset);
      
      // Top (y+1)
      let neighbor = this.getBlock(x, y + 1, z);
      if (this.shouldDrawFace(x, y + 1, z, neighbor) && neighbor !== BlockType.CACTUS) {
          this.addFace(x, y, z, 2, positions, normals, colors, uvs, color, blockId, null, inset);
      }
      
      // Bottom (y-1)
      neighbor = this.getBlock(x, y - 1, z);
      if (this.shouldDrawFace(x, y - 1, z, neighbor) && neighbor !== BlockType.CACTUS) {
          this.addFace(x, y, z, 3, positions, normals, colors, uvs, color, blockId, null, inset);
      }
      
      // Front (z+1)
      this.addFace(x, y, z, 4, positions, normals, colors, uvs, color, blockId, null, inset);
      
      // Back (z-1)
      this.addFace(x, y, z, 5, positions, normals, colors, uvs, color, blockId, null, inset);
  }
}
