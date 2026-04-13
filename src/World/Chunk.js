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
    
    // Minimap optimization
    this.topMap = new Uint16Array(this.size * this.size); // Stores Block ID of top block
    this.heightMap = new Int16Array(this.size * this.size); // Stores Y of top block
    this.topMap.fill(0);
    this.heightMap.fill(-1);

    this.minY = this.height;
    this.maxY = 0;

    this.generateData();
    this.generateMesh();
  }

  generateHugeTree(x, y, z) {
      const height = 40 + Math.floor(Math.random() * 20); // 40-60 blocks high
      const trunkRadius = 2;
      
      // Trunk
      for (let i = 0; i < height; i++) {
          for (let tx = -trunkRadius; tx <= trunkRadius; tx++) {
              for (let tz = -trunkRadius; tz <= trunkRadius; tz++) {
                  // Rounded trunk
                  if (tx*tx + tz*tz <= trunkRadius*trunkRadius + 1) {
                      this.setBlock(x + tx, y + i + 1, z + tz, BlockType.MAGIC_LOG);
                  }
              }
          }
      }
      
      // Roots
      const rootHeight = 8;
      for (let i = 0; i < rootHeight; i++) {
          const r = trunkRadius + (rootHeight - i) * 0.5;
          for (let tx = -Math.ceil(r); tx <= Math.ceil(r); tx++) {
              for (let tz = -Math.ceil(r); tz <= Math.ceil(r); tz++) {
                  if (Math.abs(tx) > trunkRadius || Math.abs(tz) > trunkRadius) {
                      // Only outside trunk
                      if (tx*tx + tz*tz <= r*r && Math.random() < 0.6) {
                           this.setBlock(x + tx, y + i, z + tz, BlockType.MAGIC_LOG);
                      }
                  }
              }
          }
      }
      
      // Canopy
      const canopyRadius = 12;
      const canopyHeight = 15;
      const canopyStart = y + height - 5;
      
      for (let cy = canopyStart; cy < canopyStart + canopyHeight; cy++) {
          for (let cx = -canopyRadius; cx <= canopyRadius; cx++) {
              for (let cz = -canopyRadius; cz <= canopyRadius; cz++) {
                  const dist = Math.sqrt(cx*cx + cz*cz + (cy - (canopyStart + canopyHeight/2))**2);
                  if (dist < canopyRadius) {
                      if (Math.random() < 0.8) {
                          // Don't overwrite log
                          const current = this.getBlock(x + cx, cy, z + cz);
                          if (current !== BlockType.MAGIC_LOG) {
                              this.setBlock(x + cx, cy, z + cz, BlockType.MAGIC_LEAVES);
                          }
                      }
                  }
              }
          }
      }
      
      // Hanging vines/leaves
      for (let cx = -canopyRadius; cx <= canopyRadius; cx++) {
          for (let cz = -canopyRadius; cz <= canopyRadius; cz++) {
              if (Math.random() < 0.1) {
                  const vineLength = Math.floor(Math.random() * 10);
                  for (let i = 0; i < vineLength; i++) {
                      const by = canopyStart - i;
                      if (this.getBlock(x + cx, by, z + cz) === BlockType.AIR) {
                          this.setBlock(x + cx, by, z + cz, BlockType.MAGIC_LEAVES);
                      }
                  }
              }
          }
      }
  }

  setBlock(x, y, z, type) {
      if (x >= 0 && x < this.size && z >= 0 && z < this.size && y >= 0 && y < this.height) {
          const index = this.getBlockIndex(x, y, z);
          this.data[index] = type;
      } else {
          // Neighbor chunk modification not supported in generation phase easily
          // But we can try if world is available
          // For now, ignore out of bounds for trees to avoid complexity
      }
  }

  isBlockOpaque(id) {
    if (id === BlockType.AIR) return false;
    const def = BlockDefinitions[id];
    if (!def) return false;
    if (def.transparent || def.liquid) return false;
    if (def.model && (def.model === BlockModels.TORCH || def.model === BlockModels.CROSS || def.model === BlockModels.GRASS || def.model === BlockModels.LADDER || def.model === BlockModels.SLAB || def.model === BlockModels.STAIR || def.model === BlockModels.FENCE || def.model === BlockModels.DOOR || def.model === BlockModels.TRAPDOOR)) return false;
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

  getTopBlock(x, z) {
      if (x < 0 || x >= this.size || z < 0 || z >= this.size) {
          return null;
      }
      const index = x + z * this.size;
      return {
          id: this.topMap[index],
          y: this.heightMap[index]
      };
  }

  // Determine ore or stone variant at this position
  getOreOrStone(worldX, y, worldZ) {
    const isDeepslate = y < 16;
    const baseStone = isDeepslate ? BlockType.DEEPSLATE : BlockType.STONE;

    // Stone variants (granite, diorite, andesite) in large blobs
    if (!isDeepslate) {
      const variantNoise = this.world.noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04);
      const variantType = this.world.noise3D(worldX * 0.02 + 100, y * 0.02, worldZ * 0.02 + 100);
      if (variantNoise > 0.55) {
        if (variantType > 0.3) return BlockType.GRANITE;
        if (variantType > -0.3) return BlockType.DIORITE;
        return BlockType.ANDESITE;
      }
    }

    // Ore generation using separate noise octaves per ore type
    // Diamond: y < 16, very rare
    if (y < 16) {
      const n = this.world.noise3D(worldX * 0.15 + 1000, y * 0.15, worldZ * 0.15 + 1000);
      if (n > 0.88) return isDeepslate ? BlockType.DEEPSLATE_DIAMOND_ORE : BlockType.DIAMOND_ORE;
    }

    // Emerald: y < 32, very rare, mountain only checked by caller
    if (y < 32) {
      const n = this.world.noise3D(worldX * 0.15 + 2000, y * 0.15, worldZ * 0.15 + 2000);
      if (n > 0.9) return isDeepslate ? BlockType.DEEPSLATE_EMERALD_ORE : BlockType.EMERALD_ORE;
    }

    // Gold: y < 32
    if (y < 32) {
      const n = this.world.noise3D(worldX * 0.12 + 3000, y * 0.12, worldZ * 0.12 + 3000);
      if (n > 0.85) return isDeepslate ? BlockType.DEEPSLATE_GOLD_ORE : BlockType.GOLD_ORE;
    }

    // Redstone: y < 16
    if (y < 16) {
      const n = this.world.noise3D(worldX * 0.12 + 4000, y * 0.12, worldZ * 0.12 + 4000);
      if (n > 0.82) return isDeepslate ? BlockType.DEEPSLATE_REDSTONE_ORE : BlockType.REDSTONE_ORE;
    }

    // Lapis: y 0-32
    if (y < 32) {
      const n = this.world.noise3D(worldX * 0.12 + 5000, y * 0.12, worldZ * 0.12 + 5000);
      if (n > 0.87) return isDeepslate ? BlockType.DEEPSLATE_LAPIS_ORE : BlockType.LAPIS_ORE;
    }

    // Copper: y 0-96
    if (y < 96) {
      const n = this.world.noise3D(worldX * 0.1 + 6000, y * 0.1, worldZ * 0.1 + 6000);
      if (n > 0.83) return isDeepslate ? BlockType.DEEPSLATE_COPPER_ORE : BlockType.COPPER_ORE;
    }

    // Iron: y 0-64
    if (y < 64) {
      const n = this.world.noise3D(worldX * 0.1 + 7000, y * 0.1, worldZ * 0.1 + 7000);
      if (n > 0.8) return isDeepslate ? BlockType.DEEPSLATE_IRON_ORE : BlockType.IRON_ORE;
    }

    // Coal: y 0-128, most common
    if (y < 128) {
      const n = this.world.noise3D(worldX * 0.1, y * 0.1, worldZ * 0.1);
      if (n > 0.78) return isDeepslate ? BlockType.DEEPSLATE_COAL_ORE : BlockType.COAL_ORE;
    }

    return baseStone;
  }

  setLOD(level) {
      if (this.lod === level) return;
      this.lod = level;
      // We could simplify the mesh for LOD 1, but for now just keep it.
      // The merged mesh is already efficient.
  }

  generateMagicalBlock(index, x, y, z) {
      // Floating islands generation
      // Use 3D noise to create organic floating shapes
      
      // Base density from 3D noise
      const scale = 0.02;
      let density = this.world.noise3D(x * scale, y * scale, z * scale);
      
      // Create layers of islands
      // Layer 1: Y=80 to Y=150
      // Layer 2: Y=200 to Y=300
      
      const layer1Center = 120;
      const layer2Center = 250;
      const layerThickness = 40;
      
      let dist1 = Math.abs(y - layer1Center);
      let dist2 = Math.abs(y - layer2Center);
      
      // Gradient to fade out density away from centers
      let gradient = 0;
      if (dist1 < layerThickness * 2) {
          gradient = 1 - (dist1 / (layerThickness * 2));
      } else if (dist2 < layerThickness * 2) {
          gradient = 1 - (dist2 / (layerThickness * 2));
      }
      
      // Combine
      const finalDensity = density + gradient * 0.8;
      
      if (finalDensity > 0.6) {
          // Surface detection (simple)
          // We can't easily know if it's surface in a single pass without checking neighbors or 2nd pass.
          // But we can use the density value. If it's close to threshold, it's near surface.
          
          if (finalDensity < 0.65) {
              this.data[index] = BlockType.GRASS;
              // Chance for huge tree
              if (Math.random() < 0.005 && y > 100) { // Rare
                  // Store tree location for decoration pass? 
                  // Or just mark it.
                  // Better to do trees in decorateChunk.
              }
          } else if (finalDensity < 0.7) {
              this.data[index] = BlockType.MAGIC_DIRT;
          } else {
              this.data[index] = BlockType.MAGIC_STONE;
          }
          
          // Ores
          if (this.data[index] === BlockType.MAGIC_STONE) {
              if (Math.random() < 0.01) {
                  // Maybe magic crystals? For now standard coal or nothing
              }
          }
      } else {
          this.data[index] = BlockType.AIR;
      }
  }

  generateData() {
    // ...existing code...
    // Initialise le tableau de données
    this.data = new Int16Array(this.size * this.height * this.size);
    
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const worldX = this.x * this.size + x;
        const worldZ = this.z * this.size + z;
        
        const biome = this.world.getBiome(worldX, worldZ);

        if (biome === 'Magical') {
            this.generateMagicalBlock(index, worldX, y, worldZ);
            continue;
        }

        // Génération de terrain basique avec bruit
        const noiseValue = this.world.noise3D(worldX * 0.05, 0, worldZ * 0.05); // Pour les grottes
        const surfaceHeight = this.world.getHeight(worldX, worldZ);
        
        // Update bounds based on surface height (approximate, but safe start)
        if (surfaceHeight > this.maxY) this.maxY = surfaceHeight;
        if (0 < this.minY) this.minY = 0; // Bedrock is at 0

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
                       this.data[index] = this.getOreOrStone(worldX, y, worldZ);
                   }
               } else if (biome === 'Swamp') {
                   if (y === surfaceHeight - 1) {
                     // Swamp uses darker grass tone (still GRASS block, color handled by biome)
                     this.data[index] = BlockType.GRASS;
                   } else if (y > surfaceHeight - 4) {
                     this.data[index] = (y === surfaceHeight - 2) ? BlockType.CLAY : BlockType.DIRT;
                   } else {
                     this.data[index] = this.getOreOrStone(worldX, y, worldZ);
                   }
               } else if (biome === 'Savanna') {
                   if (y === surfaceHeight - 1) {
                     this.data[index] = BlockType.GRASS;
                   } else if (y > surfaceHeight - 4) {
                     this.data[index] = BlockType.DIRT;
                   } else {
                     this.data[index] = this.getOreOrStone(worldX, y, worldZ);
                   }
               } else {
                   if (y === surfaceHeight - 1) {
                     this.data[index] = BlockType.GRASS;
                   } else if (y > surfaceHeight - 4) {
                     this.data[index] = BlockType.DIRT;
                   } else {
                     this.data[index] = this.getOreOrStone(worldX, y, worldZ);
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

    // Structure generation
    this.generateStructures();

    // Final bounds check (in case decoration added blocks higher/lower)
    // We can just add a safety margin or scan. 
    // DecorateChunk adds trees/mushrooms, usually +10 height max.
    this.maxY = Math.min(this.height - 1, this.maxY + 20);
    this.minY = Math.max(0, this.minY);

    // Generate Minimap Data
    for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
            for (let y = this.height - 1; y >= 0; y--) {
                const index = x + this.size * (y + this.height * z);
                const id = this.data[index];
                if (id !== BlockType.AIR && id !== BlockType.CLOUD) {
                    this.topMap[x + z * this.size] = id;
                    this.heightMap[x + z * this.size] = y;
                    break;
                }
            }
        }
    }
  }

  // ...existing code...
  decorateChunk() {
    for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
            const worldX = this.x * this.size + x;
            const worldZ = this.z * this.size + z;
            const biome = this.world.getBiome(worldX, worldZ);

            if (biome === 'Magical') {
                // Magical World Decoration
                // Iterate Y to find surface
                // Since we have multiple islands, we might have multiple surfaces.
                // We should scan from top to bottom or bottom to top.
                
                for (let y = this.height - 1; y > 0; y--) {
                    const index = this.getBlockIndex(x, y, z);
                    const block = this.data[index];
                    
                    if (block === BlockType.GRASS) {
                        // Found a surface
                        // Chance for huge tree
                        // Use noise to determine tree placement
                        const treeNoise = this.world.noise2D(worldX * 0.05, worldZ * 0.05);
                        // Very sparse but huge
                        if (treeNoise > 0.7 && Math.random() < 0.02) {
                            this.generateHugeTree(x, y, z);
                        }
                    }
                }
                continue;
            }
            
            const surfaceHeight = this.world.getHeight(worldX, worldZ);
            
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

                // Add Tall Grass
                // High density in open areas, low density near trees
                if (!hasTree && this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                     const grassNoise = this.world.noise2D(worldX * 0.5, worldZ * 0.5);
                     // More grass in open areas
                     if (grassNoise > 0.2 && pseudoRandom > 0.3) {
                         const index = this.getBlockIndex(x, surfaceHeight, z);
                         this.data[index] = BlockType.TALL_GRASS;
                     }
                }

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
            } else if (biome === 'Plains' && !isVolcano) {
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                
                // Tall grass everywhere
                if (this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                    if (pseudoRandom > 0.4) {
                        const index = this.getBlockIndex(x, surfaceHeight, z);
                        this.data[index] = BlockType.TALL_GRASS;
                    } else if (pseudoRandom < 0.02) {
                        // Occasional flowers (tall grass as placeholder)
                        const index = this.getBlockIndex(x, surfaceHeight, z);
                        this.data[index] = BlockType.TALL_GRASS;
                    }
                }
                
                // Sparse oak trees
                if (treeNoise > 0.6 && pseudoRandom > 0.97) {
                    this.generateOakTree(x, surfaceHeight, z);
                }
            } else if (biome === 'Birch Forest' && !isVolcano) {
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                
                // Tall grass
                if (!treeNoise > 0.3 && this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                    if (pseudoRandom > 0.5) {
                        const index = this.getBlockIndex(x, surfaceHeight, z);
                        this.data[index] = BlockType.TALL_GRASS;
                    }
                }
                
                // Birch trees - dense
                if (treeNoise > 0.3 && pseudoRandom > 0.85) {
                    this.generateBirchTree(x, surfaceHeight, z);
                }
            } else if (biome === 'Jungle' && !isVolcano) {
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                
                // Dense jungle trees
                if (treeNoise > 0.2 && pseudoRandom > 0.75) {
                    this.generateJungleTree(x, surfaceHeight, z);
                } else if (this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                    // Dense ground cover
                    if (pseudoRandom > 0.3) {
                        const index = this.getBlockIndex(x, surfaceHeight, z);
                        this.data[index] = BlockType.TALL_GRASS;
                    }
                }
            } else if (biome === 'Savanna' && !isVolcano) {
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                
                // Sparse tall grass
                if (this.getBlock(x, surfaceHeight, z) === BlockType.AIR && pseudoRandom > 0.6) {
                    const index = this.getBlockIndex(x, surfaceHeight, z);
                    this.data[index] = BlockType.TALL_GRASS;
                }
                
                // Acacia-style trees (using oak for now, very spread out)
                if (treeNoise > 0.5 && pseudoRandom > 0.96) {
                    this.generateAcaciaTree(x, surfaceHeight, z);
                }
            } else if (biome === 'Swamp' && !isVolcano) {
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                
                // Swamp oak trees with vines
                if (treeNoise > 0.3 && pseudoRandom > 0.88) {
                    this.generateSwampTree(x, surfaceHeight, z);
                }
                
                // Lily pads on water (simplified)
                if (this.getBlock(x, surfaceHeight, z) === BlockType.AIR) {
                    if (pseudoRandom > 0.65) {
                        const index = this.getBlockIndex(x, surfaceHeight, z);
                        this.data[index] = BlockType.TALL_GRASS;
                    }
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

  // Structure generation (dungeons, wells, ruins)
  generateStructures() {
    // Use chunk coordinates as seed for deterministic structure placement
    const seed = (this.x * 73856093) ^ (this.z * 19349663);
    const rng = (n) => {
      let s = ((seed + n) * 2654435761) & 0xFFFFFFFF;
      s = ((s >>> 16) ^ s) * 2246822507;
      s = ((s >>> 13) ^ s) * 3266489917;
      return ((s >>> 16) ^ s) >>> 0;
    };

    // Dungeon generation - rare (1 in 50 chunks)
    if (rng(1) % 50 === 0) {
      const dx = 4 + (rng(2) % 8);
      const dz = 4 + (rng(3) % 8);
      const dy = 15 + (rng(4) % 30); // Underground
      this.generateDungeon(dx, dy, dz);
    }

    // Desert well - only in desert biomes
    const centerWorldX = this.x * this.size + 8;
    const centerWorldZ = this.z * this.size + 8;
    const biome = this.world.getBiome(centerWorldX, centerWorldZ);

    if (biome === 'Desert' && rng(5) % 80 === 0) {
      const wx = 4 + (rng(6) % 8);
      const wz = 4 + (rng(7) % 8);
      const worldX = this.x * this.size + wx;
      const worldZ = this.z * this.size + wz;
      const wy = this.world.getHeight(worldX, worldZ);
      this.generateDesertWell(wx, wy, wz);
    }

    // Plains village hut - only in Plains
    if (biome === 'Plains' && rng(8) % 60 === 0) {
      const vx = 3 + (rng(9) % 10);
      const vz = 3 + (rng(10) % 10);
      const worldX = this.x * this.size + vx;
      const worldZ = this.z * this.size + vz;
      const vy = this.world.getHeight(worldX, worldZ);
      this.generateVillageHut(vx, vy, vz);
    }
  }

  generateDungeon(x, y, z) {
    const sizeX = 5 + Math.floor((((this.x * 37 + this.z * 53 + y) * 2654435761) >>> 16) % 4);
    const sizeZ = 5 + Math.floor((((this.x * 41 + this.z * 59 + y) * 2654435761) >>> 16) % 4);
    const sizeY = 4;

    // Carve room
    for (let dx = 0; dx < sizeX; dx++) {
      for (let dz = 0; dz < sizeZ; dz++) {
        for (let dy = 0; dy < sizeY; dy++) {
          const bx = x + dx;
          const by = y + dy;
          const bz = z + dz;
          if (bx >= 0 && bx < this.size && bz >= 0 && bz < this.size && by > 0 && by < this.height) {
            if (dy === 0 || dy === sizeY - 1) {
              // Floor/ceiling: cobblestone + mossy cobblestone
              const idx = bx + this.size * (by + this.height * bz);
              this.data[idx] = Math.random() < 0.4 ? BlockType.MOSSY_COBBLESTONE : BlockType.COBBLESTONE;
            } else if (dx === 0 || dx === sizeX - 1 || dz === 0 || dz === sizeZ - 1) {
              // Walls: cobblestone with gaps
              const idx = bx + this.size * (by + this.height * bz);
              if (Math.random() < 0.85) {
                this.data[idx] = BlockType.COBBLESTONE;
              } else {
                this.data[idx] = BlockType.AIR;
              }
            } else {
              // Interior: air
              const idx = bx + this.size * (by + this.height * bz);
              this.data[idx] = BlockType.AIR;
            }
          }
        }
      }
    }

    // Place a chest in corner
    const chestX = x + 1;
    const chestZ = z + 1;
    if (chestX < this.size && chestZ < this.size && y + 1 < this.height) {
      const idx = chestX + this.size * ((y + 1) + this.height * chestZ);
      this.data[idx] = BlockType.CHEST;
    }
  }

  generateDesertWell(x, y, z) {
    // 5x5 sandstone base with water
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const bx = x + dx;
        const bz = z + dz;
        if (bx < 0 || bx >= this.size || bz < 0 || bz >= this.size) continue;

        // Base slab
        if (y >= 0 && y < this.height) {
          const idx = bx + this.size * (y + this.height * bz);
          this.data[idx] = BlockType.SANDSTONE;
        }

        // Walls on edges
        if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
          for (let dy = 1; dy <= 3; dy++) {
            if (y + dy < this.height) {
              const idx = bx + this.size * ((y + dy) + this.height * bz);
              this.data[idx] = BlockType.SANDSTONE;
            }
          }
        } else if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) {
          // Water inside
          if (y + 1 < this.height) {
            const idx = bx + this.size * ((y + 1) + this.height * bz);
            this.data[idx] = BlockType.WATER;
          }
        }
      }
    }

    // Top slab
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const bx = x + dx;
        const bz = z + dz;
        if (bx < 0 || bx >= this.size || bz < 0 || bz >= this.size) continue;
        if (y + 4 < this.height) {
          const idx = bx + this.size * ((y + 4) + this.height * bz);
          this.data[idx] = BlockType.SANDSTONE;
        }
      }
    }
  }

  generateVillageHut(x, y, z) {
    const w = 5, d = 5, h = 4;

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        for (let dy = 0; dy < h; dy++) {
          const bx = x + dx;
          const bz = z + dz;
          const by = y + dy + 1;
          if (bx < 0 || bx >= this.size || bz < 0 || bz >= this.size || by >= this.height) continue;

          const idx = bx + this.size * (by + this.height * bz);

          if (dy === 0) {
            // Floor
            this.data[idx] = BlockType.OAK_PLANKS;
          } else if (dy === h - 1) {
            // Roof
            this.data[idx] = BlockType.OAK_PLANKS;
          } else if (dx === 0 || dx === w - 1 || dz === 0 || dz === d - 1) {
            // Walls
            if (dy === 2 && ((dx === Math.floor(w / 2) && (dz === 0 || dz === d - 1)) ||
                            (dz === Math.floor(d / 2) && (dx === 0 || dx === w - 1)))) {
              // Windows
              this.data[idx] = BlockType.GLASS;
            } else if (dy === 1 && dx === Math.floor(w / 2) && dz === 0) {
              // Door opening
              this.data[idx] = BlockType.AIR;
            } else {
              this.data[idx] = BlockType.OAK_LOG;
            }
          } else {
            // Interior
            this.data[idx] = BlockType.AIR;
          }
        }
      }
    }

    // Crafting table inside
    const ctX = x + 1;
    const ctZ = z + 1;
    if (ctX < this.size && ctZ < this.size && y + 2 < this.height) {
      const idx = ctX + this.size * ((y + 2) + this.height * ctZ);
      this.data[idx] = BlockType.CRAFTING_TABLE;
    }
  }

  generateOakTree(x, y, z) {
      const height = 5 + Math.floor(Math.random() * 2);
      
      // Trunk
      for (let i = 0; i < height; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.OAK_LOG;
          }
      }
      
      // Canopy
      this.addLeaves(x, y + height - 2, z, 2, BlockType.OAK_LEAVES);
      this.addLeaves(x, y + height - 1, z, 2, BlockType.OAK_LEAVES);
      this.addLeaves(x, y + height, z, 1, BlockType.OAK_LEAVES);
      this.setBlockLocal(x, y + height + 1, z, BlockType.OAK_LEAVES);
  }

  generateBirchTree(x, y, z) {
      const height = 5 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < height; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.BIRCH_LOG;
          }
      }
      
      this.addLeaves(x, y + height - 2, z, 2, BlockType.BIRCH_LEAVES);
      this.addLeaves(x, y + height - 1, z, 2, BlockType.BIRCH_LEAVES);
      this.addLeaves(x, y + height, z, 1, BlockType.BIRCH_LEAVES);
      this.setBlockLocal(x, y + height + 1, z, BlockType.BIRCH_LEAVES);
  }

  generateJungleTree(x, y, z) {
      const height = 8 + Math.floor(Math.random() * 8);
      
      // Thick trunk for tall trees
      for (let i = 0; i < height; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.JUNGLE_LOG;
          }
      }
      
      // Large canopy
      this.addLeaves(x, y + height - 3, z, 3, BlockType.JUNGLE_LEAVES);
      this.addLeaves(x, y + height - 2, z, 3, BlockType.JUNGLE_LEAVES);
      this.addLeaves(x, y + height - 1, z, 2, BlockType.JUNGLE_LEAVES);
      this.addLeaves(x, y + height, z, 2, BlockType.JUNGLE_LEAVES);
      this.addLeaves(x, y + height + 1, z, 1, BlockType.JUNGLE_LEAVES);
  }

  generateAcaciaTree(x, y, z) {
      const trunkHeight = 4 + Math.floor(Math.random() * 3);
      
      // Trunk
      for (let i = 0; i < trunkHeight; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.ACACIA_LOG;
          }
      }
      
      // Bent trunk - offset canopy
      const offsetX = Math.random() < 0.5 ? -2 : 2;
      const offsetZ = Math.random() < 0.5 ? -1 : 1;
      
      // Branch
      for (let i = 0; i < 2; i++) {
          this.setBlockLocal(x + Math.round(offsetX * (i + 1) / 2), y + trunkHeight + i, z + Math.round(offsetZ * (i + 1) / 2), BlockType.ACACIA_LOG);
      }
      
      // Flat canopy
      const canopyY = y + trunkHeight + 2;
      const canopyX = x + offsetX;
      const canopyZ = z + offsetZ;
      
      this.addLeaves(canopyX, canopyY, canopyZ, 3, BlockType.ACACIA_LEAVES);
      this.addLeaves(canopyX, canopyY + 1, canopyZ, 2, BlockType.ACACIA_LEAVES);
  }

  generateSwampTree(x, y, z) {
      const height = 5 + Math.floor(Math.random() * 3);
      
      // Trunk
      for (let i = 0; i < height; i++) {
          if (y + i < this.height) {
              const index = this.getBlockIndex(x, y + i, z);
              this.data[index] = BlockType.OAK_LOG;
          }
      }
      
      // Canopy (wider, droopier)
      this.addLeaves(x, y + height - 2, z, 3, BlockType.OAK_LEAVES);
      this.addLeaves(x, y + height - 1, z, 3, BlockType.OAK_LEAVES);
      this.addLeaves(x, y + height, z, 2, BlockType.OAK_LEAVES);
      this.setBlockLocal(x, y + height + 1, z, BlockType.OAK_LEAVES);
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
    const index = this.getBlockIndex(x, y, z);
    if (this.data[index] === type) return; // Optimization: Don't update if same block
    
    this.data[index] = type;

    // Update Minimap Data
    const mapIndex = x + z * this.size;
    const currentTopY = this.heightMap[mapIndex];

    if (type !== BlockType.AIR && type !== BlockType.CLOUD) {
        // Placing a block
        if (y >= currentTopY) {
            this.topMap[mapIndex] = type;
            this.heightMap[mapIndex] = y;
        }
    } else {
        // Removing a block (or placing air/cloud)
        if (y === currentTopY) {
            // We removed the top block, need to find new top
            let newTopY = -1;
            let newTopId = 0;
            for (let dy = y - 1; dy >= 0; dy--) {
                const id = this.data[this.getBlockIndex(x, dy, z)];
                if (id !== BlockType.AIR && id !== BlockType.CLOUD) {
                    newTopY = dy;
                    newTopId = id;
                    break;
                }
            }
            this.topMap[mapIndex] = newTopId;
            this.heightMap[mapIndex] = newTopY;
        }
    }
    
    this.updateMesh();
  }

  updateMesh() {
    // Dispose existing meshes (geometry only, materials are shared)
    Object.values(this.meshes).forEach(mesh => {
      this.game.scene.remove(mesh);
      mesh.geometry.dispose();
      // Don't dispose shared material
    });
    this.meshes = {};

    if (this.waterMesh) {
      this.game.scene.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      // Don't dispose shared material
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
    const hasAtlas = textureManager && textureManager.atlasTexture;

    const size = this.size;
    const height = this.height;
    const data = this.data;
    
    // Optimization: Only iterate relevant height range
    const startY = Math.max(0, this.minY);
    const endY = Math.min(height, this.maxY + 1);

    // Pre-calculate strides
    const strideY = size;
    const strideZ = size * height;

    // Cache biome data per column to avoid redundant noise calls
    const biomeDataCache = new Array(size * size);
    if (hasAtlas) {
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                const worldX = x + this.x * size;
                const worldZ = z + this.z * size;
                biomeDataCache[x + z * size] = this.world.getBiomeData(worldX, worldZ);
            }
        }
    }

    // Loop order Z, Y, X for cache locality (Linear memory access)
    for (let z = 0; z < size; z++) {
      for (let y = startY; y < endY; y++) {
        for (let x = 0; x < size; x++) {
          const index = x + strideY * y + strideZ * z;
          const blockId = data[index];
          
          if (blockId === BlockType.AIR) continue;

          const def = BlockDefinitions[blockId];
          
          // Use white color if texture is available to avoid tinting
          if (def.textures && hasAtlas) {
             color.setRGB(1, 1, 1);
          } else {
             color.setHex(def.color);
          }
          
          const isWater = blockId === BlockType.WATER;
          const isTorch = blockId === BlockType.TORCH;
          const isCactus = blockId === BlockType.CACTUS;
          const isCross = def.model === BlockModels.CROSS;
          const isGrass = def.model === BlockModels.GRASS;
          const isSlab = def.model === BlockModels.SLAB;
          const isStair = def.model === BlockModels.STAIR;
          const isFence = def.model === BlockModels.FENCE;
          const isDoor = def.model === BlockModels.DOOR;
          const isTrapdoor = def.model === BlockModels.TRAPDOOR;
          
          let tintColor = null;
          if (hasAtlas && def.textures) {
             if (blockId === BlockType.GRASS || blockId === BlockType.TALL_GRASS) {
                 const bd = biomeDataCache[x + z * size];
                 tintColor = textureManager.getBiomeColor('grass', bd.temperature, bd.humidity);
             } else if (blockId === BlockType.LEAVES || blockId === BlockType.PINE_LEAVES) {
                 const bd = biomeDataCache[x + z * size];
                 tintColor = textureManager.getBiomeColor('foliage', bd.temperature, bd.humidity);
             }
          }
          
          // Geometry generation for Cube
          if (!isTorch && !isCactus && !isCross && !isGrass && !isSlab && !isStair && !isFence && !isDoor && !isTrapdoor) {
              // Check 6 faces
              // Right (x+1)
              let neighbor;
              if (x < size - 1) neighbor = data[index + 1];
              else neighbor = this.world.getBlock(this.x * size + x + 1, y, this.z * size + z);

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x + 1, y, z, neighbor)) {
                  this.addFace(x, y, z, 0, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Left (x-1)
              if (x > 0) neighbor = data[index - 1];
              else neighbor = this.world.getBlock(this.x * size + x - 1, y, this.z * size + z);

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x - 1, y, z, neighbor)) {
                  this.addFace(x, y, z, 1, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Top (y+1)
              if (y < height - 1) neighbor = data[index + strideY];
              else neighbor = BlockType.AIR;

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y + 1, z, neighbor)) {
                  this.addFace(x, y, z, 2, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Bottom (y-1)
              if (y > 0) neighbor = data[index - strideY];
              else neighbor = BlockType.BEDROCK; // Assume solid below

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y - 1, z, neighbor)) {
                  this.addFace(x, y, z, 3, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Front (z+1)
              if (z < size - 1) neighbor = data[index + strideZ];
              else neighbor = this.world.getBlock(this.x * size + x, y, this.z * size + z + 1);

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y, z + 1, neighbor)) {
                  this.addFace(x, y, z, 4, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
              // Back (z-1)
              if (z > 0) neighbor = data[index - strideZ];
              else neighbor = this.world.getBlock(this.x * size + x, y, this.z * size + z - 1);

              if (!(isWater && neighbor === BlockType.WATER) && this.shouldDrawFace(x, y, z - 1, neighbor)) {
                  this.addFace(x, y, z, 5, isWater ? waterPositions : positions, isWater ? waterNormals : normals, isWater ? waterColors : colors, isWater ? waterUvs : uvs, color, blockId, tintColor);
              }
          } else if (isCactus) {
              this.addCactus(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else if (isCross) {
              this.addCross(x, y, z, positions, normals, colors, uvs, color, blockId, tintColor);
          } else if (isGrass) {
              this.addGrass(x, y, z, positions, normals, colors, uvs, color, blockId, tintColor);
          } else if (isSlab) {
              this.addSlab(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else if (isStair) {
              this.addStair(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else if (isFence) {
              this.addFence(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else if (isDoor) {
              this.addDoor(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else if (isTrapdoor) {
              this.addTrapdoor(x, y, z, positions, normals, colors, uvs, color, blockId);
          } else {
              // Torch Geometry only - NO PointLight (massive performance win)
              this.addTorch(x, y, z, positions, normals, colors, uvs, color);
          }
        }
      }
    }

    // Create Solid Mesh with shared material
    if (positions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Compute bounding sphere for frustum culling
        geometry.computeBoundingSphere();

        // Use shared material from world (avoids creating duplicate materials per chunk)
        const material = this.world.getTerrainMaterial();
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.x * size, 0, this.z * size);
        mesh.castShadow = false; // Disable per-chunk shadow casting (major perf win)
        mesh.receiveShadow = true;
        
        this.meshes['terrain'] = mesh;
        this.game.scene.add(mesh);
    }

    // Create Water Mesh with shared material
    if (waterPositions.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
        
        geometry.computeBoundingSphere();

        // Use shared water material
        const material = this.world.getWaterMaterial();
        
        this.waterMesh = new THREE.Mesh(geometry, material);
        this.waterMesh.position.set(this.x * size, 0, this.z * size);
        this.waterMesh.receiveShadow = false;
        
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

  addGrass(x, y, z, positions, normals, colors, uvs, color, blockId, tintColor) {
      // LOD Optimization: Skip grass on distant chunks
      if (this.lod > 0) return;

      // Deterministic random based on position
      let seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
      const random = () => {
          seed = (seed * 9301 + 49297) % 233280;
          return seed / 233280;
      };

      // Optimization: Reduce blade count (5-8) but increase width slightly
      const numBlades = 5 + Math.floor(random() * 4); 
      
      // Texture UVs
      const textureManager = this.game.textureManager;
      let uMin = 0, uMax = 1, vMin = 0, vMax = 1;
      if (textureManager && textureManager.atlasTexture) {
          const def = BlockDefinitions[blockId];
          let texName = def.textures.all;
          const uvsRect = textureManager.getUVs(texName);
          if (uvsRect) {
              uMin = uvsRect.uMin;
              uMax = uvsRect.uMax;
              vMin = uvsRect.vMin;
              vMax = uvsRect.vMax;
          }
      }

      for (let i = 0; i < numBlades; i++) {
          // Random position in block
          const bx = x + 0.2 + random() * 0.6;
          const bz = z + 0.2 + random() * 0.6;
          
          // Random height
          const h = 0.6 + random() * 0.4;
          
          // Random width (slightly wider)
          const w = 0.08 + random() * 0.06;
          
          // Optimization: Avoid trig functions for rotation
          // Generate random direction vector
          let dirX = (random() - 0.5) * 2;
          let dirZ = (random() - 0.5) * 2;
          // Fast approximate normalization (or just use as is if we don't care about exact width consistency)
          // But let's normalize to keep width consistent
          const len = Math.sqrt(dirX*dirX + dirZ*dirZ) || 1;
          const cos = dirX / len;
          const sin = dirZ / len;
          
          // Tilt (offset top)
          const tiltX = (random() - 0.5) * 0.5;
          const tiltZ = (random() - 0.5) * 0.5;
          
          // Vertices
          // V0: Base Left
          // V1: Base Right
          // V2: Top Tip
          
          const x0 = bx - w * cos;
          const z0 = bz - w * sin;
          
          const x1 = bx + w * cos;
          const z1 = bz + w * sin;
          
          const x2 = bx + tiltX;
          const z2 = bz + tiltZ;
          const y2 = y + h;
          
          // Push Triangle (Double sided? Or just add 2 triangles)
          // Front
          positions.push(x0, y, z0);
          positions.push(x1, y, z1);
          positions.push(x2, y2, z2);
          
          uvs.push(uMin, vMin);
          uvs.push(uMax, vMin);
          uvs.push((uMin + uMax) / 2, vMax);
          
          // Back
          positions.push(x0, y, z0);
          positions.push(x2, y2, z2);
          positions.push(x1, y, z1);
          
          uvs.push(uMin, vMin);
          uvs.push((uMin + uMax) / 2, vMax);
          uvs.push(uMax, vMin);
          
          // Normals (approximate up or face normal)
          const nx = 0; const ny = 1; const nz = 0;
          
          // Color variation
          let r = color.r;
          let g = color.g;
          let b = color.b;
          
          if (tintColor) {
              // Add variation
              const varG = (random() - 0.5) * 0.2;
              r = tintColor.r;
              g = Math.max(0, Math.min(1, tintColor.g + varG));
              b = tintColor.b;
          }
          
          for (let k = 0; k < 6; k++) {
              normals.push(nx, ny, nz);
              colors.push(r, g, b);
          }
      }
  }

  addCross(x, y, z, positions, normals, colors, uvs, color, blockId, tintColor) {
      // Random height variation based on position
      const pseudoRandom = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
      const heightScale = 0.8 + pseudoRandom * 0.4; // 0.8 to 1.2
      const h = 1.0 * heightScale;
      
      // Offset to center
      const cx = x + 0.5;
      const cz = z + 0.5;
      
      // Width of the grass blade
      const w = 0.5; // Full block width is 1, so 0.5 radius
      
      // Plane 1: (x, z) to (x+1, z+1) -> Diagonal 1
      // Plane 2: (x, z+1) to (x+1, z) -> Diagonal 2
      
      // We need 4 faces (2 per plane, double sided)
      
      // Vertices
      // P1: (x, z)
      // P2: (x+1, z+1)
      // P3: (x, z+1)
      // P4: (x+1, z)
      
      // Bottom Y = y
      // Top Y = y + h
      
      const p = [
          // Plane 1
          [cx - w, y, cz - w],     // 0: BL
          [cx + w, y, cz + w],     // 1: TR
          [cx - w, y + h, cz - w], // 2: TBL
          [cx + w, y + h, cz + w], // 3: TTR
          
          // Plane 2
          [cx - w, y, cz + w],     // 4: TL
          [cx + w, y, cz - w],     // 5: BR
          [cx - w, y + h, cz + w], // 6: TTL
          [cx + w, y + h, cz - w]  // 7: TBR
      ];
      
      // UVs
      // We need to map the texture to the cross planes.
      // Assuming the texture is a full block texture.
      const textureManager = this.game.textureManager;
      let uMin = 0, uMax = 1, vMin = 0, vMax = 1;
      
      if (textureManager && textureManager.atlasTexture) {
          const def = BlockDefinitions[blockId];
          let texName = def.textures.all;
          const uvsRect = textureManager.getUVs(texName);
          if (uvsRect) {
              uMin = uvsRect.uMin;
              uMax = uvsRect.uMax;
              vMin = uvsRect.vMin;
              vMax = uvsRect.vMax;
          }
      }
      
      // Helper to add quad
      const addQuad = (v0, v1, v2, v3, normal) => {
          // Tri 1
          positions.push(p[v0][0], p[v0][1], p[v0][2]);
          positions.push(p[v2][0], p[v2][1], p[v2][2]);
          positions.push(p[v1][0], p[v1][1], p[v1][2]);
          
          uvs.push(uMin, vMin);
          uvs.push(uMin, vMax);
          uvs.push(uMax, vMin);
          
          // Tri 2
          positions.push(p[v1][0], p[v1][1], p[v1][2]);
          positions.push(p[v2][0], p[v2][1], p[v2][2]);
          positions.push(p[v3][0], p[v3][1], p[v3][2]);
          
          uvs.push(uMax, vMin);
          uvs.push(uMin, vMax);
          uvs.push(uMax, vMax);
          
          let r = color.r;
          let g = color.g;
          let b = color.b;

          if (tintColor) {
              r = tintColor.r;
              g = tintColor.g;
              b = tintColor.b;
          }

          for (let k = 0; k < 6; k++) {
              normals.push(normal[0], normal[1], normal[2]);
              colors.push(r, g, b);
          }
      };
      
      // Plane 1 Front
      addQuad(0, 1, 2, 3, [0.707, 0, 0.707]);
      // Plane 1 Back
      addQuad(1, 0, 3, 2, [-0.707, 0, -0.707]);
      
      // Plane 2 Front
      addQuad(4, 5, 6, 7, [0.707, 0, -0.707]);
      // Plane 2 Back
      addQuad(5, 4, 7, 6, [-0.707, 0, 0.707]);
  }

  // Helper: get UV rect for a block's texture
  _getBlockUVs(blockId) {
      const textureManager = this.game.textureManager;
      if (!textureManager || !textureManager.atlasTexture) return { uMin: 0, uMax: 1, vMin: 0, vMax: 1 };
      const def = BlockDefinitions[blockId];
      const texName = def.textures ? (def.textures.all || def.textures.side) : null;
      if (!texName) return { uMin: 0, uMax: 1, vMin: 0, vMax: 1 };
      const rect = textureManager.getUVs(texName);
      return rect || { uMin: 0, uMax: 1, vMin: 0, vMax: 1 };
  }

  // Helper: push a quad (2 triangles) from 4 corner positions
  _addQuad(positions, normals, colors, uvs, v0, v1, v2, v3, normal, uv, r, g, b) {
      // Triangle 1: v0, v1, v2
      positions.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
      uvs.push(uv.uMin, uv.vMin, uv.uMin, uv.vMax, uv.uMax, uv.vMax);
      // Triangle 2: v0, v2, v3
      positions.push(v0[0], v0[1], v0[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
      uvs.push(uv.uMin, uv.vMin, uv.uMax, uv.vMax, uv.uMax, uv.vMin);
      for (let i = 0; i < 6; i++) {
          normals.push(normal[0], normal[1], normal[2]);
          colors.push(r, g, b);
      }
  }

  addSlab(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const uv = this._getBlockUVs(blockId);
      const r = color.r, g = color.g, b = color.b;
      const h = 0.5; // half height

      // Top face
      this._addQuad(positions, normals, colors, uvs,
          [x, y + h, z + 1], [x + 1, y + h, z + 1], [x + 1, y + h, z], [x, y + h, z],
          [0, 1, 0], uv, r, g, b);
      // Bottom face
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1],
          [0, -1, 0], uv, r, g, b);
      // Right (+x)
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z + 1], [x + 1, y + h, z + 1], [x + 1, y + h, z], [x + 1, y, z],
          [1, 0, 0], uv, r, g, b);
      // Left (-x)
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x, y + h, z], [x, y + h, z + 1], [x, y, z + 1],
          [-1, 0, 0], uv, r, g, b);
      // Front (+z)
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z + 1], [x, y + h, z + 1], [x + 1, y + h, z + 1], [x + 1, y, z + 1],
          [0, 0, 1], uv, r, g, b);
      // Back (-z)
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z], [x + 1, y + h, z], [x, y + h, z], [x, y, z],
          [0, 0, -1], uv, r, g, b);
  }

  addStair(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const uv = this._getBlockUVs(blockId);
      const r = color.r, g = color.g, b = color.b;
      // Bottom half (full width, half height)
      // Bottom face
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1],
          [0, -1, 0], uv, r, g, b);
      // Top of bottom half
      this._addQuad(positions, normals, colors, uvs,
          [x, y + 0.5, z + 0.5], [x + 1, y + 0.5, z + 0.5], [x + 1, y + 0.5, z], [x, y + 0.5, z],
          [0, 1, 0], uv, r, g, b);
      // Top half (back half, full height)
      // Top face
      this._addQuad(positions, normals, colors, uvs,
          [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z + 0.5], [x, y + 1, z + 0.5],
          [0, 1, 0], uv, r, g, b);
      // Front face of top step
      this._addQuad(positions, normals, colors, uvs,
          [x, y + 0.5, z + 0.5], [x, y + 1, z + 0.5], [x + 1, y + 1, z + 0.5], [x + 1, y + 0.5, z + 0.5],
          [0, 0, -1], uv, r, g, b);
      // Right face (+x) - full height
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x + 1, y, z],
          [1, 0, 0], uv, r, g, b);
      // Left face (-x) - full height
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1],
          [-1, 0, 0], uv, r, g, b);
      // Back face (+z) - full height
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1],
          [0, 0, 1], uv, r, g, b);
      // Front face bottom half (-z)
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z], [x + 1, y + 0.5, z], [x, y + 0.5, z], [x, y, z],
          [0, 0, -1], uv, r, g, b);
  }

  addFence(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const uv = this._getBlockUVs(blockId);
      const r = color.r, g = color.g, b = color.b;
      // Center post (4x4 pixels = 0.25x0.25)
      const p = 0.375; // post min
      const q = 0.625; // post max

      // Post top
      this._addQuad(positions, normals, colors, uvs,
          [x + p, y + 1, z + q], [x + q, y + 1, z + q], [x + q, y + 1, z + p], [x + p, y + 1, z + p],
          [0, 1, 0], uv, r, g, b);
      // Post bottom
      this._addQuad(positions, normals, colors, uvs,
          [x + p, y, z + p], [x + q, y, z + p], [x + q, y, z + q], [x + p, y, z + q],
          [0, -1, 0], uv, r, g, b);
      // Post +x
      this._addQuad(positions, normals, colors, uvs,
          [x + q, y, z + q], [x + q, y + 1, z + q], [x + q, y + 1, z + p], [x + q, y, z + p],
          [1, 0, 0], uv, r, g, b);
      // Post -x
      this._addQuad(positions, normals, colors, uvs,
          [x + p, y, z + p], [x + p, y + 1, z + p], [x + p, y + 1, z + q], [x + p, y, z + q],
          [-1, 0, 0], uv, r, g, b);
      // Post +z
      this._addQuad(positions, normals, colors, uvs,
          [x + p, y, z + q], [x + p, y + 1, z + q], [x + q, y + 1, z + q], [x + q, y, z + q],
          [0, 0, 1], uv, r, g, b);
      // Post -z
      this._addQuad(positions, normals, colors, uvs,
          [x + q, y, z + p], [x + q, y + 1, z + p], [x + p, y + 1, z + p], [x + p, y, z + p],
          [0, 0, -1], uv, r, g, b);

      // Connection bars to adjacent fences/solid blocks
      const world = this.world;
      const wx = this.x * this.size + x;
      const wz = this.z * this.size + z;
      const barH1 = 0.375, barH2 = 0.5625; // lower bar
      const barH3 = 0.75, barH4 = 0.9375;  // upper bar
      const barW = 2 / 16; // bar thickness

      const neighbors = [
          { dx: 1, dz: 0, axis: 'x' },
          { dx: -1, dz: 0, axis: 'x' },
          { dx: 0, dz: 1, axis: 'z' },
          { dx: 0, dz: -1, axis: 'z' },
      ];

      for (const nb of neighbors) {
          const nbBlock = world.getBlock(wx + nb.dx, y, wz + nb.dz);
          if (nbBlock === BlockType.AIR) continue;
          const nbDef = BlockDefinitions[nbBlock];
          if (!nbDef) continue;
          // Connect to fences or solid cubes
          const isFenceNb = nbDef.model === BlockModels.FENCE;
          const isSolidNb = nbDef.model === BlockModels.CUBE && !nbDef.transparent;
          if (!isFenceNb && !isSolidNb) continue;

          // Draw 2 horizontal bars
          for (const [bH1, bH2] of [[barH1, barH2], [barH3, barH4]]) {
              if (nb.axis === 'x') {
                  const x0 = nb.dx > 0 ? x + q : x;
                  const x1 = nb.dx > 0 ? x + 1 : x + p;
                  // Top/Bottom
                  this._addQuad(positions, normals, colors, uvs,
                      [x0, y + bH2, z + 0.5 + barW], [x1, y + bH2, z + 0.5 + barW], [x1, y + bH2, z + 0.5 - barW], [x0, y + bH2, z + 0.5 - barW],
                      [0, 1, 0], uv, r, g, b);
                  this._addQuad(positions, normals, colors, uvs,
                      [x0, y + bH1, z + 0.5 - barW], [x1, y + bH1, z + 0.5 - barW], [x1, y + bH1, z + 0.5 + barW], [x0, y + bH1, z + 0.5 + barW],
                      [0, -1, 0], uv, r, g, b);
                  // +z/-z sides
                  this._addQuad(positions, normals, colors, uvs,
                      [x0, y + bH1, z + 0.5 + barW], [x0, y + bH2, z + 0.5 + barW], [x1, y + bH2, z + 0.5 + barW], [x1, y + bH1, z + 0.5 + barW],
                      [0, 0, 1], uv, r, g, b);
                  this._addQuad(positions, normals, colors, uvs,
                      [x1, y + bH1, z + 0.5 - barW], [x1, y + bH2, z + 0.5 - barW], [x0, y + bH2, z + 0.5 - barW], [x0, y + bH1, z + 0.5 - barW],
                      [0, 0, -1], uv, r, g, b);
              } else {
                  const z0 = nb.dz > 0 ? z + q : z;
                  const z1 = nb.dz > 0 ? z + 1 : z + p;
                  // Top/Bottom
                  this._addQuad(positions, normals, colors, uvs,
                      [x + 0.5 - barW, y + bH2, z0], [x + 0.5 + barW, y + bH2, z0], [x + 0.5 + barW, y + bH2, z1], [x + 0.5 - barW, y + bH2, z1],
                      [0, 1, 0], uv, r, g, b);
                  this._addQuad(positions, normals, colors, uvs,
                      [x + 0.5 - barW, y + bH1, z1], [x + 0.5 + barW, y + bH1, z1], [x + 0.5 + barW, y + bH1, z0], [x + 0.5 - barW, y + bH1, z0],
                      [0, -1, 0], uv, r, g, b);
                  // +x/-x sides
                  this._addQuad(positions, normals, colors, uvs,
                      [x + 0.5 + barW, y + bH1, z0], [x + 0.5 + barW, y + bH2, z0], [x + 0.5 + barW, y + bH2, z1], [x + 0.5 + barW, y + bH1, z1],
                      [1, 0, 0], uv, r, g, b);
                  this._addQuad(positions, normals, colors, uvs,
                      [x + 0.5 - barW, y + bH1, z1], [x + 0.5 - barW, y + bH2, z1], [x + 0.5 - barW, y + bH2, z0], [x + 0.5 - barW, y + bH1, z0],
                      [-1, 0, 0], uv, r, g, b);
              }
          }
      }
  }

  addDoor(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const uv = this._getBlockUVs(blockId);
      const r = color.r, g = color.g, b = color.b;
      const t = 3 / 16; // door thickness

      // Door is a thin slab on the -z edge of the block
      // Front (+z)
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z + t], [x, y + 1, z + t], [x + 1, y + 1, z + t], [x + 1, y, z + t],
          [0, 0, 1], uv, r, g, b);
      // Back (-z)
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z], [x, y, z],
          [0, 0, -1], uv, r, g, b);
      // Top
      this._addQuad(positions, normals, colors, uvs,
          [x, y + 1, z + t], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + t],
          [0, 1, 0], uv, r, g, b);
      // Bottom
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x, y, z + t], [x + 1, y, z + t], [x + 1, y, z],
          [0, -1, 0], uv, r, g, b);
      // Right (+x)
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z + t], [x + 1, y + 1, z + t], [x + 1, y + 1, z], [x + 1, y, z],
          [1, 0, 0], uv, r, g, b);
      // Left (-x)
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x, y + 1, z], [x, y + 1, z + t], [x, y, z + t],
          [-1, 0, 0], uv, r, g, b);
  }

  addTrapdoor(x, y, z, positions, normals, colors, uvs, color, blockId) {
      const uv = this._getBlockUVs(blockId);
      const r = color.r, g = color.g, b = color.b;
      const t = 3 / 16; // trapdoor thickness

      // Flat at bottom of block space (closed position)
      // Top
      this._addQuad(positions, normals, colors, uvs,
          [x, y + t, z + 1], [x + 1, y + t, z + 1], [x + 1, y + t, z], [x, y + t, z],
          [0, 1, 0], uv, r, g, b);
      // Bottom
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1],
          [0, -1, 0], uv, r, g, b);
      // +x
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z + 1], [x + 1, y + t, z + 1], [x + 1, y + t, z], [x + 1, y, z],
          [1, 0, 0], uv, r, g, b);
      // -x
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z], [x, y + t, z], [x, y + t, z + 1], [x, y, z + 1],
          [-1, 0, 0], uv, r, g, b);
      // +z
      this._addQuad(positions, normals, colors, uvs,
          [x, y, z + 1], [x, y + t, z + 1], [x + 1, y + t, z + 1], [x + 1, y, z + 1],
          [0, 0, 1], uv, r, g, b);
      // -z
      this._addQuad(positions, normals, colors, uvs,
          [x + 1, y, z], [x + 1, y + t, z], [x, y + t, z], [x, y, z],
          [0, 0, -1], uv, r, g, b);
  }
}
