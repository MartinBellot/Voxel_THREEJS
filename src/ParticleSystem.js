import * as THREE from 'three';

class Particle {
  constructor(position, velocity, color, size, lifetime, gravity) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.gravity = gravity;
    this.alive = true;
  }

  update(delta) {
    if (!this.alive) return;

    this.velocity.y -= this.gravity * delta;
    this.position.addScaledVector(this.velocity, delta);
    this.lifetime -= delta;

    if (this.lifetime <= 0) {
      this.alive = false;
    }
  }
}

export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.particles = [];
    this.maxParticles = 500;

    // Shared geometry for all particles
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    game.scene.add(this.points);
  }

  // Block break particles - small colored cubes flying out
  spawnBlockBreak(x, y, z, color) {
    const count = 8 + Math.floor(Math.random() * 8);
    const baseColor = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        x + 0.2 + Math.random() * 0.6,
        y + 0.2 + Math.random() * 0.6,
        z + 0.2 + Math.random() * 0.6
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 3
      );
      // Slight color variation
      const c = baseColor.clone();
      c.r = Math.min(1, Math.max(0, c.r + (Math.random() - 0.5) * 0.15));
      c.g = Math.min(1, Math.max(0, c.g + (Math.random() - 0.5) * 0.15));
      c.b = Math.min(1, Math.max(0, c.b + (Math.random() - 0.5) * 0.15));

      this.addParticle(pos, vel, c, 0.12 + Math.random() * 0.08, 0.6 + Math.random() * 0.6, 15);
    }
  }

  // Damage particles (red)
  spawnDamage(x, y, z) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        x + (Math.random() - 0.5) * 0.5,
        y + Math.random() * 1.5,
        z + (Math.random() - 0.5) * 0.5
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2
      );
      this.addParticle(pos, vel, new THREE.Color(0.8, 0.1, 0.1), 0.1, 0.4, 10);
    }
  }

  // Explosion particles (orange/yellow)
  spawnExplosion(x, y, z, radius) {
    const count = 30 + Math.floor(radius * 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 3 + Math.random() * radius * 2;
      const pos = new THREE.Vector3(x, y, z);
      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      const t = Math.random();
      const color = new THREE.Color().lerpColors(
        new THREE.Color(1, 0.6, 0),
        new THREE.Color(1, 1, 0.3),
        t
      );
      this.addParticle(pos, vel, color, 0.15 + Math.random() * 0.1, 0.5 + Math.random() * 0.8, 12);
    }
    // Smoke particles
    for (let i = 0; i < 15; i++) {
      const pos = new THREE.Vector3(
        x + (Math.random() - 0.5) * radius,
        y + Math.random() * radius,
        z + (Math.random() - 0.5) * radius
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 1
      );
      const gray = 0.3 + Math.random() * 0.3;
      this.addParticle(pos, vel, new THREE.Color(gray, gray, gray), 0.2, 1.0 + Math.random() * 1.0, 5);
    }
  }

  // XP orb particles (green)
  spawnXP(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const pos = new THREE.Vector3(
        x + (Math.random() - 0.5) * 0.3,
        y + 0.5 + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 0.3
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 1
      );
      this.addParticle(pos, vel, new THREE.Color(0.2, 0.9, 0.2), 0.12, 0.8, 8);
    }
  }

  // Torch flame particles
  spawnFlame(x, y, z) {
    const pos = new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.5 + 0.3,
      (Math.random() - 0.5) * 0.3
    );
    const t = Math.random();
    const color = new THREE.Color().lerpColors(
      new THREE.Color(1, 0.5, 0),
      new THREE.Color(1, 1, 0),
      t
    );
    this.addParticle(pos, vel, color, 0.06, 0.3 + Math.random() * 0.2, 2);
  }

  // Water splash
  spawnSplash(x, y, z) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        x + (Math.random() - 0.5) * 0.6,
        y + 0.5,
        z + (Math.random() - 0.5) * 0.6
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2
      );
      this.addParticle(pos, vel, new THREE.Color(0.3, 0.5, 0.9), 0.08, 0.5, 12);
    }
  }

  addParticle(position, velocity, color, size, lifetime, gravity) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest
      this.particles.shift();
    }
    this.particles.push(new Particle(position, velocity, color, size, lifetime, gravity));
  }

  update(delta) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(delta);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }

    // Update buffer
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = p.size * (p.lifetime / p.maxLifetime); // Shrink over time
    }

    // Zero out unused slots
    for (let i = count; i < this.maxParticles; i++) {
      this.sizes[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }

  dispose() {
    this.game.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
