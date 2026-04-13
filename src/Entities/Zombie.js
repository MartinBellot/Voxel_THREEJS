import * as THREE from 'three';
import { ItemType } from '../Item.js';
import { BlockType, isSolid } from '../World/Block.js';

export class Zombie {
  constructor(game, position) {
    this.game = game;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.type = 'zombie';

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.health = 20;
    this.maxHealth = 20;
    this.damage = 3; // 1.5 hearts on easy, more on hard
    this.attackCooldown = 0;
    this.attackRange = 1.5;
    this.detectionRange = 40;
    this.moveSpeed = 2.3;
    this.turnSpeed = 3.0;

    this.isMoving = false;
    this.walkTime = 0;
    this.wanderTimer = 0;
    this.wanderDirection = 0;

    this.width = 0.6;
    this.depth = 0.6;
    this.height = 1.95;
    this.onGround = false;

    // Burns in daylight
    this.burnTimer = 0;

    this.createBody();
    this.game.scene.add(this.mesh);
  }

  createBody() {
    // Simple box-based zombie
    const skinColor = 0x4C7A3D; // Green zombie skin
    const clothColor = 0x2D4AA0; // Blue shirt
    const pantColor = 0x372299; // Purple pants

    // Shared materials cache (static, reused across all Zombie instances)
    if (!Zombie._materials) {
      Zombie._materials = {};
    }
    const mat = (color) => {
      if (!Zombie._materials[color]) {
        Zombie._materials[color] = new THREE.MeshLambertMaterial({ color });
      }
      return Zombie._materials[color];
    };

    // Shared geometries (static, reused across all Zombie instances)
    if (!Zombie._geometries) {
      const p = 1 / 16;
      Zombie._geometries = {
        head: new THREE.BoxGeometry(8 * p, 8 * p, 8 * p),
        body: new THREE.BoxGeometry(8 * p, 12 * p, 4 * p),
        arm: new THREE.BoxGeometry(4 * p, 12 * p, 4 * p),
        leg: new THREE.BoxGeometry(4 * p, 12 * p, 4 * p),
      };
    }
    const geo = Zombie._geometries;
    const p = 1 / 16;

    // Head (8x8x8)
    this.head = new THREE.Mesh(geo.head, mat(skinColor));
    this.head.position.set(0, 28 * p, 0);
    this.mesh.add(this.head);

    // Body (8x12x4)
    this.body = new THREE.Mesh(geo.body, mat(clothColor));
    this.body.position.set(0, 18 * p, 0);
    this.mesh.add(this.body);

    // Arms (4x12x4) - Extended forward
    this.leftArm = new THREE.Mesh(geo.arm, mat(skinColor));
    this.leftArm.position.set(-6 * p, 18 * p, -4 * p);
    this.leftArm.rotation.x = -Math.PI / 2; // Arms forward
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(geo.arm, mat(skinColor));
    this.rightArm.position.set(6 * p, 18 * p, -4 * p);
    this.rightArm.rotation.x = -Math.PI / 2;
    this.mesh.add(this.rightArm);

    // Legs (4x12x4)
    this.leftLeg = new THREE.Mesh(geo.leg, mat(pantColor));
    this.leftLeg.position.set(-2 * p, 6 * p, 0);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(geo.leg, mat(pantColor));
    this.rightLeg.position.set(2 * p, 6 * p, 0);
    this.mesh.add(this.rightLeg);
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

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Sun damage (daytime = 0-12000, night = 12000-24000)
    const isDay = this.game.time < 12000;
    if (isDay) {
      const worldY = Math.floor(this.position.y + this.height);
      const surfaceH = this.game.world.getHeight(Math.floor(this.position.x), Math.floor(this.position.z));
      if (worldY >= surfaceH) {
        this.burnTimer += dt;
        if (this.burnTimer >= 1) {
          this.burnTimer = 0;
          this.takeDamage(1);
        }
      }
    }

    if (distSq < this.detectionRange * this.detectionRange) {
      // Chase player
      const angle = Math.atan2(dx, dz);
      this.rotation = angle;
      this.isMoving = true;

      const speed = this.moveSpeed;
      this.velocity.x = Math.sin(angle) * speed;
      this.velocity.z = Math.cos(angle) * speed;

      // Attack if close enough
      const dist3D = Math.sqrt(distSq + Math.pow(playerPos.y - this.position.y - 1, 2));
      if (dist3D < this.attackRange && this.attackCooldown <= 0) {
        this.attackCooldown = 1.0;
        this.game.player.takeDamage(this.damage);
      }
    } else {
      // Wander
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 4;
        if (Math.random() < 0.5) {
          this.wanderDirection = Math.random() * Math.PI * 2;
          this.isMoving = true;
        } else {
          this.isMoving = false;
        }
      }

      if (this.isMoving) {
        this.rotation = this.wanderDirection;
        this.velocity.x = Math.sin(this.wanderDirection) * this.moveSpeed * 0.5;
        this.velocity.z = Math.cos(this.wanderDirection) * this.moveSpeed * 0.5;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }
  }

  updatePhysics(dt) {
    this.velocity.y -= 32.0 * dt;

    // X
    this.position.x += this.velocity.x * dt;
    if (this.checkCollision()) {
      this.position.x -= this.velocity.x * dt;
      if (this.onGround) this.velocity.y = 8;
      this.velocity.x = 0;
    }

    // Z
    this.position.z += this.velocity.z * dt;
    if (this.checkCollision()) {
      this.position.z -= this.velocity.z * dt;
      if (this.onGround) this.velocity.y = 8;
      this.velocity.z = 0;
    }

    // Y
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
      const swing = Math.sin(this.walkTime) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    // Flash red
    this.mesh.children.forEach(c => {
      if (c.material) c.material.emissive = new THREE.Color(0.5, 0, 0);
    });
    setTimeout(() => {
      this.mesh.children.forEach(c => {
        if (c.material) c.material.emissive = new THREE.Color(0, 0, 0);
      });
    }, 200);
  }

  getDrops() {
    const drops = [];
    const count = Math.floor(Math.random() * 3);
    if (count > 0) drops.push({ type: ItemType.RAW_BEEF, count }); // Rotten flesh simplified
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
