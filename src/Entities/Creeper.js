import * as THREE from 'three';
import { ItemType } from '../Item.js';
import { BlockType, isSolid } from '../World/Block.js';

export class Creeper {
  constructor(game, position) {
    this.game = game;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.type = 'creeper';

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.health = 20;
    this.maxHealth = 20;
    this.detectionRange = 20;
    this.moveSpeed = 2.0;

    // Explosion
    this.fuseTime = 1.5;
    this.fuseTimer = 0;
    this.isFusing = false;
    this.explosionRadius = 3;
    this.explosionDamage = 25;

    this.isMoving = false;
    this.walkTime = 0;
    this.wanderTimer = 0;
    this.wanderDirection = 0;

    this.width = 0.6;
    this.depth = 0.6;
    this.height = 1.7;
    this.onGround = false;

    this.flashTimer = 0;

    this.createBody();
    this.game.scene.add(this.mesh);
  }

  createBody() {
    const creeperGreen = 0x4DA64D;
    const creeperDark = 0x2D7A2D;

    if (!Creeper._materials) {
      Creeper._materials = {};
    }
    const mat = (color) => {
      if (!Creeper._materials[color]) {
        Creeper._materials[color] = new THREE.MeshLambertMaterial({ color });
      }
      return Creeper._materials[color];
    };

    if (!Creeper._geometries) {
      const p = 1 / 16;
      Creeper._geometries = {
        head: new THREE.BoxGeometry(8 * p, 8 * p, 8 * p),
        body: new THREE.BoxGeometry(8 * p, 12 * p, 4 * p),
        leg: new THREE.BoxGeometry(4 * p, 6 * p, 4 * p),
      };
    }
    const geo = Creeper._geometries;
    const p = 1 / 16;

    this.head = new THREE.Mesh(geo.head, mat(creeperGreen));
    this.head.position.set(0, 22 * p, 0);
    this.mesh.add(this.head);

    this.body = new THREE.Mesh(geo.body, mat(creeperGreen));
    this.body.position.set(0, 12 * p, 0);
    this.mesh.add(this.body);

    this.frontLeftLeg = new THREE.Mesh(geo.leg, mat(creeperDark));
    this.frontLeftLeg.position.set(-2 * p, 3 * p, -3 * p);
    this.mesh.add(this.frontLeftLeg);

    this.frontRightLeg = new THREE.Mesh(geo.leg, mat(creeperDark));
    this.frontRightLeg.position.set(2 * p, 3 * p, -3 * p);
    this.mesh.add(this.frontRightLeg);

    this.backLeftLeg = new THREE.Mesh(geo.leg, mat(creeperDark));
    this.backLeftLeg.position.set(-2 * p, 3 * p, 3 * p);
    this.mesh.add(this.backLeftLeg);

    this.backRightLeg = new THREE.Mesh(geo.leg, mat(creeperDark));
    this.backRightLeg.position.set(2 * p, 3 * p, 3 * p);
    this.mesh.add(this.backRightLeg);
  }

  update(dt) {
    this.updatePhysics(dt);
    this.updateAI(dt);
    this.updateAnimation(dt);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation + Math.PI;
  }

  updateAI(dt) {
    const playerPos = this.game.player.camera.position;
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    if (distSq < this.detectionRange * this.detectionRange) {
      const angle = Math.atan2(dx, dz);
      this.rotation = angle;

      if (dist > 3) {
        // Chase
        this.isMoving = true;
        this.velocity.x = Math.sin(angle) * this.moveSpeed;
        this.velocity.z = Math.cos(angle) * this.moveSpeed;

        // Cancel fuse if player runs away
        if (this.isFusing && dist > 5) {
          this.isFusing = false;
          this.fuseTimer = 0;
          this.resetFlash();
        }
      } else {
        // Close enough - start fusing
        this.isMoving = false;
        this.velocity.x = 0;
        this.velocity.z = 0;

        if (!this.isFusing) {
          this.isFusing = true;
          this.fuseTimer = 0;
        }

        this.fuseTimer += dt;

        // Flash effect
        this.flashTimer += dt * 10;
        const flash = Math.sin(this.flashTimer * (this.fuseTimer / this.fuseTime * 5)) > 0;
        this.mesh.children.forEach(c => {
          if (c.material) {
            c.material.emissive = flash ?
              new THREE.Color(1, 1, 1) :
              new THREE.Color(0, 0, 0);
          }
        });
        // Scale up slightly
        const scale = 1 + (this.fuseTimer / this.fuseTime) * 0.15;
        this.mesh.scale.set(scale, scale, scale);

        if (this.fuseTimer >= this.fuseTime) {
          this.explode();
        }
      }
    } else {
      // Cancel fuse if player is out of detection range
      if (this.isFusing) {
        this.isFusing = false;
        this.fuseTimer = 0;
        this.resetFlash();
      }

      // Wander
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 4;
        if (Math.random() < 0.4) {
          this.wanderDirection = Math.random() * Math.PI * 2;
          this.isMoving = true;
        } else {
          this.isMoving = false;
        }
      }

      if (this.isMoving) {
        this.rotation = this.wanderDirection;
        this.velocity.x = Math.sin(this.wanderDirection) * this.moveSpeed * 0.4;
        this.velocity.z = Math.cos(this.wanderDirection) * this.moveSpeed * 0.4;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }
  }

