import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Physics } from './Physics.js';
import { BlockType } from '../World/Block.js';
import { Inventory } from '../Inventory.js';
import { InventoryUI } from '../InventoryUI.js';
import { ItemDefinitions } from '../Item.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    
    this.controls = new PointerLockControls(this.camera, document.body);
    
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
    
    this.speed = 6.0;
    this.sprintSpeed = 10.0;
    this.flySpeed = 15.0;
    
    this.physics = new Physics(this);
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 5; // Portée d'interaction
    
    this.inventory = new Inventory();
    this.inventoryUI = new InventoryUI(this.game, this.inventory);
    
    this.setupInputs();
    this.setupHighlight();
    
    // Position initiale
    this.camera.position.set(0, 80, 0); // Plus haut pour éviter de spawner dans le sol
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

  setupInputs() {
    const instructions = document.getElementById('instructions');
    
    instructions.addEventListener('click', () => {
      if (!this.inventoryUI.isOpen) {
        this.controls.lock();
        document.body.requestFullscreen().catch(err => {
          console.warn("Error attempting to enable full-screen mode:", err);
        });
      }
    });

    this.controls.addEventListener('lock', () => {
      instructions.style.display = 'none';
      if (this.inventoryUI.isOpen) this.inventoryUI.toggle(); // Close inventory if we lock (e.g. clicking back in game)
    });

    this.controls.addEventListener('unlock', () => {
      if (!this.inventoryUI.isOpen && (!this.game.console || !this.game.console.isOpen)) {
        instructions.style.display = 'block';
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
        case 'Space':
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
      this.game.world.setBlock(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z), BlockType.AIR);
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
        if (blockType) {
          this.game.world.setBlock(x, y, z, blockType);
          // Optional: Consume item in survival mode
          // this.inventory.removeItem(this.inventory.selectedSlot, 1);
          // this.inventoryUI.updateHotbar();
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
    } else {
      this.highlightMesh.visible = false;
    }
  }

  update(delta) {
    this.updateHighlight();

    if (this.controls.isLocked === true) {
      
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
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
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
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
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
    }
  }
}
