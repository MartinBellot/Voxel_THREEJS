import * as THREE from 'three';
import { BlockType, BlockDefinitions, isLiquid, isSolid } from '../World/Block.js';
import { getEnchantmentBonus } from '../EnchantingSystem.js';

export class Physics {
  constructor(player) {
    this.player = player;
    this.world = player.game.world;
    this.gravity = 32.0;
    this.terminalVelocity = 78.4;
    
    // Bounding box du joueur (relative à sa position)
    this.width = 0.6;
    this.height = 1.8;
    this.depth = 0.6;
    
    this.inWater = false;
    this.inLava = false;
    this.waterSubmergeLevel = 0; // 0=not in water, 1=feet, 2=body, 3=head

    // Fall damage tracking
    this.fallStartY = null;
    this.wasFalling = false;

    // Lava damage timer
    this.lavaDamageTimer = 0;

    // Elytra gliding
    this.isGliding = false;
    this.glideVelocity = new THREE.Vector3();
    this._glideForward = new THREE.Vector3();
    this._glideRight = new THREE.Vector3();

    // Firework boost
    this.fireworkBoostTime = 0;
    this.fireworkBoostDir = new THREE.Vector3();
  }

  update(delta) {
    this.checkWater();
    this.applyGravity(delta);
    this.checkCollisions(delta);
    this.checkEnvironmentDamage(delta);
  }

