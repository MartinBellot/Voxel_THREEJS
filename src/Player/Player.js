import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import nipplejs from 'nipplejs';
import { Physics } from './Physics.js';
import { BlockType } from '../World/Block.js';
import { Inventory } from '../Inventory.js';
import { InventoryUI } from '../InventoryUI.js';
import { ItemDefinitions, ItemType } from '../Item.js';
import { DroppedItem } from '../World/DroppedItem.js';
import { HeldItem } from './HeldItem.js';
import { PlayerMesh } from './PlayerMesh.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.camera.rotation.order = 'YXZ';
    
    this.playerMesh = new PlayerMesh(this.game.scene);
    this.game.scene.add(this.playerMesh.mesh);
    this.playerMesh.mesh.visible = false;
    this.isThirdPerson = false;
    this.eyePosition = new THREE.Vector3();
    this.isCameraOffset = false;

    // Virtual object for controls (Head Rotation)
    this.controlsObject = new THREE.Object3D();
    this.controlsObject.rotation.order = 'YXZ';
    this.controls = new PointerLockControls(this.controlsObject, document.body);
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.isSprinting = false;
    this.canJump = false;
    this.flyMode = false;
    this.lastSpacePressTime = 0;
    
    this.speed = 6.0;
    this.sprintSpeed = 10.0;
    this.flySpeed = 15.0;
    
    this.physics = new Physics(this);
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 5; // Portée d'interaction
    
    this.inventory = new Inventory();
    this.inventoryUI = new InventoryUI(this.game, this.inventory);
    
    this.heldItem = new HeldItem(this.game, this);
    this.lastSelectedSlot = -1;
    this.lastItemType = null;
    this.lastItemCount = -1;

    this.setupInputs();
    this.setupHighlight();
    
    // Mobile Check
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
        this.setupMobileControls();
    }
    
    // Position initiale
    this.camera.position.set(0, 80, 0); // Plus haut pour éviter de spawner dans le sol
    
    this.lastNetworkUpdate = 0;
  }

  setupHighlight() {
    const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.highlightMesh = new THREE.LineSegments(edges, material);
    this.highlightMesh.visible = false;
    this.game.scene.add(this.highlightMesh);
  }

  // setupUI removed - handled by InventoryUI

  setupMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'block';

    // Joystick
    const zone = document.getElementById('joystick-zone');
    if (zone) {
        const manager = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white'
        });

        manager.on('move', (evt, data) => {
            const rad = data.angle.radian;
            const x = Math.cos(rad);
            const y = Math.sin(rad);
            
            // Threshold to determine direction
            this.moveForward = y > 0.3;
            this.moveBackward = y < -0.3;
            this.moveRight = x > 0.3; // Joystick Right is Move Right
            this.moveLeft = x < -0.3;
        });

        manager.on('end', () => {
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
        });
    }

    // Buttons
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.flyMode) {
                this.moveUp = true;
            } else if (this.physics.inWater) {
                this.canJump = true;
            } else if (this.canJump) {
                this.velocity.y = 9.0;
                this.canJump = false;
            }
        });
        btnJump.addEventListener('touchend', (e) => {
             e.preventDefault();
             this.moveUp = false;
        });
    }

    const btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.placeBlock();
        });
    }

    // Console Toggle
    const btnConsole = document.getElementById('btn-console-toggle');
    if (btnConsole) {
        btnConsole.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.console) {
                if (this.game.console.isOpen) {
                    this.game.console.close();
                } else {
                    this.game.console.open();
                }
            }
        });
    }

    // Inventory Toggle
    const btnInventory = document.getElementById('btn-inventory-toggle');
    if (btnInventory) {
        btnInventory.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.inventoryUI.toggle();
        });
    }

    // Touch Look
    let lastTouchX = 0;
    let lastTouchY = 0;
    
    document.addEventListener('touchstart', (e) => {
        // Ignore if touching joystick or buttons
        if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
        
        if (e.touches.length > 0) {
            lastTouchX = e.touches[0].pageX;
            lastTouchY = e.touches[0].pageY;
            this.touchStartTime = Date.now();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
        
        if (e.touches.length > 0) {
            const touchX = e.touches[0].pageX;
            const touchY = e.touches[0].pageY;
            
            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;
            
            // Sensitivity
            const sensitivity = 0.005;
            
            this.camera.rotation.y -= deltaX * sensitivity;
            this.camera.rotation.x -= deltaY * sensitivity;
            
            // Clamp pitch
            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            
            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
         if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
         
         // Detect tap for breaking block
         const touchDuration = Date.now() - this.touchStartTime;
         if (touchDuration < 200) { // Short tap
             this.breakBlock();
         }
    });
  }

  setupInputs() {
    this.controls.addEventListener('lock', () => {
      if (this.game.pauseMenu) this.game.pauseMenu.hide();
      if (this.inventoryUI.isOpen) this.inventoryUI.toggle(); // Close inventory if we lock (e.g. clicking back in game)
    });

    this.controls.addEventListener('unlock', () => {
      // Only show pause menu if we are playing and not in inventory/console
      if (this.game.isPlaying && !this.inventoryUI.isOpen && (!this.game.console || !this.game.console.isOpen)) {
        if (this.game.pauseMenu) this.game.pauseMenu.show();
      }
    });

    // Handle Escape key manually if Keyboard Lock is active
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape') {
            if (this.game.isPlaying && !this.inventoryUI.isOpen && (!this.game.console || !this.game.console.isOpen)) {
                // If menu is not visible, show it and unlock cursor
                if (this.game.pauseMenu && !this.game.pauseMenu.isVisible) {
                    this.game.pauseMenu.show();
                    this.controls.unlock();
                }
            }
        }
    });

    document.addEventListener('mousedown', (event) => {
      if (this.controls.isLocked && !this.inventoryUI.isOpen) {
        if (event.button === 0) { // Clic gauche
          this.breakBlock();
        } else if (event.button === 2) { // Clic droit
          this.placeBlock();
        }
      }
    });

    // Mouse Wheel for Hotbar
    document.addEventListener('wheel', (event) => {
      if (this.controls.isLocked) {
        if (event.deltaY > 0) {
          this.inventory.selectedSlot = (this.inventory.selectedSlot + 1) % 9;
        } else {
          this.inventory.selectedSlot = (this.inventory.selectedSlot - 1 + 9) % 9;
        }
        this.inventoryUI.updateHotbar();
      }
    });

    const onKeyDown = (event) => {
      // Handle Hotbar Selection 1-9
      if (event.code.startsWith('Digit') && event.code !== 'Digit0') {
        const slotIndex = parseInt(event.key) - 1;
        if (slotIndex >= 0 && slotIndex < 9) {
          this.inventory.selectedSlot = slotIndex;
          this.inventoryUI.updateHotbar();
        }
        return;
      }

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
        case 'KeyP':
          this.isThirdPerson = !this.isThirdPerson;
          this.playerMesh.mesh.visible = this.isThirdPerson;
          this.heldItem.mesh.visible = !this.isThirdPerson;
          if (!this.isThirdPerson && this.isCameraOffset) {
              this.camera.position.copy(this.eyePosition);
              this.isCameraOffset = false;
          }
          break;
        case 'Space':
          const now = Date.now();
          if (now - this.lastSpacePressTime < 300) {
            this.flyMode = !this.flyMode;
            this.lastSpacePressTime = 0;
            if (this.flyMode) {
                this.velocity.y = 0;
            }
          } else {
            this.lastSpacePressTime = now;
          }

          if (this.flyMode) {
            this.moveUp = true;
          } else if (this.physics.inWater) {
              this.canJump = true; // Allow swimming up
          } else if (this.canJump) {
            this.velocity.y = 9.0;
            this.canJump = false;
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (this.flyMode) {
            this.moveDown = true;
          }
          this.isSprinting = true;
          break;
        case 'Escape':
          if (this.inventoryUI.isOpen) {
            this.inventoryUI.toggle();
          }
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
        case 'Space':
          this.moveUp = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.moveDown = false;
          this.isSprinting = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  getIntersection() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    // On récupère tous les meshes de chunks (uniquement les solides)
    const meshes = [];
    this.game.world.chunks.forEach(chunk => {
      if (chunk.meshes) {
        Object.values(chunk.meshes).forEach(mesh => meshes.push(mesh));
      }
    });
    
    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      return intersects[0];
    }
    return null;
  }

  breakBlock() {
    if (this.highlightMesh.visible) {
      const position = this.highlightMesh.position;
      const x = Math.floor(position.x);
      const y = Math.floor(position.y);
      const z = Math.floor(position.z);
      
      // Get block type before removing
      const blockType = this.game.world.getBlock(x, y, z);

      this.game.world.setBlock(x, y, z, BlockType.AIR);
      
      // Drop item
      if (blockType && blockType !== BlockType.AIR) {
          const item = new DroppedItem(this.game, x, y, z, blockType);
          this.game.droppedItems.push(item);
      }

      if (this.game.networkManager && this.game.networkManager.connected) {
          this.game.networkManager.sendBlockUpdate(x, y, z, BlockType.AIR);
      }
    }
  }

  placeBlock() {
    if (this.highlightMesh.visible) {
      const intersection = this.getIntersection();
      if (intersection) {
        const point = intersection.point;
        const normal = intersection.face.normal;
        
        // On calcule la position du bloc adjacent
        // Comme on a décalé les blocs de 0.5, ils sont centrés sur x.5
        // Le highlight est centré sur x.5
        // On veut trouver le centre du bloc adjacent
        
        const target = point.clone().add(normal.clone().multiplyScalar(0.5));
        const x = Math.floor(target.x);
        const y = Math.floor(target.y);
        const z = Math.floor(target.z);
        
        // Check for Spawn Pig
        const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
        if (selectedItem && selectedItem.type === ItemType.SPAWN_PIG) {
            // Spawn Pig
            // Center of the block
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('pig', spawnPos);
            return;
        }

        // Vérification de collision avec le joueur
        const playerPos = this.camera.position;
        const playerWidth = this.physics.width;
        const playerHeight = this.physics.height;
        const playerDepth = this.physics.depth;
        const eyeHeight = 1.6; // Doit correspondre à Physics.js

        const playerMinX = playerPos.x - playerWidth / 2;
        const playerMaxX = playerPos.x + playerWidth / 2;
        const playerMinY = playerPos.y - eyeHeight;
        const playerMaxY = playerPos.y - eyeHeight + playerHeight;
        const playerMinZ = playerPos.z - playerDepth / 2;
        const playerMaxZ = playerPos.z + playerDepth / 2;

        const blockMinX = x;
        const blockMaxX = x + 1;
        const blockMinY = y;
        const blockMaxY = y + 1;
        const blockMinZ = z;
        const blockMaxZ = z + 1;

        // Test AABB (Axis-Aligned Bounding Box)
        if (playerMinX < blockMaxX && playerMaxX > blockMinX &&
            playerMinY < blockMaxY && playerMaxY > blockMinY &&
            playerMinZ < blockMaxZ && playerMaxZ > blockMinZ) {
          return; // Le joueur est dans le bloc, on ne pose pas
        }

        const blockType = this.inventory.getSelectedBlockType(ItemDefinitions);
        const itemDef = ItemDefinitions[this.inventory.getItem(this.inventory.selectedSlot)?.type];
        
        if (blockType && itemDef && itemDef.isPlaceable) {
          this.game.world.setBlock(x, y, z, blockType);
          
          if (this.game.networkManager && this.game.networkManager.connected) {
              this.game.networkManager.sendBlockUpdate(x, y, z, blockType);
          }
          
          // Consume item
          this.inventory.removeItem(this.inventory.selectedSlot, 1);
          this.inventoryUI.updateHotbar();
          if (this.inventoryUI.isOpen) {
              this.inventoryUI.updateSlots();
          }
        }
      }
    }
  }

  updateHighlight() {
    const intersection = this.getIntersection();
    if (intersection) {
      const point = intersection.point;
      const normal = intersection.face.normal;
      
      // On recule un peu pour être dans le bloc visé
      const target = point.clone().add(normal.clone().multiplyScalar(-0.1));
      
      const x = Math.floor(target.x);
      const y = Math.floor(target.y);
      const z = Math.floor(target.z);
      
      this.highlightMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.highlightMesh.visible = true;
      this.lookingAtBlock = { x, y, z };
    } else {
      this.highlightMesh.visible = false;
      this.lookingAtBlock = null;
    }
  }

  update(delta) {
    // Restore camera position for physics/logic
    if (this.isCameraOffset) {
        this.camera.position.copy(this.eyePosition);
        this.isCameraOffset = false;
    }

    // Sync camera rotation with controls if in 1st person
    // In 3rd person, we'll override it later, but we need the "Head" rotation for logic
    // Actually, let's just use controlsObject for logic.

    this.updateHighlight();

    // Update Held Item
    const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
    const currentItemType = selectedItem ? selectedItem.type : null;
    const currentItemCount = selectedItem ? selectedItem.count : 0;

    if (this.inventory.selectedSlot !== this.lastSelectedSlot || 
        currentItemType !== this.lastItemType ||
        currentItemCount !== this.lastItemCount) {
        
        this.heldItem.setItem(currentItemType);
        
        this.lastSelectedSlot = this.inventory.selectedSlot;
        this.lastItemType = currentItemType;
        this.lastItemCount = currentItemCount;
    }
    
    this.heldItem.update(delta);

    if (this.controls.isLocked === true || this.isMobile) {
      
      // FOV Effect for sprinting
      const targetFOV = this.isSprinting ? 85 : 75;
      if (Math.abs(this.camera.fov - targetFOV) > 0.1) {
          this.camera.fov += (targetFOV - this.camera.fov) * delta * 10;
          this.camera.updateProjectionMatrix();
      }

      const currentSpeed = this.flyMode ? this.flySpeed : (this.isSprinting ? this.sprintSpeed : this.speed);

      // Calcul de la direction de mouvement souhaitée
      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize();

      // On applique la vitesse directement (mouvement "arcade" réactif)
      // La physique gérera les collisions et la gravité
      if (this.moveForward || this.moveBackward) {
        // On projette la direction de la caméra sur le plan XZ
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.controlsObject.quaternion);
        forward.y = 0;
        forward.normalize();
        
        // On ajoute le mouvement avant/arrière
        const moveZ = forward.multiplyScalar(this.direction.z * currentSpeed);
        this.velocity.x = moveZ.x;
        this.velocity.z = moveZ.z;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      if (this.moveLeft || this.moveRight) {
        // On calcule le vecteur "droite"
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.controlsObject.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveX = right.multiplyScalar(this.direction.x * currentSpeed);
        
        // Si on bouge déjà en Z, on combine
        if (this.moveForward || this.moveBackward) {
            // Normalisation si diagonale ? Pour l'instant simple addition
            this.velocity.x += moveX.x;
            this.velocity.z += moveX.z;
            // On renormalise la vitesse horizontale pour ne pas aller plus vite en diagonale
            const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
            if (horizontalVelocity.length() > currentSpeed) {
                horizontalVelocity.normalize().multiplyScalar(currentSpeed);
                this.velocity.x = horizontalVelocity.x;
                this.velocity.z = horizontalVelocity.y;
            }
        } else {
            this.velocity.x = moveX.x;
            this.velocity.z = moveX.z;
        }
      }
      
      // Si aucune touche n'est pressée, on arrête le mouvement horizontal
      if (!this.moveForward && !this.moveBackward && !this.moveLeft && !this.moveRight) {
          this.velocity.x = 0;
          this.velocity.z = 0;
      }

      // Mise à jour physique
      this.physics.update(delta);
      
      // Network Update (20 times per second)
      const now = performance.now();
      if (now - this.lastNetworkUpdate > 50) {
          this.lastNetworkUpdate = now;
          if (this.game.networkManager && this.game.networkManager.connected) {
              this.game.networkManager.send({
                  type: 'update',
                  position: {
                      x: this.camera.position.x,
                      y: this.camera.position.y,
                      z: this.camera.position.z
                  },
                  rotation: {
                      x: this.controlsObject.rotation.x,
                      y: this.controlsObject.rotation.y,
                      z: this.controlsObject.rotation.z
                  }
              });
          }
      }
    }

    // Update Player Mesh
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    this.playerMesh.update(delta, isMoving, this.isSprinting, this.controlsObject.rotation.y, this.controlsObject.rotation.x);
    
    // Mesh Position (Feet)
    const feetPos = this.camera.position.clone();
    feetPos.y -= 1.6; // Eye height to feet
    this.playerMesh.mesh.position.copy(feetPos);
    
    // Mesh Rotation is now handled inside PlayerMesh.update()

    // Third Person Camera
    if (this.isThirdPerson) {
        this.eyePosition.copy(this.camera.position);
        
        // Calculate offset
        // Back 5 units, Up 2 units for a plunging view
        const offset = new THREE.Vector3(0, 0, 5);
        offset.applyQuaternion(this.controlsObject.quaternion);
        
        this.camera.position.add(offset);
        
        // Look at the eye position
        this.camera.lookAt(this.eyePosition);
        
        this.isCameraOffset = true;
    } else {
        // Sync camera rotation with controls
        this.camera.quaternion.copy(this.controlsObject.quaternion);
    }
  }
}
