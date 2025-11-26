import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Clouds {
  constructor(game) {
    this.game = game;
    this.mesh = null;
    this.noise2D = createNoise2D();
    this.cloudSize = 50; // Taille de la zone de nuages autour du joueur
    this.cloudHeight = 100;
    
    this.generate();
  }

  generate() {
    const geometry = new THREE.BoxGeometry(10, 4, 10);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.8 
    });
    
    // On crée un pool de nuages
    const count = 50;
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    this.game.scene.add(this.mesh);
    this.updateClouds();
  }

  update(delta) {
    // Déplacement lent des nuages
    this.mesh.position.x += delta * 2;
    
    // Si les nuages sont trop loin, on les replace autour du joueur
    const playerPos = this.game.player.camera.position;
    if (Math.abs(this.mesh.position.x - playerPos.x) > 100) {
        this.mesh.position.x = playerPos.x;
        this.mesh.position.z = playerPos.z;
        this.updateClouds(); // Régénère les positions relatives
    }
  }

  updateClouds() {
    const dummy = new THREE.Object3D();
    let index = 0;
    
    // On disperse les nuages aléatoirement dans une zone
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 10;
        
        dummy.position.set(x, this.cloudHeight + y, z);
        dummy.scale.set(
            1 + Math.random() * 2, 
            1, 
            1 + Math.random() * 2
        );
        dummy.updateMatrix();
        this.mesh.setMatrixAt(index++, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
