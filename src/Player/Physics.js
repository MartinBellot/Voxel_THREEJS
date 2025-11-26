import * as THREE from 'three';
import { BlockType } from '../World/Block.js';

export class Physics {
  constructor(player) {
    this.player = player;
    this.world = player.game.world;
    this.gravity = 30.0;
    this.terminalVelocity = 50.0;
    
    // Bounding box du joueur (relative à sa position)
    this.width = 0.6;
    this.height = 1.8;
    this.depth = 0.6;
    
    this.inWater = false;
  }

  update(delta) {
    this.checkWater();
    this.applyGravity(delta);
    this.checkCollisions(delta);
  }

  checkWater() {
      const pos = this.player.camera.position;
      // Check feet and head
      const blockFeet = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y - 1.5), Math.floor(pos.z));
      const blockHead = this.world.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
      
      this.inWater = (blockFeet === BlockType.WATER || blockHead === BlockType.WATER);
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

    if (this.inWater) {
        // Water physics
        this.player.velocity.y -= (this.gravity * 0.2) * delta; // Reduced gravity
        
        // Water drag
        this.player.velocity.x *= 0.9;
        this.player.velocity.z *= 0.9;
        this.player.velocity.y *= 0.9;
        
        if (this.player.velocity.y < -5) {
            this.player.velocity.y = -5; // Lower terminal velocity
        }
        
        // Swim up
        if (this.player.canJump) { // Using jump key for swimming up
             this.player.velocity.y += 15 * delta;
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
      // Auto-jump : si on touche un mur, on regarde si on peut monter
      if (this.player.canJump && !this.checkCollision(nextX, position.y + 1.1, position.z)) {
        velocity.y = 8; // Force de saut automatique
        this.player.canJump = false;
      }
      velocity.x = 0;
    } else {
      position.x = nextX;
    }

    // Axe Z
    let nextZ = position.z + velocity.z * delta;
    if (this.checkCollision(position.x, position.y, nextZ)) {
      // Auto-jump
      if (this.player.canJump && !this.checkCollision(position.x, position.y + 1.1, nextZ)) {
        velocity.y = 8;
        this.player.canJump = false;
      }
      velocity.z = 0;
    } else {
      position.z = nextZ;
    }

    // Axe Y
    let nextY = position.y + velocity.y * delta;
    if (this.checkCollision(position.x, nextY, position.z)) {
      if (velocity.y < 0) {
        this.player.canJump = true;
      }
      velocity.y = 0;
      // On pourrait aligner la position sur le bloc ici pour éviter de trembler
    } else {
      position.y = nextY;
      // Si on tombe, on ne peut pas sauter
      // Mais attention aux petites pentes ou escaliers (pas gérés ici encore)
      // Pour l'instant simple
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
          if (block !== BlockType.AIR && block !== BlockType.WATER) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
