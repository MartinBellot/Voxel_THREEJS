import * as THREE from 'three';
import { ItemType } from '../Item.js';

export class Arrow {
    constructor(game, position, direction, force) {
        this.game = game;
        this.position = position.clone();
        this.velocity = direction.clone().multiplyScalar(force * 40); // Speed multiplier
        this.rotation = new THREE.Euler();
        
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
        
        this.createBody();
        this.game.scene.add(this.mesh);
        
        this.width = 0.1;
        this.height = 0.1;
        this.depth = 0.1;
        
        this.isDead = false;
        this.stuck = false;
        this.lifeTime = 0;
    }

    createBody() {
        // Simple arrow mesh
        const shaftGeo = new THREE.BoxGeometry(0.05, 0.05, 0.5);
        const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        this.mesh.add(shaft);
        
        const headGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC }); // Grey
        const head = new THREE.Mesh(headGeo, headMat);
        head.rotation.x = Math.PI / 2;
        head.position.z = 0.35;
        this.mesh.add(head);
        
        const fletchingGeo = new THREE.BoxGeometry(0.02, 0.15, 0.15);
        const fletchingMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const fletching = new THREE.Mesh(fletchingGeo, fletchingMat);
        fletching.position.z = -0.25;
        this.mesh.add(fletching);
    }

    update(delta) {
        if (this.isDead) return;
        if (this.stuck) {
            this.lifeTime += delta;
            if (this.lifeTime > 60) { // Despawn after 60s
                this.remove();
            }
            
            // Check for collection by player
            const playerPos = this.game.player.camera.position;
            const dist = this.position.distanceTo(playerPos);
            if (dist < 2.0) {
                // Add to inventory
                const added = this.game.player.inventory.addItem(ItemType.ARROW, 1);
                if (added) {
                    this.game.player.inventoryUI.updateHotbar();
                    if (this.game.player.inventoryUI.isOpen) {
                        this.game.player.inventoryUI.updateSlots();
                    }
                    this.remove();
                }
            }
            return;
        }

        // Gravity
        this.velocity.y -= 20 * delta;
        
        // Move
        const moveStep = this.velocity.clone().multiplyScalar(delta);
        const nextPos = this.position.clone().add(moveStep);
        
        // Collision detection (Raycast)
        const direction = moveStep.clone().normalize();
        const distance = moveStep.length();
        
        const raycaster = new THREE.Raycaster(this.position, direction, 0, distance);
        // Get all collidable meshes (chunks)
        const meshes = [];
        this.game.world.chunks.forEach(chunk => {
            if (chunk.meshes) {
                Object.values(chunk.meshes).forEach(mesh => meshes.push(mesh));
            }
        });
        
        const intersects = raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            // Move back so only tip sticks in
            // Tip is at +0.45 (approx) from center.
            // We want center to be -0.4 from wall along velocity
            const hitPoint = intersects[0].point;
            const backVector = direction.clone().multiplyScalar(-0.4);
            this.position.copy(hitPoint).add(backVector);

            this.stuck = true;
            this.mesh.position.copy(this.position);
            return;
        }
        
        this.position.copy(nextPos);
        this.mesh.position.copy(this.position);
        
        // Rotate to face velocity
        if (this.velocity.lengthSq() > 0.1) {
            this.mesh.lookAt(this.position.clone().add(this.velocity));
        }
    }
    
    remove() {
        this.isDead = true;
        this.game.scene.remove(this.mesh);
        // Remove from game entities list if managed there
        const index = this.game.entities.indexOf(this);
        if (index > -1) {
            this.game.entities.splice(index, 1);
        }
    }
}
