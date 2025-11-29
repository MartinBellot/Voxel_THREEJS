import * as THREE from 'three';
import { World } from './World/World.js';
import { Player } from './Player/Player.js';
import { Clouds } from './World/Clouds.js';
import { Console } from './Console.js';
import { TextureManager } from './Utils/TextureManager.js';
import { NetworkManager } from './NetworkManager.js';
import { PauseMenu } from './PauseMenu.js';
import { DroppedItem } from './World/DroppedItem.js';
import { BlockType } from './World/Block.js';
import { Pig } from './Entities/Pig.js';
import { Minimap } from './Minimap/Minimap.js';

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
    this.renderer.setPixelRatio(1); // Performance optimization: use 1 instead of devicePixelRatio
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false; // Manual clear for overlay rendering

    this.clock = new THREE.Clock();
    this.frames = 0;
    this.lastTime = performance.now();

    // Day/Night Cycle
    this.time = 6000; // 0-24000, 6000 is noon
    this.timeSpeed = 10; // Speed of time

    this.textureManager = new TextureManager(this);
    this.textureManager.loadTextures().then(() => {
      if (this.world) {
        this.world.updateChunksMesh();
      }
    });

    this.world = new World(this);
    this.player = new Player(this);
    this.clouds = new Clouds(this);
    this.console = new Console(this);
    this.pauseMenu = new PauseMenu(this);
    this.minimap = new Minimap(this);
    
    this.droppedItems = [];
    this.entities = [];

    // Network
    this.networkManager = new NetworkManager(this);
    // Connection will be initiated in start()
    
    this.isPlaying = false;

    this.setupLights();
    this.setupCelestialBodies();
    this.setupEvents();
    
    this.animate();
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024; // Optimized shadow map size
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 150; // Optimized shadow distance
    this.sunLight.shadow.camera.left = -80; // Tighter shadow frustum
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x6666ff, 0.4);
    this.moonLight.position.set(-10, -20, -10);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 512; // Lower resolution for moon shadows
    this.moonLight.shadow.mapSize.height = 512;
    this.moonLight.shadow.camera.near = 0.1;
    this.moonLight.shadow.camera.far = 150;
    this.moonLight.shadow.camera.left = -80;
    this.moonLight.shadow.camera.right = 80;
    this.moonLight.shadow.camera.top = 80;
    this.moonLight.shadow.camera.bottom = -80;
    this.moonLight.shadow.bias = -0.0005;
    this.scene.add(this.moonLight);
  }

  setupCelestialBodies() {
    const textureLoader = new THREE.TextureLoader();

    // Sun
    const sunTexture = textureLoader.load('assets/textures/environment/sun.png');
    sunTexture.magFilter = THREE.NearestFilter;
    sunTexture.minFilter = THREE.NearestFilter;
    
    const sunGeometry = new THREE.PlaneGeometry(60, 60);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        map: sunTexture, 
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        fog: false
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunMesh);

    // Moon
    this.moonTexture = textureLoader.load('assets/textures/environment/moon_phases.png');
    this.moonTexture.magFilter = THREE.NearestFilter;
    this.moonTexture.minFilter = THREE.NearestFilter;
    this.moonTexture.wrapS = THREE.RepeatWrapping;
    this.moonTexture.wrapT = THREE.RepeatWrapping;
    
    // 4 columns, 2 rows
    this.moonTexture.repeat.set(0.25, 0.5);
    
    const moonGeometry = new THREE.PlaneGeometry(50, 50);
    const moonMaterial = new THREE.MeshBasicMaterial({ 
        map: this.moonTexture, 
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
        fog: false
    });
    this.moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moonMesh);
    
    this.currentMoonPhase = 0;
    this.updateMoonPhase();
  }

  updateMoonPhase() {
      // 8 phases total (4 cols * 2 rows)
      const col = this.currentMoonPhase % 4;
      const row = Math.floor(this.currentMoonPhase / 4);
      
      // UV offset
      // In Three.js UVs, (0,0) is bottom-left.
      // If texture is 4x2:
      // Row 0 is bottom, Row 1 is top.
      // We want to read from top-left usually?
      // Let's assume standard grid:
      // 0 1 2 3 (Top row)
      // 4 5 6 7 (Bottom row)
      
      // If row 0 is top in image, that corresponds to V offset 0.5
      // If row 1 is bottom in image, that corresponds to V offset 0.0
      
      // Let's try:
      // Row 0 (Top): V = 0.5
      // Row 1 (Bottom): V = 0.0
      
      this.moonTexture.offset.x = col * 0.25;
      this.moonTexture.offset.y = (1 - row - 1) * 0.5; // 1 - 0 - 1 = 0? No.
      
      // If row=0 (top), we want y=0.5
      // If row=1 (bottom), we want y=0.0
      this.moonTexture.offset.y = (1 - row) * 0.5 - 0.5; 
      // Wait, repeat is 0.5.
      // Range is [offset, offset + repeat]
      // If offset=0, range [0, 0.5] -> Bottom half
      // If offset=0.5, range [0.5, 1.0] -> Top half
      
      // So if row 0 is top: offset.y = 0.5
      // If row 1 is bottom: offset.y = 0.0
      this.moonTexture.offset.y = (1 - row) * 0.5 - 0.5; 
      // row 0 -> 0.5 - 0.5 = 0.0 (Bottom?)
      
      // Let's assume row 0 is top.
      // We want V range [0.5, 1.0]
      // offset.y should be 0.5
      
      // row 1 is bottom.
      // We want V range [0.0, 0.5]
      // offset.y should be 0.0
      
      this.moonTexture.offset.y = (1 - row - 1) * 0.5 + 0.5; 
      // row 0: (0)*0.5 + 0.5 = 0.5. Correct.
      // row 1: (-1)*0.5 + 0.5 = 0.0. Correct.
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Tab') {
        event.preventDefault();
        document.getElementById('player-list').style.display = 'block';
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'Tab') {
        event.preventDefault();
        document.getElementById('player-list').style.display = 'none';
      }
    });
  }

  updatePlayerList(players) {
    const list = document.getElementById('player-list-ul');
    list.innerHTML = '';
    players.forEach(player => {
      const li = document.createElement('li');
      li.innerText = player.username;
      li.id = `player-li-${player.id}`;
      list.appendChild(li);
    });
  }

  addPlayerToTab(player) {
    if (document.getElementById(`player-li-${player.id}`)) return;
    const list = document.getElementById('player-list-ul');
    const li = document.createElement('li');
    li.innerText = player.username;
    li.id = `player-li-${player.id}`;
    list.appendChild(li);
  }

  removePlayerFromTab(id) {
    const li = document.getElementById(`player-li-${id}`);
    if (li) {
      li.remove();
    }
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

    if (this.player.lookingAtBlock) {
        const { x, y, z } = this.player.lookingAtBlock;
        const blockId = this.world.getBlock(x, y, z);
        let blockName = 'UNKNOWN';
        for (const [name, value] of Object.entries(BlockType)) {
            if (value === blockId) {
                blockName = name;
                break;
            }
        }
        if (document.getElementById('target-block')) {
            document.getElementById('target-block').innerText = `${blockName} (${x}, ${y}, ${z})`;
        }
    } else {
        if (document.getElementById('target-block')) {
            document.getElementById('target-block').innerText = 'None';
        }
    }
      
    // document.getElementById('chunk-count').innerText = this.world.chunks.size;
  }

  updateDayNightCycle(delta) {
    const oldTime = this.time;
    this.time += this.timeSpeed * delta * 10; // Speed up a bit
    
    if (this.time >= 24000) {
        this.time = 0;
        // New Day - Update Moon Phase
        if (this.moonTexture) {
            this.currentMoonPhase = (this.currentMoonPhase + 1) % 8;
            this.updateMoonPhase();
        }
    }

    const theta = (this.time / 24000) * Math.PI * 2;

    const playerPos = this.player.camera.position;
    const radius = 500;
    
    const sunX = -Math.cos(theta) * radius;
    const sunY = Math.sin(theta) * radius;
    const sunZ = 0; // Keep it simple for now, or add slight tilt

    // Update Sun
    this.sunLight.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z + sunZ);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();
    
    if (this.sunMesh) {
        this.sunMesh.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z + sunZ);
        this.sunMesh.lookAt(playerPos);
    }

    // Update Moon (Opposite to Sun)
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;
    
    this.moonLight.position.set(playerPos.x + moonX, playerPos.y + moonY, playerPos.z + moonZ);
    this.moonLight.target.position.copy(playerPos);
    this.moonLight.target.updateMatrixWorld();

    if (this.moonMesh) {
        this.moonMesh.position.set(playerPos.x + moonX, playerPos.y + moonY, playerPos.z + moonZ);
        this.moonMesh.lookAt(playerPos);
    }
    
    const sunHeight = sunY;
    const transitionHeight = 50; // Longer transition

    let t = 0; // 0 = Night, 1 = Day
    
    if (sunHeight > transitionHeight) {
        t = 1;
    } else if (sunHeight < -transitionHeight) {
        t = 0;
    } else {
        t = (sunHeight + transitionHeight) / (transitionHeight * 2);
    }

    // Dynamic Sky Color
    const dayColor = new THREE.Color(0x87CEEB);
    const sunsetColor = new THREE.Color(0xFD5E53);
    const nightColor = new THREE.Color(0x050510);
    
    let skyColor = new THREE.Color();
    
    if (t < 0.2) {
        // Night
        skyColor.copy(nightColor);
    } else if (t < 0.4) {
        // Sunrise / Sunset
        const localT = (t - 0.2) / 0.2;
        skyColor.copy(nightColor).lerp(sunsetColor, localT);
    } else if (t < 0.6) {
        // Sunset to Day
        const localT = (t - 0.4) / 0.2;
        skyColor.copy(sunsetColor).lerp(dayColor, localT);
    } else {
        // Day
        skyColor.copy(dayColor);
    }
    
    this.scene.background.copy(skyColor);
    this.scene.fog.color.copy(skyColor);
    
    // Dynamic Light Intensity & Color
    this.sunLight.intensity = Math.max(0, t * 1.2);
    
    // Warmer daylight (Hue 0.1 is Golden Yellow, Saturation 0.7 for warmth)
    if (t < 0.2) {
        this.sunLight.color.setHSL(0.05, 0.8, 0.6); // Dawn/Dusk - Orange/Red
    } else {
        // Warm golden daylight
        this.sunLight.color.setHSL(0.1, 0.7, 0.8); 
    }
    
    this.moonLight.intensity = Math.max(0, (1 - t) * 0.4);
    
    this.ambientLight.intensity = 0.1 + (0.5 * t);
    this.ambientLight.color.copy(skyColor).lerp(new THREE.Color(0xffffff), 0.5);

    if (this.clouds && this.clouds.mesh) {
        const dayCloudColor = new THREE.Color(0xffffff);
        const sunsetCloudColor = new THREE.Color(0xFFD700);
        const nightCloudColor = new THREE.Color(0x1a1a2e);
        
        let cloudColor = new THREE.Color();
        if (t < 0.3) cloudColor.copy(nightCloudColor);
        else if (t < 0.5) cloudColor.copy(nightCloudColor).lerp(sunsetCloudColor, (t - 0.3) / 0.2);
        else cloudColor.copy(sunsetCloudColor).lerp(dayCloudColor, (t - 0.5) / 0.5);

        this.clouds.mesh.material.color.copy(cloudColor);
    }
  }

  start(username, renderDistance) {
    this.world.renderDistance = renderDistance;
    this.world.farRenderDistance = renderDistance + 4; // Load a bit more than high detail
    
    // Force update of chunks to respect new render distance immediately
    this.world.lastChunkUpdatePos = { x: -999, z: -999 }; // Force update
    
    this.networkManager.connect(username);
    
    // Lock pointer to start playing
    this.player.controls.lock();
    
    // Spawn a test pig
    this.spawnEntity('pig', new THREE.Vector3(0, 50, 0));
    
    // this.isPlaying = true; // Will be set by NetworkManager on player_init
  }

  spawnEntity(type, position) {
      if (type === 'pig') {
          const pig = new Pig(this, position);
          this.entities.push(pig);
      }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.isPlaying) {
      this.player.update(delta);
      this.world.update(delta);
      this.networkManager.update(delta);

      // Update entities
      this.entities.forEach(entity => entity.update(delta));

      // Update dropped items
      for (let i = this.droppedItems.length - 1; i >= 0; i--) {
          const item = this.droppedItems[i];
          item.update(delta, this.player.camera.position);
          if (item.isCollected) {
              this.droppedItems.splice(i, 1);
          }
      }
    }
    
    this.clouds.update(delta);
    this.updateDayNightCycle(delta);
    
    this.updateDebugInfo();

    if (this.minimap) {
        this.minimap.update();
    }

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    
    if (this.player && this.player.heldItem) {
        this.player.heldItem.render(this.renderer);
    }
  }
}
