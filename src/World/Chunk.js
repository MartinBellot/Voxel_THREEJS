import * as THREE from 'three';
import { BlockType, BlockDefinitions, BlockModels } from './Block.js';

const Geometries = {
  [BlockModels.CUBE]: new THREE.BoxGeometry(1, 1, 1),
  [BlockModels.TORCH]: new THREE.BoxGeometry(0.15, 0.6, 0.15)
};

// Adjust Torch geometry to sit on the ground
Geometries[BlockModels.TORCH].translate(0, -0.2, 0);

export class Chunk {
  constructor(game, world, x, z) {
    this.game = game;
    this.world = world;
    this.x = x;
    this.z = z;
    this.size = 16;
    this.height = this.world.chunkHeight;
    this.data = []; // Stocke les IDs des blocs
    this.meshes = {}; // Map of model -> InstancedMesh
    this.lod = 0; // 0 = High, 1 = Low
    
    this.generateData();
    this.generateMesh();
  }

  isBlockOpaque(id) {
    if (id === BlockType.AIR || id === BlockType.WATER || id === BlockType.TORCH || id === BlockType.CACTUS || id === BlockType.LEAVES || id === BlockType.PINE_LEAVES) return false;
    return true;
  }

  isBlockObscured(x, y, z) {
    // Right
    if (x + 1 < this.size) {
        if (!this.isBlockOpaque(this.data[(x + 1) + this.size * (y + this.height * z)])) return false;
    } else {
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x + 1, y, this.z * this.size + z))) return false;
    }
    
    // Left
    if (x - 1 >= 0) {
        if (!this.isBlockOpaque(this.data[(x - 1) + this.size * (y + this.height * z)])) return false;
    } else {
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x - 1, y, this.z * this.size + z))) return false;
    }
    
    // Up
    if (y + 1 < this.height) {
        if (!this.isBlockOpaque(this.data[x + this.size * ((y + 1) + this.height * z)])) return false;
    } else {
        // Check world height limit or assume air above
        if (y + 1 >= this.world.chunkHeight) return false; // Always visible from top
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x, y + 1, this.z * this.size + z))) return false;
    }
    
    // Down
    if (y - 1 >= 0) {
        if (!this.isBlockOpaque(this.data[x + this.size * ((y - 1) + this.height * z)])) return false;
    } else {
        if (y - 1 < 0) return true; // Bottom of world is obscured (or void)
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x, y - 1, this.z * this.size + z))) return false;
    }
    
    // Front
    if (z + 1 < this.size) {
        if (!this.isBlockOpaque(this.data[x + this.size * (y + this.height * (z + 1))])) return false;
    } else {
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x, y, this.z * this.size + z + 1))) return false;
    }
    
    // Back
    if (z - 1 >= 0) {
        if (!this.isBlockOpaque(this.data[x + this.size * (y + this.height * (z - 1))])) return false;
    } else {
        if (!this.isBlockOpaque(this.world.getBlock(this.x * this.size + x, y, this.z * this.size + z - 1))) return false;
    }

    return true;
  }

  setLOD(level) {
      if (this.lod === level) return;
      this.lod = level;
      this.updateMesh();
  }

  generateData() {
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
        
        // Arbres : probabilité basée sur le bruit
        const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
        const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
        
        let hasTree = false;
        let hasCactus = false;

        if (biome === 'Pine Forest') {
            hasTree = treeNoise > 0.4 && pseudoRandom > 0.85; // Plus dense
        } else if (biome === 'Desert') {
            hasCactus = treeNoise > 0.5 && pseudoRandom > 0.95; // Rare
        }

        for (let y = 0; y < this.height; y++) {
          const index = this.getBlockIndex(x, y, z);
          
          if (y === 0) {
            this.data[index] = BlockType.BEDROCK;
          } else if (y < surfaceHeight) {
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
               } else if (biome === 'Mushroom') {
                   if (y === surfaceHeight - 1) {
                       this.data[index] = BlockType.MYCELIUM;
                   } else {
                       this.data[index] = BlockType.DIRT;
                   }
               } else if (biome === 'Mountain') {
                   if (y === surfaceHeight - 1) {
                       if (y > 45) {
                           this.data[index] = BlockType.SNOW;
                       } else {
                           this.data[index] = BlockType.STONE;
                       }
                   } else if (y > surfaceHeight - 4) {
                       this.data[index] = BlockType.STONE;
                   } else {
                       this.data[index] = BlockType.STONE;
                   }
               } else {
                   if (y === surfaceHeight - 1) {
                     this.data[index] = BlockType.GRASS;
                   } else if (y > surfaceHeight - 4) {
                     this.data[index] = BlockType.DIRT;
                   } else {
                     this.data[index] = BlockType.STONE;
                   }
               }
             }
          } else {
            // Au dessus de la surface
            if (hasTree && y >= surfaceHeight && y < surfaceHeight + 7) {
                // Tronc de sapin (plus haut)
                if (y < surfaceHeight + 6) {
                    this.data[index] = BlockType.LOG;
                } else {
                    this.data[index] = BlockType.PINE_LEAVES; // Sommet
                }
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

  decorateChunk() {
    for (let x = 0; x < this.size; x++) {
        for (let z = 0; z < this.size; z++) {
            const worldX = this.x * this.size + x;
            const worldZ = this.z * this.size + z;
            const surfaceHeight = this.world.getHeight(worldX, worldZ);
            const biome = this.world.getBiome(worldX, worldZ);
            
            if (biome === 'Pine Forest') {
                const treeNoise = this.world.noise2D(worldX * 0.1, worldZ * 0.1);
                const pseudoRandom = Math.abs(Math.sin(worldX * 12.9898 + worldZ * 78.233) * 43758.5453) % 1;
                const hasTree = treeNoise > 0.4 && pseudoRandom > 0.85;

                if (hasTree) {
                    // Sapin : forme conique
                    // Base des feuilles
                    this.addLeaves(x, surfaceHeight + 3, z, 2, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 4, z, 2, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 5, z, 1, BlockType.PINE_LEAVES);
                    this.addLeaves(x, surfaceHeight + 6, z, 1, BlockType.PINE_LEAVES);
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

  getBlock(x, y, z) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return BlockType.AIR; // Hors du chunk
    }
    return this.data[this.getBlockIndex(x, y, z)];
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
      mesh.material.dispose();
    });
    this.meshes = {};

    if (this.waterMesh) {
      this.game.scene.remove(this.waterMesh);
      this.waterMesh.material.dispose();
      this.waterMesh = null;
    }
    this.generateMesh();
  }

  generateMesh() {
    const counts = {};
    let waterCount = 0;
    
    // Pre-calculate visible blocks to avoid doing it twice (count + fill)
    // Or just do it in the loops.
    // For LOD 1, we only want the top blocks.
    
    const visibleBlocks = []; // {x, y, z, blockId, model}

    if (this.lod === 1) {
        // Low Detail: All visible blocks, single mesh
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockId = this.data[this.getBlockIndex(x, y, z)];
                    if (blockId === BlockType.AIR) continue;

                    if (blockId === BlockType.WATER) {
                        if (this.isBlockObscured(x, y, z)) continue;
                        waterCount++;
                    } else {
                        if (this.isBlockObscured(x, y, z)) continue;
                        
                        const def = BlockDefinitions[blockId];
                        const model = def.model || BlockModels.CUBE;
                        visibleBlocks.push({x, y, z, blockId, model});
                    }
                }
            }
        }
    } else {
        // High Detail: All visible blocks
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockId = this.data[this.getBlockIndex(x, y, z)];
                    if (blockId === BlockType.AIR) continue;

                    if (blockId === BlockType.WATER) {
                        // Water is special, handled separately usually, but here we count it
                        // Water is usually not culled by itself but we can check if surrounded by water
                        // For now, keep water logic simple or apply culling too?
                        // Let's apply culling to water too (if surrounded by water/solid, don't render)
                        // But water needs to see through water surface... 
                        // Simple check: if block above is water, don't render top face? 
                        // For InstancedMesh (cubes), we render the whole cube.
                        // If surrounded by solids/water, we can hide it.
                        if (this.isBlockObscured(x, y, z)) continue;
                        waterCount++;
                    } else {
                        if (this.isBlockObscured(x, y, z)) continue;
                        
                        const def = BlockDefinitions[blockId];
                        const model = def.model || BlockModels.CUBE;
                        visibleBlocks.push({x, y, z, blockId, model});
                        counts[model] = (counts[model] || 0) + 1;
                    }
                }
            }
        }
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

        // Create Meshes for Solids
    if (this.lod === 1) {
        // LOD 1: Single InstancedMesh for everything (using colors)
        const count = visibleBlocks.length;
        if (count > 0) {
            const geometry = Geometries[BlockModels.CUBE];
            const material = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White, tinted by instanceColor
            
            const mesh = new THREE.InstancedMesh(geometry, material, count);
            mesh.castShadow = false; // Disable shadow casting for far chunks to save perf
            mesh.receiveShadow = false;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
            mesh.position.set(this.x * this.size, 0, this.z * this.size);
            mesh.frustumCulled = true; // Enable culling for far chunks

            this.meshes['LOD1'] = mesh;
            this.game.scene.add(mesh);
            
            // Fill
            let index = 0;
            for (const block of visibleBlocks) {
                const {x, y, z, blockId} = block;
                
                dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
                dummy.updateMatrix();

                const def = BlockDefinitions[blockId];
                color.setHex(def.color);

                mesh.setMatrixAt(index, dummy.matrix);
                mesh.setColorAt(index, color);
                index++;
            }
        }
    } else {
        // LOD 0: High Detail (Multiple InstancedMeshes with textures/models)
        for (const [model, count] of Object.entries(counts)) {
          if (count === 0) continue;

          const geometry = Geometries[model] || Geometries[BlockModels.CUBE];
          let material;
          
          if (model === BlockModels.TORCH) {
            material = new THREE.MeshLambertMaterial({ 
              color: 0xffffff,
              emissive: 0xFFD700,
              emissiveIntensity: 0.5
            });
          } else {
            material = new THREE.MeshLambertMaterial({ color: 0xffffff });
          }
          
          const mesh = new THREE.InstancedMesh(geometry, material, count);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
          mesh.position.set(this.x * this.size, 0, this.z * this.size);
          mesh.frustumCulled = false;

          this.meshes[model] = mesh;
          this.game.scene.add(mesh);
        }
        
        // Fill Meshes (LOD 0)
        const indices = {}; 
        for (const block of visibleBlocks) {
            const {x, y, z, blockId, model} = block;
            
            dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
            dummy.updateMatrix();

            const def = BlockDefinitions[blockId];
            color.setHex(def.color);

            const mesh = this.meshes[model];
            const index = indices[model] || 0;
            
            mesh.setMatrixAt(index, dummy.matrix);
            mesh.setColorAt(index, color);
            
            indices[model] = index + 1;
        }
    }

    // Create Water Mesh (Only for High Detail or if we want water in LOD)
    // For LOD 1, we skipped water in the loop above (break on non-air). 
    // If we want water in LOD 1, we need to handle it.
    // Let's say LOD 1 doesn't render water separately for now to save draw calls, 
    // OR we treat water as a block in visibleBlocks if it's the top block.
    // In my LOD 1 loop: if (blockId !== BlockType.AIR && blockId !== BlockType.WATER)
    // So water is ignored in LOD 1. Let's fix that if we want to see oceans.
    // But waterMesh is separate.
    
    if (waterCount > 0) {
        const geometry = Geometries[BlockModels.CUBE];
        const waterMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.FrontSide
        });
        this.waterMesh = new THREE.InstancedMesh(geometry, waterMaterial, waterCount);
        this.waterMesh.castShadow = false;
        this.waterMesh.receiveShadow = true;
        this.waterMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.waterMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(waterCount * 3), 3);
        this.waterMesh.position.set(this.x * this.size, 0, this.z * this.size);
        this.waterMesh.frustumCulled = false;
        this.game.scene.add(this.waterMesh);
    }

    // Fill Water
    let waterIndex = 0;
    if (waterCount > 0) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const blockId = this.data[this.getBlockIndex(x, y, z)];
                    if (blockId === BlockType.WATER) {
                        if (this.isBlockObscured(x, y, z)) continue;
                        
                        dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
                        dummy.updateMatrix();
                        
                        const def = BlockDefinitions[blockId];
                        color.setHex(def.color);
                        
                        this.waterMesh.setMatrixAt(waterIndex, dummy.matrix);
                        this.waterMesh.setColorAt(waterIndex, color);
                        waterIndex++;
                    }
                }
            }
        }
    }
  }
}
