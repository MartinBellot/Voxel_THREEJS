import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { World } from './World/World.js';
import { Player } from './Player/Player.js';
import { Clouds } from './World/Clouds.js';
import { Console } from './Console.js';
import { TextureManager } from './Utils/TextureManager.js';
import { NetworkManager } from './NetworkManager.js';
import { PauseMenu } from './PauseMenu.js';
import { DroppedItem } from './World/DroppedItem.js';
import { BlockType } from './World/Block.js';
import { ItemDefinitions } from './Item.js';
import { CraftingUI } from './CraftingUI.js';
import { Pig } from './Entities/Pig.js';
import { Chicken } from './Entities/Chicken.js';
import { Zombie } from './Entities/Zombie.js';
import { Skeleton } from './Entities/Skeleton.js';
import { Creeper } from './Entities/Creeper.js';
import { TNTEntity } from './Entities/TNT.js';
import { Minimap } from './Minimap/Minimap.js';
import { ParticleSystem } from './ParticleSystem.js';
import { WeatherSystem } from './WeatherSystem.js';
import { SoundSystem } from './SoundSystem.js';

export class Game {
  constructor() {
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 180); // Tighter fog to hide chunk edges

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 10, 0);

    // Renderer will be created in init()
    this.renderer = null;
    this.rendererType = 'webgpu'; // Default

    this.clock = new THREE.Clock();
    this.frames = 0;
    this.lastTime = performance.now();

    // Pre-allocated colors for day/night cycle (avoid GC pressure)
    this._dayColor = new THREE.Color(0x87CEEB);
    this._sunsetColor = new THREE.Color(0xFD5E53);
    this._nightColor = new THREE.Color(0x050510);
    this._skyColor = new THREE.Color();
    this._dayCloudColor = new THREE.Color(0xffffff);
    this._sunsetCloudColor = new THREE.Color(0xFFD700);
    this._nightCloudColor = new THREE.Color(0x1a1a2e);
    this._cloudColor = new THREE.Color();
    this._ambientLerpTarget = new THREE.Color(0xffffff);
    this._debugUpdateTimer = 0;

    // Day/Night Cycle
    this.time = 6000; // 0-24000, 6000 is noon
    this.timeSpeed = 2; // 20min full cycle (same as Minecraft)

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
    this.craftingUI = null; // Created after player is ready
    this.particleSystem = new ParticleSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.soundSystem = new SoundSystem();
    
    this.droppedItems = [];
    this.entities = [];

    // Network
    this.networkManager = new NetworkManager(this);
    // Connection will be initiated in start()
    
    this.isPlaying = false;

    this.setupLights();
    this.setupTorchLights();
    this.setupCelestialBodies();
    this.setupEvents();
  }

  async init(rendererType = 'webgpu') {
    this.rendererType = rendererType;

    // Create renderer based on type
    if (rendererType === 'webgpu') {
      this.renderer = new WebGPURenderer({ canvas: this.canvas, antialias: false });
      await this.renderer.init();
    } else {
      // WebGL fallback
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Fastest shadow type
    this.renderer.autoClear = false;

    // Start animation loop
    this.animate();
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 512; // Reduced for performance
    this.sunLight.shadow.mapSize.height = 512;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 100; // Tighter shadow distance
    this.sunLight.shadow.camera.left = -50; // Tighter shadow frustum
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x6666ff, 0.4);
    this.moonLight.position.set(-10, -20, -10);
    this.moonLight.castShadow = false; // Disable moon shadows for performance
    this.scene.add(this.moonLight);
  }

  setupTorchLights() {
    // Pool of PointLights for nearby torches (max 6 for performance)
    this.torchLightPool = [];
    this.torchLightCount = 6;
    this._lastTorchUpdate = 0;
    for (let i = 0; i < this.torchLightCount; i++) {
      const light = new THREE.PointLight(0xFF9933, 1.2, 12, 2);
      light.visible = false;
      this.scene.add(light);
      this.torchLightPool.push(light);
    }
  }

  updateTorchLights() {
    if (!this.player || !this.world) return;
    const now = performance.now();
    if (now - this._lastTorchUpdate < 500) return; // Update every 500ms
    this._lastTorchUpdate = now;

    const px = Math.floor(this.player.camera.position.x);
    const py = Math.floor(this.player.camera.position.y);
    const pz = Math.floor(this.player.camera.position.z);
    const searchRadius = 10;

    // Find nearby torch blocks
    const torches = [];
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
          const bx = px + dx, by = py + dy, bz = pz + dz;
          const block = this.world.getBlock(bx, by, bz);
          if (block === BlockType.TORCH || block === BlockType.GLOWSTONE ||
              block === BlockType.SEA_LANTERN || block === BlockType.JACK_O_LANTERN) {
            const distSq = dx * dx + dy * dy + dz * dz;
            torches.push({ x: bx + 0.5, y: by + 0.7, z: bz + 0.5, distSq });
          }
        }
      }
    }

    // Sort by distance, take closest N
    torches.sort((a, b) => a.distSq - b.distSq);

    for (let i = 0; i < this.torchLightCount; i++) {
      const light = this.torchLightPool[i];
      if (i < torches.length) {
        light.position.set(torches[i].x, torches[i].y, torches[i].z);
        light.visible = true;
      } else {
        light.visible = false;
      }
    }
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
      if (this.renderer) {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
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

    // Dynamic Sky Color (using pre-allocated colors)
    if (t < 0.2) {
        this._skyColor.copy(this._nightColor);
    } else if (t < 0.4) {
        const localT = (t - 0.2) / 0.2;
        this._skyColor.copy(this._nightColor).lerp(this._sunsetColor, localT);
    } else if (t < 0.6) {
        const localT = (t - 0.4) / 0.2;
        this._skyColor.copy(this._sunsetColor).lerp(this._dayColor, localT);
    } else {
        this._skyColor.copy(this._dayColor);
    }
    
    this.scene.background.copy(this._skyColor);
    this.scene.fog.color.copy(this._skyColor);
    
    // Dynamic Light Intensity & Color
    this.sunLight.intensity = Math.max(0, t * 1.2);
    
    if (t < 0.2) {
        this.sunLight.color.setHSL(0.05, 0.8, 0.6);
    } else {
        this.sunLight.color.setHSL(0.1, 0.7, 0.8); 
    }
    
    this.moonLight.intensity = Math.max(0, (1 - t) * 0.4);
    
    this.ambientLight.intensity = 0.1 + (0.5 * t);
    this.ambientLight.color.copy(this._skyColor).lerp(this._ambientLerpTarget, 0.5);

    if (this.clouds && this.clouds.mesh) {
        if (t < 0.3) this._cloudColor.copy(this._nightCloudColor);
        else if (t < 0.5) this._cloudColor.copy(this._nightCloudColor).lerp(this._sunsetCloudColor, (t - 0.3) / 0.2);
        else this._cloudColor.copy(this._sunsetCloudColor).lerp(this._dayCloudColor, (t - 0.5) / 0.5);

        this.clouds.mesh.material.color.copy(this._cloudColor);
    }
  }

  async start(username, renderDistance, rendererType = 'webgpu') {
    // Initialize renderer if not already done
    if (!this.renderer) {
      await this.init(rendererType);
    }

    this.world.renderDistance = renderDistance;
    this.world.farRenderDistance = renderDistance + 2; // Tight buffer for performance
    
    // Force update of chunks to respect new render distance immediately
    this.world.lastChunkUpdatePos = { x: -999, z: -999 }; // Force update
    
    this.networkManager.connect(username);
    
    // Lock pointer to start playing
    this.player.controls.lock();
    
    // Initialize crafting UI
    this.craftingUI = new CraftingUI(this);
    
    // Spawn a test pig
    this.spawnEntity('pig', new THREE.Vector3(0, 50, 0));
    
    // this.isPlaying = true; // Will be set by NetworkManager on player_init
  }

  spawnEntity(type, position) {
      if (type === 'pig') {
          const pig = new Pig(this, position);
          this.entities.push(pig);
      } else if (type === 'chicken') {
          const chicken = new Chicken(this, position);
          this.entities.push(chicken);
      } else if (type === 'zombie') {
          const zombie = new Zombie(this, position);
          this.entities.push(zombie);
      } else if (type === 'skeleton') {
          const skeleton = new Skeleton(this, position);
          this.entities.push(skeleton);
      } else if (type === 'creeper') {
          const creeper = new Creeper(this, position);
          this.entities.push(creeper);
      }
  }

  igniteTNT(x, y, z) {
    const tnt = new TNTEntity(this, x, y, z);
    this.entities.push(tnt);
  }

  // Mob spawning system
  mobSpawnTimer = 0;
  maxHostileMobs = 20;
  maxPassiveMobs = 10;

  updateMobSpawning(delta) {
    this.mobSpawnTimer += delta;
    if (this.mobSpawnTimer < 5) return; // Check every 5 seconds
    this.mobSpawnTimer = 0;

    const playerPos = this.player.camera.position;
    const isNight = this.time >= 12000;

    // Count current mobs
    let hostileCount = 0;
    let passiveCount = 0;
    for (const e of this.entities) {
      if (e.type === 'zombie' || e.type === 'skeleton' || e.type === 'creeper' || e.type === 'skeleton_arrow') {
        hostileCount++;
      } else {
        passiveCount++;
      }
    }

    // Spawn hostile mobs at night
    if (isNight && hostileCount < this.maxHostileMobs) {
      const spawnAttempts = 2;
      for (let i = 0; i < spawnAttempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 40; // 24-64 blocks away
        const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);
        const sy = this.world.getHeight(sx, sz);

        if (sy > 0) {
          const block = this.world.getBlock(sx, sy - 1, sz);
          if (block !== 0 && block !== BlockType.WATER && block !== BlockType.LAVA) {
            const pos = new THREE.Vector3(sx + 0.5, sy, sz + 0.5);
            const types = ['zombie', 'skeleton', 'creeper'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnEntity(type, pos);
          }
        }
      }
    }

    // Spawn passive mobs during day
    if (!isNight && passiveCount < this.maxPassiveMobs) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 48;
      const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
      const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);
      const sy = this.world.getHeight(sx, sz);

      if (sy > 0) {
        const block = this.world.getBlock(sx, sy - 1, sz);
        if (block === BlockType.GRASS) {
          const pos = new THREE.Vector3(sx + 0.5, sy, sz + 0.5);
          const type = Math.random() < 0.5 ? 'pig' : 'chicken';
          this.spawnEntity(type, pos);
        }
      }
    }

    // Despawn mobs too far from player
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const dist = e.position.distanceTo(playerPos);
      if (dist > 128) {
        e.dispose();
        this.entities.splice(i, 1);
      }
    }
  }

  // Attack entity closest to crosshair
  attackEntity() {
    const playerPos = this.player.camera.position;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    let closest = null;
    let closestDist = 4; // melee reach

    for (const entity of this.entities) {
      if (entity.type === 'skeleton_arrow') continue;
      const toEntity = new THREE.Vector3().subVectors(entity.position, playerPos);
      toEntity.y = toEntity.y - entity.height / 2 + 0.5; // Aim at center
      const dist = toEntity.length();
      if (dist > closestDist) continue;

      // Check if roughly in front of player
      const dot = toEntity.normalize().dot(dir);
      if (dot > 0.7) { // ~45 degree cone
        closestDist = dist;
        closest = entity;
      }
    }

    if (closest) {
      // Calculate attack damage
      let damage = 1; // Fist damage
      const held = this.player.inventory.getItem(this.player.inventory.selectedSlot);
      if (held) {
        const def = ItemDefinitions[held.type];
        if (def && def.damage) {
          damage = def.damage;
        }
      }

      closest.takeDamage(damage);

      // Knockback
      const kb = new THREE.Vector3().subVectors(closest.position, playerPos).normalize();
      closest.velocity.x += kb.x * 5;
      closest.velocity.z += kb.z * 5;
      closest.velocity.y += 4;

      return true;
    }
    return false;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.isPlaying) {
      this.player.update(delta);
      this.world.update(delta);
      this.networkManager.update(delta);
      this.updateTorchLights();

      // Update entities
      this.entities.forEach(entity => entity.update(delta));

      // Remove dead entities and spawn drops
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const entity = this.entities[i];
        if (entity.health <= 0) {
          if (entity.getDrops) {
            const drops = entity.getDrops();
            for (const drop of drops) {
              for (let d = 0; d < drop.count; d++) {
                const dropItem = new DroppedItem(
                  this,
                  Math.floor(entity.position.x),
                  Math.floor(entity.position.y),
                  Math.floor(entity.position.z),
                  drop.type
                );
                this.droppedItems.push(dropItem);
              }
            }
          }
          // XP from killing mobs
          const xpTable = { zombie: 5, skeleton: 5, creeper: 5, pig: 1, chicken: 1 };
          const xpAmount = xpTable[entity.type] || 0;
          if (xpAmount && this.player) this.player.addXP(xpAmount);
          
          entity.dispose();
          this.entities.splice(i, 1);
        }
      }

      // Mob spawning
      this.updateMobSpawning(delta);

      // Update furnaces
      if (this.craftingUI) {
        this.craftingUI.updateFurnaces(delta);
      }

      // Update particles
      this.particleSystem.update(delta);

      // Update weather
      this.weatherSystem.update(delta);

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

    if (this.renderer) {
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      
      if (this.player && this.player.heldItem) {
          this.player.heldItem.render(this.renderer);
      }
    }
  }
}
