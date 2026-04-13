import * as THREE from 'three';

export class WeatherSystem {
  constructor(game) {
    this.game = game;
    this.currentWeather = 'clear'; // 'clear', 'rain', 'thunder'
    this.weatherTimer = 0;
    this.weatherDuration = 0;
    this.transitionProgress = 0; // 0 = clear, 1 = fully active

    // Rain particles - reduced count for performance
    this.rainCount = 2000;
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    this.rainMaterial = new THREE.PointsMaterial({
      color: 0xaaaaee,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    this.rain = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.visible = false;

    // Initialize rain positions
    for (let i = 0; i < this.rainCount; i++) {
      this.resetRainDrop(i);
    }

    game.scene.add(this.rain);

    // Thunder
    this.thunderTimer = 0;
    this.flashLight = new THREE.AmbientLight(0xffffff, 0);
    game.scene.add(this.flashLight);

    // Weather change timer
    this.nextWeatherChange = 300 + Math.random() * 600; // 5-15 minutes
  }

  resetRainDrop(i) {
    const player = this.game.player;
    const cx = player ? player.camera.position.x : 0;
    const cz = player ? player.camera.position.z : 0;
    const range = 40; // Reduced from 60

    this.rainPositions[i * 3] = cx + (Math.random() - 0.5) * range * 2;
    this.rainPositions[i * 3 + 1] = (player ? player.camera.position.y : 80) + Math.random() * 30;
    this.rainPositions[i * 3 + 2] = cz + (Math.random() - 0.5) * range * 2;
    this.rainVelocities[i] = 18 + Math.random() * 10; // Faster fall
  }

  setWeather(weather) {
    if (weather === this.currentWeather) return;
    this.currentWeather = weather;
    this.weatherTimer = 0;
    this.weatherDuration = 120 + Math.random() * 480; // 2-10 minutes
  }

  update(delta) {
    // Auto weather changes
    this.nextWeatherChange -= delta;
    if (this.nextWeatherChange <= 0) {
      const rand = Math.random();
      if (this.currentWeather === 'clear') {
        this.setWeather(rand < 0.7 ? 'rain' : 'thunder');
      } else {
        this.setWeather('clear');
      }
      this.nextWeatherChange = 300 + Math.random() * 600;
    }

    // Transition
    const targetProgress = this.currentWeather === 'clear' ? 0 : 1;
    const transitionSpeed = 0.3;
    if (this.transitionProgress < targetProgress) {
      this.transitionProgress = Math.min(targetProgress, this.transitionProgress + delta * transitionSpeed);
    } else if (this.transitionProgress > targetProgress) {
      this.transitionProgress = Math.max(targetProgress, this.transitionProgress - delta * transitionSpeed);
    }

    // Rain visibility and update
    this.rain.visible = this.transitionProgress > 0.01;
    this.rainMaterial.opacity = 0.6 * this.transitionProgress;

    if (this.rain.visible) {
      const player = this.game.player;
      const cx = player ? player.camera.position.x : 0;
      const cy = player ? player.camera.position.y : 80;
      const cz = player ? player.camera.position.z : 0;

      for (let i = 0; i < this.rainCount; i++) {
        this.rainPositions[i * 3 + 1] -= this.rainVelocities[i] * delta;

        // Reset drops that fall below ground or too far
        if (this.rainPositions[i * 3 + 1] < cy - 20) {
          this.resetRainDrop(i);
        }

        // Keep rain centered on player
        const dx = this.rainPositions[i * 3] - cx;
        const dz = this.rainPositions[i * 3 + 2] - cz;
        if (Math.abs(dx) > 40 || Math.abs(dz) > 40) {
          this.resetRainDrop(i);
        }
      }

      this.rainGeometry.attributes.position.needsUpdate = true;
    }

    // Darken sky during rain
    if (this.transitionProgress > 0) {
      const baseSky = new THREE.Color(0x87CEEB);
      const rainSky = new THREE.Color(0x555566);
      const skyColor = baseSky.lerp(rainSky, this.transitionProgress * 0.7);
      this.game.scene.background = skyColor;
      if (this.game.scene.fog) {
        this.game.scene.fog.color.copy(skyColor);
      }
      // Reduce sun intensity
      if (this.game.sunLight) {
        this.game.sunLight.intensity = 1.2 * (1 - this.transitionProgress * 0.5);
      }
    }

    // Thunder flashes
    if (this.currentWeather === 'thunder') {
      this.thunderTimer -= delta;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = 3 + Math.random() * 15;
        // Flash
        this.flashLight.intensity = 2;
        setTimeout(() => {
          if (this.flashLight) this.flashLight.intensity = 0;
        }, 100 + Math.random() * 100);
      }
    } else {
      this.flashLight.intensity = 0;
    }

    // Weather duration
    if (this.currentWeather !== 'clear') {
      this.weatherTimer += delta;
      if (this.weatherTimer >= this.weatherDuration) {
        this.setWeather('clear');
      }
    }
  }

  dispose() {
    this.game.scene.remove(this.rain);
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.game.scene.remove(this.flashLight);
  }
}
