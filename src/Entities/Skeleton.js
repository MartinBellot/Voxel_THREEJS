import * as THREE from 'three';
import { ItemType } from '../Item.js';
import { BlockType, isSolid } from '../World/Block.js';

export class Skeleton {
  constructor(game, position) {
    this.game = game;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.type = 'skeleton';

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.health = 20;
    this.maxHealth = 20;
    this.attackCooldown = 0;
    this.attackRange = 15;
    this.meleeRange = 2;
    this.detectionRange = 40;
    this.moveSpeed = 2.5;
    this.preferredDistance = 8; // Stay at range

    this.isMoving = false;
    this.walkTime = 0;
    this.wanderTimer = 0;
    this.wanderDirection = 0;

    this.width = 0.6;
    this.depth = 0.6;
    this.height = 1.95;
    this.onGround = false;

    this.burnTimer = 0;

    this.createBody();
    this.game.scene.add(this.mesh);
  }

  createBody() {
    const boneColor = 0xD4CFC0;
    const darkBone = 0x8A8476;

    if (!Skeleton._materials) {
      Skeleton._materials = {};
    }
    const mat = (color) => {
      if (!Skeleton._materials[color]) {
        Skeleton._materials[color] = new THREE.MeshLambertMaterial({ color });
      }
      return Skeleton._materials[color];
    };

    if (!Skeleton._geometries) {
      const p = 1 / 16;
      Skeleton._geometries = {
        head: new THREE.BoxGeometry(8 * p, 8 * p, 8 * p),
        body: new THREE.BoxGeometry(8 * p, 12 * p, 2 * p),
        arm: new THREE.BoxGeometry(2 * p, 12 * p, 2 * p),
        leg: new THREE.BoxGeometry(2 * p, 12 * p, 2 * p),
      };
    }
    const geo = Skeleton._geometries;
    const p = 1 / 16;

    this.head = new THREE.Mesh(geo.head, mat(boneColor));
    this.head.position.set(0, 28 * p, 0);
    this.mesh.add(this.head);

    this.body = new THREE.Mesh(geo.body, mat(boneColor));
    this.body.position.set(0, 18 * p, 0);
    this.mesh.add(this.body);

    this.leftArm = new THREE.Mesh(geo.arm, mat(boneColor));
    this.leftArm.position.set(-5 * p, 18 * p, 0);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(geo.arm, mat(boneColor));
    this.rightArm.position.set(5 * p, 18 * p, 0);
    this.mesh.add(this.rightArm);

    this.leftLeg = new THREE.Mesh(geo.leg, mat(darkBone));
    this.leftLeg.position.set(-2 * p, 6 * p, 0);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(geo.leg, mat(darkBone));
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
    const dist = Math.sqrt(distSq);

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
      const angle = Math.atan2(dx, dz);
      this.rotation = angle;

      if (dist > this.preferredDistance + 2) {
        // Move toward player
        this.isMoving = true;
        this.velocity.x = Math.sin(angle) * this.moveSpeed;
        this.velocity.z = Math.cos(angle) * this.moveSpeed;
      } else if (dist < this.preferredDistance - 2) {
        // Back away
        this.isMoving = true;
        this.velocity.x = -Math.sin(angle) * this.moveSpeed * 0.6;
        this.velocity.z = -Math.cos(angle) * this.moveSpeed * 0.6;
      } else {
        // Strafe
        this.isMoving = true;
        const strafeAngle = angle + Math.PI / 2;
        this.velocity.x = Math.sin(strafeAngle) * this.moveSpeed * 0.4;
        this.velocity.z = Math.cos(strafeAngle) * this.moveSpeed * 0.4;
      }

      // Shoot arrow
      if (dist < this.attackRange && this.attackCooldown <= 0) {
        this.attackCooldown = 1.5 + Math.random();
        this.shootArrow();
      }
    } else {
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

  shootArrow() {
    const playerPos = this.game.player.camera.position;
    const spawnPos = new THREE.Vector3(
      this.position.x,
      this.position.y + 1.5,
      this.position.z
    );

    const dir = new THREE.Vector3(
      playerPos.x - spawnPos.x,
      playerPos.y - spawnPos.y,
      playerPos.z - spawnPos.z
    );
    dir.normalize();

    // Create arrow projectile if Arrow class exists
    if (this.game.entities) {
      // Simple arrow entity
      const arrow = new SkeletonArrow(this.game, spawnPos, dir);
      this.game.entities.push(arrow);
    }
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
    const boneCount = Math.floor(Math.random() * 3);
    const arrowCount = Math.floor(Math.random() * 3);
    if (boneCount > 0) drops.push({ type: ItemType.BONE, count: boneCount });
    if (arrowCount > 0) drops.push({ type: ItemType.ARROW, count: arrowCount });
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

// Simple arrow projectile from skeleton
export class SkeletonArrow {
  constructor(game, position, direction) {
    this.game = game;
    this.position = position.clone();
    this.velocity = direction.clone().multiplyScalar(20);
    this.velocity.y += 3; // Arc upward slightly
    this.type = 'skeleton_arrow';
    this.lifetime = 5;
    this.damage = 3;

    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 1 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.game.scene.add(this.mesh);

    this.health = 1; // For disposal tracking
    this.width = 0.1;
    this.height = 0.1;
    this.depth = 0.1;
  }

  update(dt) {
    this.lifetime -= dt;
    this.velocity.y -= 20 * dt; // Gravity

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    this.mesh.position.copy(this.position);
    this.mesh.lookAt(
      this.position.x + this.velocity.x,
      this.position.y + this.velocity.y,
      this.position.z + this.velocity.z
    );

    // Hit player check
    const playerPos = this.game.player.camera.position;
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const dz = playerPos.z - this.position.z;
    if (dx * dx + dy * dy + dz * dz < 1) {
      this.game.player.takeDamage(this.damage);
      this.health = 0;
    }

    // Hit block check
    const bx = Math.floor(this.position.x);
    const by = Math.floor(this.position.y);
    const bz = Math.floor(this.position.z);
    const block = this.game.world.getBlock(bx, by, bz);
    if (block !== 0 && isSolid(block)) {
      this.health = 0;
    }

    if (this.lifetime <= 0) this.health = 0;
  }

  getDrops() { return []; }

  dispose() {
    this.game.scene.remove(this.mesh);
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material) this.mesh.material.dispose();
  }
}
