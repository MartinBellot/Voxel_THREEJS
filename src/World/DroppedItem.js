import * as THREE from 'three';
import { BlockDefinitions } from './Block.js';

export class DroppedItem {
  constructor(game, x, y, z, blockType) {
    this.game = game;
    this.blockType = blockType;
    this.position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
    this.creationTime = performance.now();
    
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.game.scene.add(this.mesh);
    
    this.rotationSpeed = 2.0;
    this.bobSpeed = 3.0;
    this.bobHeight = 0.15;
    
    this.isCollected = false;
    
    // Physics
    this.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4.0, // Random X pop
        5.0,                         // Upward pop
        (Math.random() - 0.5) * 4.0  // Random Z pop
    );
    this.gravity = -32.0; // Match player gravity
    this.onGround = false;
    this.initialY = this.position.y;
    
    this.lifespan = 20 * 60 * 1000; // 20 minutes
  }

  createMesh() {
    const def = BlockDefinitions[this.blockType];
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    
    let material;
    
    if (this.game.textureManager && this.game.textureManager.atlasTexture) {
        material = new THREE.MeshLambertMaterial({ 
            map: this.game.textureManager.atlasTexture,
            transparent: def.transparent || false,
            opacity: def.opacity || 1.0,
            alphaTest: 0.1
        });
        
        this.updateUVs(geometry, def);
    } else {
        material = new THREE.MeshLambertMaterial({ color: def.color || 0xffffff });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  updateUVs(geometry, def) {
      if (!def.textures) return;
      
      const uvAttribute = geometry.attributes.uv;
      
      // Order of faces in BoxGeometry: right, left, top, bottom, front, back
      const faces = ['side', 'side', 'top', 'bottom', 'side', 'side'];
      if (def.textures.all) {
          faces.fill('all');
      }
      
      const getTextureName = (faceIndex) => {
          const faceType = faces[faceIndex];
          if (faceType === 'all') return def.textures.all;
          return def.textures[faceType] || def.textures.all;
      };

      for (let i = 0; i < 6; i++) {
          const textureName = getTextureName(i);
          if (!textureName) continue;
          
          const uvs = this.game.textureManager.getUVs(textureName);
          if (!uvs) continue;
          
          const baseIndex = i * 4;
          
          // BoxGeometry UVs are typically: (0,1), (1,1), (0,0), (1,0)
          // We map them to our atlas UVs
          
          // Top Left (0, 1) -> (uMin, vMax)
          uvAttribute.setXY(baseIndex + 0, uvs.uMin, uvs.vMax);
          // Top Right (1, 1) -> (uMax, vMax)
          uvAttribute.setXY(baseIndex + 1, uvs.uMax, uvs.vMax);
          // Bottom Left (0, 0) -> (uMin, vMin)
          uvAttribute.setXY(baseIndex + 2, uvs.uMin, uvs.vMin);
          // Bottom Right (1, 0) -> (uMax, vMin)
          uvAttribute.setXY(baseIndex + 3, uvs.uMax, uvs.vMin);
      }
      
      uvAttribute.needsUpdate = true;
  }

  update(delta, playerPosition) {
    if (this.isCollected) return;

    // Lifespan check
    if (performance.now() - this.creationTime > this.lifespan) {
        this.remove();
        return;
    }

    // Always apply gravity unless we are resting on a block
    this.velocity.y += this.gravity * delta;
    
    // Apply drag
    this.velocity.x *= 0.95;
    this.velocity.z *= 0.95;

    const moveStep = this.velocity.clone().multiplyScalar(delta);
    
    // Use base position for physics checks (ignoring bobbing)
    let checkY = this.mesh.position.y;
    if (this.onGround) {
        checkY = this.initialY;
    }

    const nextX = this.mesh.position.x + moveStep.x;
    const nextY = checkY + moveStep.y;
    const nextZ = this.mesh.position.z + moveStep.z;
    
    // Check collision with ground
    const x = Math.floor(nextX);
    const y = Math.floor(nextY - 0.15); // Check slightly below center
    const z = Math.floor(nextZ);
    
    const blockBelow = this.game.world.getBlock(x, y, z);
    
    if (blockBelow !== 0 && blockBelow !== undefined && this.velocity.y < 0) {
         // Hit ground
         this.onGround = true;
         this.velocity.y = 0;
         this.velocity.x *= 0.5; // Ground friction
         this.velocity.z *= 0.5;
         
         // Snap to top of block
         this.initialY = y + 1 + 0.15;
         this.mesh.position.x = nextX;
         this.mesh.position.z = nextZ;
         
         // Apply bobbing
         const time = (performance.now() - this.creationTime) / 1000;
         this.mesh.position.y = this.initialY + Math.sin(time * this.bobSpeed) * this.bobHeight;
    } else {
         this.onGround = false;
         this.mesh.position.x = nextX;
         this.mesh.position.y = nextY;
         this.mesh.position.z = nextZ;
    }

    this.mesh.rotation.y += this.rotationSpeed * delta;

    // Check pickup
    const dist = this.mesh.position.distanceTo(playerPosition);
    if (dist < 2.0) {
        this.collect();
    }
  }

  remove() {
      this.isCollected = true;
      this.game.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
  }

  collect() {
    this.remove();
    const added = this.game.player.inventory.addItem(this.blockType, 1);
    if (added) {
        this.game.player.inventoryUI.updateHotbar();
        if (this.game.player.inventoryUI.isOpen) {
            this.game.player.inventoryUI.updateSlots();
        }
    }
  }
}
