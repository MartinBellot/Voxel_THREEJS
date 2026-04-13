import * as THREE from 'three';
import { BlockType } from '../World/Block.js';

export class TNTEntity {
  constructor(game, x, y, z) {
    this.game = game;
    this.position = new THREE.Vector3(x + 0.5, y, z + 0.5);
    this.velocity = new THREE.Vector3(0, 5, 0); // Pop up slightly
    this.fuseTime = 4.0; // 4 second fuse
    this.explosionRadius = 4;
    this.type = 'tnt';
    this.health = 1;
    this.flashTimer = 0;

    // Create mesh
    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const material = new THREE.MeshLambertMaterial({ color: 0xCC0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    game.scene.add(this.mesh);

    // Remove TNT block
    game.world.setBlock(x, y, z, BlockType.AIR);
  }

  update(delta) {
    // Physics
    this.velocity.y -= 20 * delta;
    this.position.addScaledVector(this.velocity, delta);

    // Ground check
    const blockBelow = this.game.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y - 0.5),
      Math.floor(this.position.z)
    );
    if (blockBelow && blockBelow !== BlockType.AIR) {
      this.velocity.y = 0;
      this.position.y = Math.floor(this.position.y - 0.5) + 1.49;
    }

    this.mesh.position.copy(this.position);

    // Fuse countdown
    this.fuseTime -= delta;

    // Flash white
    this.flashTimer += delta;
    const flashRate = Math.max(0.05, this.fuseTime * 0.15);
    if (Math.floor(this.flashTimer / flashRate) % 2 === 0) {
      this.mesh.material.color.setHex(0xFFFFFF);
    } else {
      this.mesh.material.color.setHex(0xCC0000);
    }

    // Scale pulse
    const scale = 1 + (1 - this.fuseTime / 4) * 0.15;
    this.mesh.scale.set(scale, scale, scale);

    // Explode
    if (this.fuseTime <= 0) {
      this.explode();
    }
  }

  explode() {
    const cx = Math.floor(this.position.x);
    const cy = Math.floor(this.position.y);
    const cz = Math.floor(this.position.z);
    const r = this.explosionRadius;

    // Destroy blocks
    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        for (let z = -r; z <= r; z++) {
          const distSq = x * x + y * y + z * z;
          if (distSq <= r * r) {
            const block = this.game.world.getBlock(cx + x, cy + y, cz + z);
            if (block !== BlockType.BEDROCK && block !== BlockType.AIR) {
              // TNT chain reaction
              if (block === BlockType.TNT) {
                this.game.igniteTNT(cx + x, cy + y, cz + z);
              } else {
                this.game.world.setBlock(cx + x, cy + y, cz + z, BlockType.AIR);
              }
            }
          }
        }
      }
    }

    // Damage player
    const playerPos = this.game.player.camera.position;
    const dist = this.position.distanceTo(playerPos);
    if (dist < r * 2) {
      const dmgFactor = 1 - (dist / (r * 2));
      this.game.player.takeDamage(Math.floor(65 * dmgFactor));
    }

    // Damage entities
    for (const entity of this.game.entities) {
      if (entity === this) continue;
      const d = this.position.distanceTo(entity.position);
      if (d < r * 2) {
        const dmg = Math.floor(65 * (1 - d / (r * 2)));
        entity.health -= dmg;
      }
    }

    // Particles
    if (this.game.particleSystem) {
      this.game.particleSystem.spawnExplosion(cx, cy, cz, r);
    }

    // Sound
    if (this.game.soundSystem) {
      this.game.soundSystem.playExplosion();
    }

    this.health = 0;
  }

  getDrops() {
    return []; // TNT doesn't drop anything when it explodes
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material) this.mesh.material.dispose();
  }
}