  checkWater() {
      const pos = this.player.camera.position;
      const eyeHeight = 1.6;
      const blockFeet = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y - eyeHeight), Math.floor(pos.z));
      const blockBody = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y - eyeHeight / 2), Math.floor(pos.z));
      const blockHead = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));

      const feetInWater = (blockFeet === BlockType.WATER || blockFeet === BlockType.MAGIC_WATER);
      const bodyInWater = (blockBody === BlockType.WATER || blockBody === BlockType.MAGIC_WATER);
      const headInWater = (blockHead === BlockType.WATER || blockHead === BlockType.MAGIC_WATER);

      this.inWater = feetInWater || bodyInWater || headInWater;
      this.waterSubmergeLevel = (feetInWater ? 1 : 0) + (bodyInWater ? 1 : 0) + (headInWater ? 1 : 0);
      this.inLava = (blockFeet === BlockType.LAVA || blockHead === BlockType.LAVA);
  }

  checkEnvironmentDamage(delta) {
    if (this.player.gamemode !== 'survival') return;

    // Lava damage: 4 hearts/second
    if (this.inLava) {
      this.lavaDamageTimer += delta;
      if (this.lavaDamageTimer >= 0.5) {
        this.lavaDamageTimer = 0;
        this.player.takeDamage(4);
      }
    } else {
      this.lavaDamageTimer = 0;
    }

    // Cactus damage
    const pos = this.player.camera.position;
    const eyeHeight = 1.6;
    const halfW = this.width / 2;
    const checkPositions = [
      [Math.floor(pos.x - halfW), Math.floor(pos.y - eyeHeight + 0.1), Math.floor(pos.z)],
      [Math.floor(pos.x + halfW), Math.floor(pos.y - eyeHeight + 0.1), Math.floor(pos.z)],
      [Math.floor(pos.x), Math.floor(pos.y - eyeHeight + 0.1), Math.floor(pos.z - halfW)],
      [Math.floor(pos.x), Math.floor(pos.y - eyeHeight + 0.1), Math.floor(pos.z + halfW)],
    ];
    for (const [bx, by, bz] of checkPositions) {
      const block = this.world.getBlock(bx, by, bz);
      if (block === BlockType.CACTUS) {
        this.player.takeDamage(1);
        break;
      }
    }
  }

  applyGravity(delta) {
    if (this.player.flyMode) {
        this.player.velocity.y = 0;
        if (this.player.moveUp) this.player.velocity.y = this.player.flySpeed;
        if (this.player.moveDown) this.player.velocity.y = -this.player.flySpeed;
        
        // Apply drag to horizontal movement for smoother stop
        this.player.velocity.x *= 0.9;
        this.player.velocity.z *= 0.9;
        return;
    }

    // Elytra gliding physics (Minecraft-accurate)
    if (this.isGliding) {
        this.applyElytraPhysics(delta);
        return;
    }

    if (this.inWater) {
        // Buoyancy: upward force proportional to submersion
        const buoyancy = this.waterSubmergeLevel * 6.0;
        this.player.velocity.y -= (this.gravity * 0.4) * delta;
        this.player.velocity.y += buoyancy * delta;

        // Water drag
        const drag = 0.85;
        this.player.velocity.x *= drag;
        this.player.velocity.z *= drag;
        this.player.velocity.y *= 0.88;
        
        // Terminal velocity in water
        if (this.player.velocity.y < -4) {
            this.player.velocity.y = -4;
        }
        if (this.player.velocity.y > 6) {
            this.player.velocity.y = 6;
        }
        
        // Swim up (spacebar)
        if (this.player.canJump) {
             this.player.velocity.y = Math.max(this.player.velocity.y, 4.5);
        }
        // Sink down (shift)
        if (this.player.moveDown && !this.player.flyMode) {
             this.player.velocity.y -= 8 * delta;
        }
    } else {
        // Normal physics
        this.player.velocity.y -= this.gravity * delta;
        if (this.player.velocity.y < -this.terminalVelocity) {
          this.player.velocity.y = -this.terminalVelocity;
        }
    }
  }

  checkCollisions(delta) {
    const position = this.player.camera.position;
    const velocity = this.player.velocity;
    
    // On décompose le mouvement en axes pour gérer les collisions glissantes
    
    // Axe X
    let nextX = position.x + velocity.x * delta;
    if (this.checkCollision(nextX, position.y, position.z)) {
      if (this.isGliding) {
        // Elytra crash into wall — take speed-based damage
        const impactSpeed = Math.abs(velocity.x);
        if (impactSpeed > 10 && this.player.gamemode === 'survival') {
          this.player.takeDamage(Math.floor(impactSpeed * 0.5));
        }
        this.stopGliding();
      } else {
        // Auto-jump : si on touche un mur, on regarde si on peut monter
        if (this.player.canJump && !this.checkCollision(nextX, position.y + 1.1, position.z)) {
          velocity.y = 10.0;
          position.y += 0.2;
          this.player.canJump = false;
        }
      }
      velocity.x = 0;
      if (this.isGliding) this.glideVelocity.x = 0;
    } else {
      position.x = nextX;
    }

    // Axe Z
    let nextZ = position.z + velocity.z * delta;
    if (this.checkCollision(position.x, position.y, nextZ)) {
      if (this.isGliding) {
        const impactSpeed = Math.abs(velocity.z);
        if (impactSpeed > 10 && this.player.gamemode === 'survival') {
          this.player.takeDamage(Math.floor(impactSpeed * 0.5));
        }
        this.stopGliding();
      } else {
        // Auto-jump
        if (this.player.canJump && !this.checkCollision(position.x, position.y + 1.1, nextZ)) {
          velocity.y = 10.0;
          position.y += 0.2;
          this.player.canJump = false;
        }
      }
      velocity.z = 0;
      if (this.isGliding) this.glideVelocity.z = 0;
    } else {
      position.z = nextZ;
    }

    // Axe Y
    let nextY = position.y + velocity.y * delta;
    if (this.checkCollision(position.x, nextY, position.z)) {
      if (velocity.y < 0) {
        if (this.isGliding) {
          // Elytra landing — damage based on vertical impact speed
          const impactSpeed = Math.abs(velocity.y);
          if (impactSpeed > 8 && this.player.gamemode === 'survival') {
            let damage = Math.floor((impactSpeed - 8) * 0.5);
            const boots = this.player.inventory.getItem(39);
            if (boots && boots.enchantments) {
              const ffLevel = getEnchantmentBonus(boots.enchantments, 'feather_falling');
              damage = Math.max(0, damage - ffLevel * 2);
            }
            if (damage > 0) this.player.takeDamage(damage);
          }
          this.stopGliding();
        } else {
          // Fall damage calculation (Minecraft: damage = fallDistance - 3)
          if (this.fallStartY !== null && this.player.gamemode === 'survival') {
            const fallDistance = this.fallStartY - position.y;
            if (fallDistance > 3) {
              let damage = Math.floor(fallDistance - 3);
              // Feather Falling enchantment: reduce fall damage
              const boots = this.player.inventory.getItem(39);
              if (boots && boots.enchantments) {
                const ffLevel = getEnchantmentBonus(boots.enchantments, 'feather_falling');
                damage = Math.max(0, damage - ffLevel * 2);
              }
              if (damage > 0) {
                this.player.takeDamage(damage);
              }
            }
          }
        }
        this.fallStartY = null;
        this.wasFalling = false;
        this.player.canJump = true;
      }
      velocity.y = 0;
      if (this.isGliding) this.glideVelocity.y = 0;
    } else {
      // Track falling
      if (velocity.y < -0.5 && !this.inWater && !this.inLava) {
        if (this.fallStartY === null) {
          this.fallStartY = position.y;
        }
        this.wasFalling = true;
      } else if (velocity.y >= 0 || this.inWater || this.inLava) {
        this.fallStartY = null;
        this.wasFalling = false;
      }
      position.y = nextY;
    }
  }

  checkCollision(x, y, z) {
    // Vérifie si la bounding box du joueur à (x, y, z) intersecte un bloc solide
    // La position (x, y, z) est celle de la caméra (yeux du joueur)
    // Donc les pieds sont à y - height + eyeHeight (disons eyeHeight = 1.6)
    
    const eyeHeight = 1.6;
    const minX = x - this.width / 2;
    const maxX = x + this.width / 2;
    const minY = y - eyeHeight;
    const maxY = y - eyeHeight + this.height;
    const minZ = z - this.depth / 2;
    const maxZ = z + this.depth / 2;

    // On vérifie tous les blocs que la bounding box pourrait toucher
    const startX = Math.floor(minX);
    const endX = Math.floor(maxX);
    const startY = Math.floor(minY);
    const endY = Math.floor(maxY);
    const startZ = Math.floor(minZ);
    const endZ = Math.floor(maxZ);

    for (let bx = startX; bx <= endX; bx++) {
      for (let by = startY; by <= endY; by++) {
        for (let bz = startZ; bz <= endZ; bz++) {
          const block = this.world.getBlock(bx, by, bz);
          if (block !== BlockType.AIR && !isLiquid(block) && isSolid(block)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // === Elytra Gliding ===

  startGliding() {
    if (this.isGliding) return;
    this.isGliding = true;
    // Initialize glide velocity from current velocity
    this.glideVelocity.copy(this.player.velocity);
    // Reset fall damage tracking — gliding flight manages its own
    this.fallStartY = null;
    this.wasFalling = false;
  }

  stopGliding() {
    if (!this.isGliding) return;
    this.isGliding = false;
    // Transfer glide velocity back to player velocity
    this.player.velocity.copy(this.glideVelocity);
    // Start fall tracking from current position if falling
    if (this.player.velocity.y < -0.5) {
      this.fallStartY = this.player.camera.position.y;
      this.wasFalling = true;
    }
    this.fireworkBoostTime = 0;
  }

  applyFireworkBoost(duration) {
    // Get look direction for the boost
    this.fireworkBoostDir.set(0, 0, -1).applyQuaternion(this.player.controlsObject.quaternion);
    this.fireworkBoostTime = duration;
  }

  applyElytraPhysics(delta) {
    const pitch = this.player.controlsObject.rotation.x; // negative = looking up
    const yaw = this.player.controlsObject.rotation.y;

    // Get forward direction from camera (full 3D direction)
    this._glideForward.set(0, 0, -1).applyQuaternion(this.player.controlsObject.quaternion);

    // Current horizontal speed
    const horizSpeed = Math.sqrt(this.glideVelocity.x * this.glideVelocity.x + this.glideVelocity.z * this.glideVelocity.z);
    const totalSpeed = this.glideVelocity.length();

    // Minecraft elytra physics:
    // - Looking down: accelerate, trade altitude for speed
    // - Looking level: slow descent, gradual deceleration
    // - Looking up: decelerate, trade speed for altitude (until stall)

    // Gravity component (always pulls down)
    // In Minecraft, elytra gravity is about 0.08 blocks/tick² = ~32 blocks/s² at 20 ticks/s
    const elytraGravity = 0.08 * 20; // ~1.6 blocks/s² effective

    // Apply gravity
    this.glideVelocity.y -= elytraGravity * delta;

    // Lift based on pitch: looking down increases speed, looking up converts speed to altitude
    // pitch is in radians: negative = looking up, positive = looking down
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);

    // Speed-dependent lift: faster = more lift potential
    // Minecraft-like: when looking down, speed increases
    // When looking up, speed decreases but altitude increases if speed is sufficient

    if (sinPitch < 0) {
      // Looking down — accelerate
      // Gain speed proportional to sine of pitch angle * gravity
      const speedGain = -sinPitch * elytraGravity * 2.5 * delta;
      // Convert downward velocity to forward speed
      const fwdHoriz = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      this.glideVelocity.x += fwdHoriz.x * speedGain;
      this.glideVelocity.z += fwdHoriz.z * speedGain;
      // Reduce some of the vertical drop (you're converting it to forward motion)
      this.glideVelocity.y += Math.abs(sinPitch) * elytraGravity * 0.5 * delta;
    } else if (sinPitch > 0.1) {
      // Looking up — trade speed for altitude
      if (horizSpeed > 2.0) {
        const liftForce = sinPitch * horizSpeed * 0.6 * delta;
        this.glideVelocity.y += liftForce;
        // Decelerate horizontal speed proportionally
        const dragFactor = 1.0 - sinPitch * 0.8 * delta;
        this.glideVelocity.x *= dragFactor;
        this.glideVelocity.z *= dragFactor;
      }
    }

    // Air drag (Minecraft: 0.99 per tick on X/Z, 0.98 on Y)
    const dragXZ = Math.pow(0.99, delta * 20);
    const dragY = Math.pow(0.98, delta * 20);
    this.glideVelocity.x *= dragXZ;
    this.glideVelocity.z *= dragXZ;
    this.glideVelocity.y *= dragY;

    // Firework rocket boost
    if (this.fireworkBoostTime > 0) {
      this.fireworkBoostTime -= delta;
      // Boost: ~1.5 blocks/tick speed boost in look direction
      const boostPower = 30.0; // blocks/s²
      const lookDir = this._glideForward;
      this.glideVelocity.x += lookDir.x * boostPower * delta;
      this.glideVelocity.y += lookDir.y * boostPower * delta;
      this.glideVelocity.z += lookDir.z * boostPower * delta;
    }

    // Speed cap (~70 blocks/s max, ~3.5 blocks/tick)
    const maxSpeed = 70;
    const currentSpeed = this.glideVelocity.length();
    if (currentSpeed > maxSpeed) {
      this.glideVelocity.multiplyScalar(maxSpeed / currentSpeed);
    }

    // Steer toward look direction (gentle turning)
    const horizForward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    if (horizSpeed > 0.5) {
      const currentDir = new THREE.Vector3(this.glideVelocity.x, 0, this.glideVelocity.z).normalize();
      // Blend current direction toward look direction
      const turnRate = 3.0 * delta;
      currentDir.lerp(horizForward, turnRate).normalize();
      this.glideVelocity.x = currentDir.x * horizSpeed;
      this.glideVelocity.z = currentDir.z * horizSpeed;
    } else {
      // At very low speed, gently push in look direction
      this.glideVelocity.x += horizForward.x * 0.5 * delta;
      this.glideVelocity.z += horizForward.z * 0.5 * delta;
    }

    // Terminal velocity for gliding (down)
    if (this.glideVelocity.y < -40) this.glideVelocity.y = -40;

    // Apply glide velocity to player
    this.player.velocity.copy(this.glideVelocity);
  }
}
