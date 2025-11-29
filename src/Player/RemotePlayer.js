import * as THREE from 'three';
import { PlayerMesh } from './PlayerMesh.js';

export class RemotePlayer {
    constructor(game, data) {
        this.game = game;
        this.id = data.id;
        this.username = data.username;

        // Group to hold mesh and label
        this.group = new THREE.Group();

        // Player Mesh
        this.playerMesh = new PlayerMesh(game.scene);
        this.mesh = this.playerMesh.mesh;
        this.group.add(this.mesh);

        // Add username label
        this.addLabel();

        this.group.position.set(data.position.x, data.position.y, data.position.z);
        this.game.scene.add(this.group);
        
        this.isMoving = false;
        this.lastUpdate = Date.now();
    }

    addLabel() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, 256, 64);
        
        context.font = 'bold 32px monospace';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.username, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.y = 2.2; // Above head
        sprite.scale.set(2, 0.5, 1);
        
        this.group.add(sprite);
    }

    updatePosition(position, rotation) {
        const newPos = new THREE.Vector3(position.x, position.y, position.z);
        const dist = newPos.distanceTo(this.group.position);
        
        this.isMoving = dist > 0.01;
        
        this.group.position.copy(newPos);
        if (rotation) {
            this.mesh.rotation.y = rotation.y;
        }
        
        this.lastUpdate = Date.now();
    }
    
    update(delta) {
        if (Date.now() - this.lastUpdate > 200) {
            this.isMoving = false;
        }
        this.playerMesh.update(delta, this.isMoving);
    }
    
    dispose() {
        this.game.scene.remove(this.group);
        // Dispose geometries/materials if needed
    }
}
