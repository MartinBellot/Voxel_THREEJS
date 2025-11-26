import * as THREE from 'three';

export class RemotePlayer {
    constructor(game, data) {
        this.game = game;
        this.id = data.id;
        this.username = data.username;
        
        // Group to hold mesh and label
        this.group = new THREE.Group();
        
        // Simple mesh for now - Red box to distinguish
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0.9; // Center vertically
        this.group.add(this.mesh);
        
        // Add username label
        this.addLabel();
        
        this.group.position.set(data.position.x, data.position.y, data.position.z);
        this.game.scene.add(this.group);
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
        this.group.position.set(position.x, position.y, position.z);
        // this.mesh.rotation.set(rotation.x, rotation.y, rotation.z); 
    }
    
    dispose() {
        this.game.scene.remove(this.group);
        // Dispose geometries/materials if needed
    }
}
