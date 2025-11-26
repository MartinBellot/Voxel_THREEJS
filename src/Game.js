import * as THREE from 'three';
import { World } from './World/World.js';
import { Player } from './Player/Player.js';
import { Clouds } from './World/Clouds.js';
import { Console } from './Console.js';

export class Game {
  constructor() {
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 150, 250); // Brouillard ajusté pour cacher la fin du monde

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.clock = new THREE.Clock();
    this.frames = 0;
    this.lastTime = performance.now();

    // Day/Night Cycle
    this.time = 6000; // 0-24000, 6000 is noon
    this.timeSpeed = 10; // Speed of time

    this.world = new World(this);
    this.player = new Player(this);
    this.clouds = new Clouds(this);
    this.console = new Console(this);

    this.setupLights();
    this.setupEvents();
    
    this.animate();
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateDebugInfo() {
    const now = performance.now();
    this.frames++;
    
    if (now >= this.lastTime + 1000) {
      document.getElementById('fps').innerText = this.frames;
      this.frames = 0;
      this.lastTime = now;
    }

    const pos = this.player.camera.position;
    document.getElementById('coords').innerText = 
      `${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`;
    
    const biome = this.world.getBiome(pos.x, pos.z);
    if (document.getElementById('biome')) {
        document.getElementById('biome').innerText = biome;
    }
      
    // document.getElementById('chunk-count').innerText = this.world.chunks.size;
  }

  updateDayNightCycle(delta) {
    this.time += this.timeSpeed * delta * 10; // Speed up a bit
    if (this.time >= 24000) this.time = 0;

    // 6000 = Noon (Top), 18000 = Midnight (Bottom)
    // Angle: 0 at 6000? No.
    // Let's say 0 is sunrise (0 time).
    // Minecraft: 0 is sunrise, 6000 noon, 12000 sunset, 18000 midnight.
    
    const angle = ((this.time - 6000) / 24000) * Math.PI * 2; 
    // At 6000: (0) -> angle 0 -> cos(0)=1 (x=R), sin(0)=0 (y=0). Wait.
    // We want noon (6000) to be at Y = max.
    // sin(PI/2) = 1.
    // So we want angle to be PI/2 at 6000.
    // ((6000 - 6000) / 24000) * 2PI = 0.
    // Let's just map directly.
    
    // 0 (Sunrise) -> X negative, Y 0
    // 6000 (Noon) -> X 0, Y positive
    // 12000 (Sunset) -> X positive, Y 0
    // 18000 (Midnight) -> X 0, Y negative
    
    const theta = (this.time / 24000) * Math.PI * 2; // 0 to 2PI
    // We want 0 -> -X
    // cos(theta) starts at 1.
    // Let's use:
    // x = -cos(theta * 2PI) ? No.
    
    const sunX = -Math.cos(theta) * 100;
    const sunY = Math.sin(theta) * 100;
    
    this.sunLight.position.set(sunX, sunY, 0);
    
    const sunHeight = sunY;
    
    if (sunHeight > 20) {
        this.scene.background.setHex(0x87CEEB);
        this.scene.fog.color.setHex(0x87CEEB);
        this.ambientLight.intensity = 0.7;
        this.sunLight.intensity = 1;
    } else if (sunHeight < -20) {
        this.scene.background.setHex(0x050510);
        this.scene.fog.color.setHex(0x050510);
        this.ambientLight.intensity = 0.1;
        this.sunLight.intensity = 0;
    } else {
        // Transition (-20 to 20)
        const t = (sunHeight + 20) / 40; // 0 to 1
        const dayColor = new THREE.Color(0x87CEEB);
        const nightColor = new THREE.Color(0x050510);
        
        this.scene.background.copy(nightColor).lerp(dayColor, t);
        this.scene.fog.color.copy(nightColor).lerp(dayColor, t);
        this.ambientLight.intensity = 0.1 + (0.6 * t);
        this.sunLight.intensity = t;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.player.update(delta);
    this.world.update(delta);
    this.clouds.update(delta);
    this.updateDayNightCycle(delta);
    
    this.updateDebugInfo();

    this.renderer.render(this.scene, this.camera);
  }
}