  resetFlash() {
    this.mesh.children.forEach(c => {
      if (c.material) c.material.emissive = new THREE.Color(0, 0, 0);
    });
    this.mesh.scale.set(1, 1, 1);
  }

  explode() {
    const cx = Math.floor(this.position.x);
    const cy = Math.floor(this.position.y + 1);
    const cz = Math.floor(this.position.z);
    const r = this.explosionRadius;

    // Destroy blocks in radius
    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        for (let z = -r; z <= r; z++) {
          if (x * x + y * y + z * z <= r * r) {
            const block = this.game.world.getBlock(cx + x, cy + y, cz + z);
            if (block !== BlockType.BEDROCK && block !== 0) {
              this.game.world.setBlock(cx + x, cy + y, cz + z, 0);
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
      this.game.player.takeDamage(Math.floor(this.explosionDamage * dmgFactor));
    }

    // Explosion particles
    if (this.game.particleSystem) {
      this.game.particleSystem.spawnExplosion(cx, cy, cz, r);
    }

    // Explosion sound
    if (this.game.soundSystem) {
      this.game.soundSystem.playExplosion();
    }

    // Kill self
    this.health = 0;
  }

  updatePhysics(dt) {
    this.velocity.y -= 32.0 * dt;

    this.position.x += this.velocity.x * dt;
    if (this.checkCollision()) {
      this.position.x -= this.velocity.x * dt;
      if (this.onGround) this.velocity.y = 8;
      this.velocity.x = 0;
    }

    this.position.z += this.velocity.z * dt;
    if (this.checkCollision()) {
      this.position.z -= this.velocity.z * dt;
      if (this.onGround) this.velocity.y = 8;
      this.velocity.z = 0;
    }

    this.position.y += this.velocity.y * dt;
    if (this.velocity.y <= 0) {
      const checkY = Math.floor(this.position.y - 0.05);
      const box = this.getBoundingBox();
      let landed = false;
      for (let x = Math.floor(box.min.x); x <= Math.floor(box.max.x); x++) {
        for (let z = Math.floor(box.min.z); z <= Math.floor(box.max.z); z++) {
          const b = this.game.world.getBlock(x, checkY, z);
          if (b !== 0 && isSolid(b)) { landed = true; break; }
        }
        if (landed) break;
      }
      if (landed) {
        this.position.y = checkY + 1;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      this.onGround = false;
    }
  }

  getBoundingBox() {
    const hw = this.width / 2;
    return {
      min: { x: this.position.x - hw, y: this.position.y, z: this.position.z - hw },
      max: { x: this.position.x + hw, y: this.position.y + this.height, z: this.position.z + hw }
    };
  }

  checkCollision() {
    const box = this.getBoundingBox();
    const world = this.game.world;
    for (let x = Math.floor(box.min.x); x <= Math.floor(box.max.x); x++) {
      for (let y = Math.floor(box.min.y + 0.5); y < Math.floor(box.max.y); y++) {
        for (let z = Math.floor(box.min.z); z <= Math.floor(box.max.z); z++) {
          const b = world.getBlock(x, y, z);
          if (b !== 0 && isSolid(b)) return true;
        }
      }
    }
    return false;
  }

  updateAnimation(dt) {
    if (this.isMoving) {
      this.walkTime += dt * 5;
      const swing = Math.sin(this.walkTime) * 0.4;
      this.frontLeftLeg.rotation.x = swing;
      this.frontRightLeg.rotation.x = -swing;
      this.backLeftLeg.rotation.x = -swing;
      this.backRightLeg.rotation.x = swing;
    } else {
      this.frontLeftLeg.rotation.x = 0;
      this.frontRightLeg.rotation.x = 0;
      this.backLeftLeg.rotation.x = 0;
      this.backRightLeg.rotation.x = 0;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.mesh.children.forEach(c => {
      if (c.material) c.material.emissive = new THREE.Color(0.5, 0, 0);
    });
    setTimeout(() => {
      if (this.health > 0) {
        this.mesh.children.forEach(c => {
          if (c.material) c.material.emissive = new THREE.Color(0, 0, 0);
        });
      }
    }, 200);
  }

  getDrops() {
    const drops = [];
    const count = Math.floor(Math.random() * 3);
    if (count > 0) drops.push({ type: ItemType.GUNPOWDER, count });
    return drops;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
