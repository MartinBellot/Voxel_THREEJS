import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import nipplejs from 'nipplejs';
import { Physics } from './Physics.js';
import { BlockType } from '../World/Block.js';
import { Inventory } from '../Inventory.js';
import { InventoryUI } from '../InventoryUI.js';
import { ItemDefinitions, ItemType, ItemCategory } from '../Item.js';
import { DroppedItem } from '../World/DroppedItem.js';
import { HeldItem } from './HeldItem.js';
import { PlayerMesh } from './PlayerMesh.js';
import { Bow } from '../Items/Bow.js';
import { BlockDefinitions, BlockDrops } from '../World/Block.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.camera.rotation.order = 'YXZ';
    
    this.playerMesh = new PlayerMesh(this.game.scene);
    this.game.scene.add(this.playerMesh.mesh);
    this.playerMesh.mesh.visible = false;
    this.isThirdPerson = false;
    this.eyePosition = new THREE.Vector3();
    this.isCameraOffset = false;

    // Virtual object for controls (Head Rotation)
    this.controlsObject = new THREE.Object3D();
    this.controlsObject.rotation.order = 'YXZ';
    this.controls = new PointerLockControls(this.controlsObject, document.body);
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.isSprinting = false;
    this.canJump = false;
    this.flyMode = false;
    this.lastSpacePressTime = 0;
    
    this.speed = 6.0;
    this.sprintSpeed = 10.0;
    this.flySpeed = 15.0;
    
    this.physics = new Physics(this);
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 5; // Portée d'interaction
    
    this.inventory = new Inventory(this.game);
    this.inventoryUI = new InventoryUI(this.game, this.inventory);
    
    this.heldItem = new HeldItem(this.game, this);
    this.currentItemLogic = null;
    this.lastSelectedSlot = -1;
    this.lastItemType = null;
    this.lastItemCount = -1;

    this.setupInputs();
    this.setupHighlight();
    
    // Mobile Check
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
        this.setupMobileControls();
    }
    
    // Position initiale
    this.camera.position.set(0, 80, 0); // Plus haut pour éviter de spawner dans le sol
    
    this.lastNetworkUpdate = 0;
    
    this.gamemode = 'survival';
    this.health = 20;
    this.maxHealth = 20;

    // Hunger system
    this.hunger = 20;
    this.maxHunger = 20;
    this.saturation = 5.0;
    this.exhaustion = 0;
    this.hungerTimer = 0;
    this.regenTimer = 0;
    this.starvationTimer = 0;

    // XP system
    this.xp = 0;
    this.level = 0;
    this.xpForNextLevel = 7; // Levels 0-16 need 2*level + 7

    // Damage cooldown
    this.damageCooldown = 0;
    this.lastDamageTime = 0;

    // Spawn point (set by bed)
    this.spawnPoint = new THREE.Vector3(0, 80, 0);

    // Block breaking progress
    this.breakingBlock = null; // {x, y, z}
    this.breakingProgress = 0;
    this.breakingTime = 0; // total time needed
    this.isBreaking = false;
    this.breakOverlay = null;
    this.setupBreakOverlay();
  }

  setGamemode(mode) {
    this.gamemode = mode;
    console.log(`Gamemode set to ${mode}`);
    
    if (mode === 'survival') {
        this.flyMode = false;
        this.canJump = true; // Reset jump ability
        document.getElementById('health-bar-container').style.display = 'flex';
        const hungerContainer = document.getElementById('hunger-bar-container');
        if (hungerContainer) hungerContainer.style.display = 'flex';
    } else {
        document.getElementById('health-bar-container').style.display = 'none';
        const hungerContainer = document.getElementById('hunger-bar-container');
        if (hungerContainer) hungerContainer.style.display = 'none';
    }
    
    // Update UI
    if (this.inventoryUI) {
        this.inventoryUI.updateGamemode(mode);
    }
    this.updateHealthUI();
  }

  setHealth(value) {
      this.health = Math.max(0, Math.min(this.maxHealth, value));
      this.updateHealthUI();
      if (this.health <= 0) {
        this.onDeath();
      }
  }

  takeDamage(amount) {
      if (this.gamemode !== 'survival') return;
      const now = performance.now();
      if (now - this.lastDamageTime < 500) return; // 0.5s invincibility
      this.lastDamageTime = now;

      // Armor reduction
      const armorPoints = this.getArmorPoints();
      const reducedDamage = Math.max(1, amount - armorPoints * 0.08 * amount);
      this.setHealth(this.health - Math.floor(reducedDamage));

      // Damage particles
      if (this.game.particleSystem) {
        const pos = this.camera.position;
        this.game.particleSystem.spawnDamage(pos.x, pos.y - 0.5, pos.z);
      }

      // Damage sound
      if (this.game.soundSystem) {
        this.game.soundSystem.playDamage();
      }
  }

  getArmorPoints() {
    let total = 0;
    // Armor slots: 36-39 (helmet, chestplate, leggings, boots)
    for (let i = 36; i <= 39; i++) {
      const item = this.inventory.getItem(i);
      if (item) {
        const def = ItemDefinitions[item.type];
        if (def && def.armorPoints) {
          total += def.armorPoints;
        }
      }
    }
    return total;
  }

  eatFood(itemType) {
    const def = ItemDefinitions[itemType];
    if (!def || !def.foodValue) return false;
    if (this.hunger >= this.maxHunger) return false;

    this.hunger = Math.min(this.maxHunger, this.hunger + def.foodValue);
    this.saturation = Math.min(this.hunger, this.saturation + (def.saturation || 0));
    this.updateHungerUI();

    // Eat sound
    if (this.game.soundSystem) {
      this.game.soundSystem.playEat();
    }

    return true;
  }

  useBed(x, y, z) {
    // Set spawn point
    this.spawnPoint.set(x, y + 1, z);

    // Can only sleep at night (time 12000-24000)
    if (this.game.time >= 12000 || this.game.time < 100) {
      // Skip to morning
      this.game.time = 100;
      // Show brief message
      const msg = document.createElement('div');
      msg.textContent = 'Spawn point set. Good morning!';
      msg.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);color:white;font-size:18px;font-family:monospace;background:rgba(0,0,0,0.6);padding:10px 20px;border-radius:4px;z-index:1000;pointer-events:none;';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } else {
      // Daytime - just set spawn
      const msg = document.createElement('div');
      msg.textContent = 'Spawn point set. You can only sleep at night.';
      msg.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);color:white;font-size:18px;font-family:monospace;background:rgba(0,0,0,0.6);padding:10px 20px;border-radius:4px;z-index:1000;pointer-events:none;';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  }

  addExhaustion(amount) {
    this.exhaustion += amount;
    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) {
        this.saturation = Math.max(0, this.saturation - 1);
      } else {
        this.hunger = Math.max(0, this.hunger - 1);
        this.updateHungerUI();
      }
    }
  }

  updateSurvival(delta) {
    if (this.gamemode !== 'survival') return;

    // Sprinting exhaustion
    if (this.isSprinting && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
      this.addExhaustion(0.1 * delta);
    }

    // Can't sprint with low hunger
    if (this.hunger <= 6) {
      this.isSprinting = false;
    }

    // Natural regeneration (when hunger >= 18 and health < 20)
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this.regenTimer += delta;
      if (this.regenTimer >= 0.5) {
        this.regenTimer = 0;
        this.setHealth(this.health + 1);
        this.addExhaustion(6);
      }
    } else {
      this.regenTimer = 0;
    }

    // Starvation (when hunger = 0)
    if (this.hunger <= 0) {
      this.starvationTimer += delta;
      if (this.starvationTimer >= 4) {
        this.starvationTimer = 0;
        if (this.health > 1) { // Don't kill on easy mode equiv
          this.takeDamage(1);
        }
      }
    } else {
      this.starvationTimer = 0;
    }
  }

  updateHungerUI() {
    const container = document.getElementById('hunger-bar');
    if (!container) return;
    container.innerHTML = '';
    const drumsticks = 10;
    for (let i = 0; i < drumsticks; i++) {
      const d = document.createElement('div');
      d.className = 'drumstick';
      const value = (i + 1) * 2;
      if (this.hunger >= value) {
        // full
      } else if (this.hunger >= value - 1) {
        d.classList.add('half');
      } else {
        d.classList.add('empty');
      }
      container.appendChild(d);
    }
  }

  // XP System
  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpForNextLevel) {
      this.xp -= this.xpForNextLevel;
      this.level++;
      this.xpForNextLevel = this.getXPForLevel(this.level);
    }
    this.updateXPUI();
    if (this.game.soundSystem) {
      this.game.soundSystem.playXP();
    }
  }

  getXPForLevel(level) {
    if (level < 16) return 2 * level + 7;
    if (level < 31) return 5 * level - 38;
    return 9 * level - 158;
  }

  updateXPUI() {
    const fill = document.getElementById('xp-bar-fill');
    const levelEl = document.getElementById('xp-level');
    const container = document.getElementById('xp-bar-container');
    
    if (container) {
      container.style.display = this.gamemode === 'survival' ? 'block' : 'none';
    }
    if (fill) {
      const pct = this.xpForNextLevel > 0 ? (this.xp / this.xpForNextLevel) * 100 : 0;
      fill.style.width = pct + '%';
    }
    if (levelEl) {
      levelEl.textContent = this.level;
    }
  }

  onDeath() {
    // Drop all items
    const pos = this.camera.position;
    for (let i = 0; i < 36; i++) {
      const item = this.inventory.getItem(i);
      if (item) {
        const dropped = new DroppedItem(this.game, pos.x, pos.y, pos.z, item.type, item.count);
        this.game.droppedItems.push(dropped);
        this.inventory.slots[i] = null;
      }
    }

    // Reset state
    this.health = this.maxHealth;
    this.hunger = 20;
    this.saturation = 5.0;
    this.exhaustion = 0;
    this.xp = 0;
    this.level = 0;
    this.xpForNextLevel = 7;

    // Respawn at spawn point (bed) or default
    this.camera.position.copy(this.spawnPoint);
    this.velocity.set(0, 0, 0);
    
    this.updateHealthUI();
    this.updateHungerUI();
    this.updateXPUI();
    this.inventoryUI.updateHotbar();
  }

  updateHealthUI() {
      const container = document.getElementById('health-bar');
      if (!container) return;
      
      container.innerHTML = '';
      
      // 10 hearts = 20 health
      const hearts = 10;
      
      for (let i = 0; i < hearts; i++) {
          const heart = document.createElement('div');
          heart.className = 'heart';
          
          const heartValue = (i + 1) * 2;
          
          if (this.health >= heartValue) {
              // Full heart
          } else if (this.health >= heartValue - 1) {
              // Half heart
              heart.classList.add('half');
          } else {
              // Empty heart
              heart.classList.add('empty');
          }
          
          container.appendChild(heart);
      }
  }

  setupHighlight() {
    const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.highlightMesh = new THREE.LineSegments(edges, material);
    this.highlightMesh.visible = false;
    this.game.scene.add(this.highlightMesh);
  }

  setupBreakOverlay() {
    const geometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: true,
      side: THREE.FrontSide,
    });
    this.breakOverlay = new THREE.Mesh(geometry, material);
    this.breakOverlay.visible = false;
    this.game.scene.add(this.breakOverlay);
  }

  getBlockBreakTime(blockType) {
    const blockDef = BlockDefinitions[blockType];
    if (!blockDef) return 0.5;
    if (blockDef.hardness <= 0) return blockDef.hardness < 0 ? Infinity : 0.05;

    const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
    const itemType = selectedItem ? selectedItem.type : null;
    const itemDef = itemType ? ItemDefinitions[itemType] : null;

    let speedMult = 1;
    let canHarvest = true;

    // Check if tool is needed and correct
    if (blockDef.miningLevel && blockDef.miningLevel > 0) {
      if (!itemDef || !itemDef.toolType) {
        canHarvest = false;
      } else {
        const effectiveTools = {
          stone: 'PICKAXE', metal: 'PICKAXE',
          dirt: 'SHOVEL', sand: 'SHOVEL',
          wood: 'AXE',
          wool: 'SHEARS', plant: 'SHEARS',
        };
        const needed = effectiveTools[blockDef.material] || 'PICKAXE';
        if (itemDef.toolType === needed && itemDef.miningLevel >= blockDef.miningLevel) {
          speedMult = itemDef.miningSpeed;
        } else if (itemDef.toolType === needed) {
          // Right tool but too low level
          canHarvest = false;
        } else {
          canHarvest = false;
        }
      }
    } else if (itemDef && itemDef.toolType) {
      const effectiveTools = {
        stone: 'PICKAXE', metal: 'PICKAXE',
        dirt: 'SHOVEL', sand: 'SHOVEL',
        wood: 'AXE',
      };
      const needed = effectiveTools[blockDef.material];
      if (itemDef.toolType === needed) {
        speedMult = itemDef.miningSpeed;
      }
    }

    return blockDef.hardness * (canHarvest ? 1.5 : 5.0) / speedMult;
  }

  startBreaking() {
    if (!this.highlightMesh.visible || !this.lookingAtBlock) return;
    const { x, y, z } = this.lookingAtBlock;
    const blockType = this.game.world.getBlock(x, y, z);
    if (!blockType || blockType === BlockType.AIR) return;
    if (blockType === BlockType.BEDROCK) return;

    // Creative mode: instant break
    if (this.gamemode === 'creative') {
      this.instantBreak(x, y, z, blockType);
      this._mouseDown = false;
      return;
    }

    const breakTime = this.getBlockBreakTime(blockType);
    if (breakTime === Infinity) return;
    if (breakTime <= 0.05) {
      this.instantBreak(x, y, z, blockType);
      this._mouseDown = false;
      return;
    }

    this.breakingBlock = { x, y, z };
    this.breakingProgress = 0;
    this.breakingTime = breakTime;
    this.isBreaking = true;
  }

  updateBreaking(delta) {
    if (!this.isBreaking || !this.breakingBlock) return;

    // Check if still looking at the same block
    if (!this.lookingAtBlock ||
        this.lookingAtBlock.x !== this.breakingBlock.x ||
        this.lookingAtBlock.y !== this.breakingBlock.y ||
        this.lookingAtBlock.z !== this.breakingBlock.z) {
      this.cancelBreaking();
      return;
    }

    this.breakingProgress += delta;
    const progress = Math.min(this.breakingProgress / this.breakingTime, 1);

    // Update break overlay
    if (this.breakOverlay) {
      this.breakOverlay.visible = true;
      this.breakOverlay.position.set(
        this.breakingBlock.x + 0.5,
        this.breakingBlock.y + 0.5,
        this.breakingBlock.z + 0.5
      );
      this.breakOverlay.material.opacity = progress * 0.6;
      this.breakOverlay.material.color.setHex(
        progress < 0.5 ? 0xffffff : (progress < 0.8 ? 0xffaa00 : 0xff0000)
      );
    }

    // Block broken
    if (this.breakingProgress >= this.breakingTime) {
      const { x, y, z } = this.breakingBlock;
      const blockType = this.game.world.getBlock(x, y, z);
      this.instantBreak(x, y, z, blockType);
      this.cancelBreaking();
    }
  }

  cancelBreaking() {
    this.isBreaking = false;
    this.breakingBlock = null;
    this.breakingProgress = 0;
    if (this.breakOverlay) {
      this.breakOverlay.visible = false;
    }
  }

  instantBreak(x, y, z, blockType) {
    this.game.world.setBlock(x, y, z, BlockType.AIR);

    // Spawn break particles
    const blockDef = BlockDefinitions[blockType];
    if (blockDef && this.game.particleSystem) {
      this.game.particleSystem.spawnBlockBreak(x, y, z, blockDef.color || 0x888888);
    }

    // Block break sound
    if (blockDef && this.game.soundSystem) {
      this.game.soundSystem.playBlockBreak(blockDef.material || 'stone');
    }

    // Determine drop
    if (blockType && blockType !== BlockType.AIR) {
      let dropType = blockType;
      if (BlockDrops[blockType] !== undefined) {
        if (BlockDrops[blockType] === null) {
          dropType = null; // No drop (glass)
        } else {
          // Resolve item type from name
          dropType = ItemType[BlockDrops[blockType]] || blockType;
        }
      }
      if (dropType !== null) {
        const item = new DroppedItem(this.game, x, y, z, dropType);
        this.game.droppedItems.push(item);
      }
    }

    // Tool durability
    const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
    if (selectedItem && this.gamemode === 'survival') {
      const itemDef = ItemDefinitions[selectedItem.type];
      if (itemDef && itemDef.durability) {
        selectedItem.durability = (selectedItem.durability || itemDef.durability) - 1;
        if (selectedItem.durability <= 0) {
          this.inventory.slots[this.inventory.selectedSlot] = null;
          this.inventoryUI.updateHotbar();
        }
      }
    }

    // Exhaustion from breaking blocks
    this.addExhaustion(0.005);

    // XP from mining ores
    if (this.gamemode === 'survival') {
      const oreXP = {
        [BlockType.COAL_ORE]: 1, [BlockType.DEEPSLATE_COAL_ORE]: 1,
        [BlockType.IRON_ORE]: 1, [BlockType.DEEPSLATE_IRON_ORE]: 1,
        [BlockType.COPPER_ORE]: 1, [BlockType.DEEPSLATE_COPPER_ORE]: 1,
        [BlockType.GOLD_ORE]: 1, [BlockType.DEEPSLATE_GOLD_ORE]: 1,
        [BlockType.LAPIS_ORE]: 3, [BlockType.DEEPSLATE_LAPIS_ORE]: 3,
        [BlockType.REDSTONE_ORE]: 2, [BlockType.DEEPSLATE_REDSTONE_ORE]: 2,
        [BlockType.DIAMOND_ORE]: 5, [BlockType.DEEPSLATE_DIAMOND_ORE]: 5,
        [BlockType.EMERALD_ORE]: 5, [BlockType.DEEPSLATE_EMERALD_ORE]: 5,
      };
      const xpAmount = oreXP[blockType];
      if (xpAmount) this.addXP(xpAmount);
    }

    if (this.game.networkManager && this.game.networkManager.connected) {
      this.game.networkManager.sendBlockUpdate(x, y, z, BlockType.AIR);
    }
  }

  // setupUI removed - handled by InventoryUI

  setupMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'block';

    // Joystick
    const zone = document.getElementById('joystick-zone');
    if (zone) {
        const manager = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white'
        });

        manager.on('move', (evt, data) => {
            const rad = data.angle.radian;
            const x = Math.cos(rad);
            const y = Math.sin(rad);
            
            // Threshold to determine direction
            this.moveForward = y > 0.3;
            this.moveBackward = y < -0.3;
            this.moveRight = x > 0.3; // Joystick Right is Move Right
            this.moveLeft = x < -0.3;
        });

        manager.on('end', () => {
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
        });
    }

    // Buttons
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.flyMode) {
                this.moveUp = true;
            } else if (this.physics.inWater) {
                this.canJump = true;
            } else if (this.canJump) {
                this.velocity.y = 9.0;
                this.canJump = false;
            }
        });
        btnJump.addEventListener('touchend', (e) => {
             e.preventDefault();
             this.moveUp = false;
        });
    }

    const btnAction = document.getElementById('btn-action');
    if (btnAction) {
        btnAction.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.placeBlock();
        });
    }

    // Console Toggle
    const btnConsole = document.getElementById('btn-console-toggle');
    if (btnConsole) {
        btnConsole.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.game.console) {
                if (this.game.console.isOpen) {
                    this.game.console.close();
                } else {
                    this.game.console.open();
                }
            }
        });
    }

    // Inventory Toggle
    const btnInventory = document.getElementById('btn-inventory-toggle');
    if (btnInventory) {
        btnInventory.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.inventoryUI.toggle();
        });
    }

    // Touch Look
    let lastTouchX = 0;
    let lastTouchY = 0;
    
    document.addEventListener('touchstart', (e) => {
        // Ignore if touching joystick or buttons
        if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
        
        if (e.touches.length > 0) {
            lastTouchX = e.touches[0].pageX;
            lastTouchY = e.touches[0].pageY;
            this.touchStartTime = Date.now();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
        
        if (e.touches.length > 0) {
            const touchX = e.touches[0].pageX;
            const touchY = e.touches[0].pageY;
            
            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;
            
            // Sensitivity
            const sensitivity = 0.005;
            
            this.camera.rotation.y -= deltaX * sensitivity;
            this.camera.rotation.x -= deltaY * sensitivity;
            
            // Clamp pitch
            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            
            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
         if (e.target.closest('#joystick-zone') || e.target.closest('#mobile-buttons')) return;
         
         // Detect tap for breaking block
         const touchDuration = Date.now() - this.touchStartTime;
         if (touchDuration < 200) { // Short tap
             this.breakBlock();
         }
    });
  }

  setupInputs() {
    this.controls.addEventListener('lock', () => {
      if (this.game.pauseMenu) this.game.pauseMenu.hide();
      if (this.inventoryUI.isOpen) this.inventoryUI.toggle(); // Close inventory if we lock (e.g. clicking back in game)
    });

    this.controls.addEventListener('unlock', () => {
      // Only show pause menu if we are playing and not in inventory/console
      if (this.game.isPlaying && !this.inventoryUI.isOpen && (!this.game.console || !this.game.console.isOpen)) {
        if (this.game.pauseMenu) this.game.pauseMenu.show();
      }
    });

    // Handle Escape key manually if Keyboard Lock is active
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape') {
            if (this.game.isPlaying && !this.inventoryUI.isOpen && (!this.game.console || !this.game.console.isOpen)) {
                // If menu is not visible, show it and unlock cursor
                if (this.game.pauseMenu && !this.game.pauseMenu.isVisible) {
                    this.game.pauseMenu.show();
                    this.controls.unlock();
                }
            }
        }
    });

    document.addEventListener('mousedown', (event) => {
      if (event.button === 1) event.preventDefault(); // Prevent auto-scroll on middle click
      if (this.controls.isLocked && !this.inventoryUI.isOpen) {
        if (event.button === 0) { // Clic gauche - attack mob or break block
          // Try attacking entity first
          if (!this.game.attackEntity()) {
            this.startBreaking();
          }
          this._mouseDown = true;
        } else if (event.button === 1) { // Middle click - pick block (creative)
          if (this.gamemode === 'creative' && this.lookingAtBlock) {
            const { x, y, z } = this.lookingAtBlock;
            const blockType = this.game.world.getBlock(x, y, z);
            if (blockType && blockType !== BlockType.AIR && ItemDefinitions[blockType]) {
              this.inventory.setItem(this.inventory.selectedSlot, blockType, 64);
              this.inventoryUI.updateHotbar();
            }
          }
        } else if (event.button === 2) { // Clic droit
          // Check if holding food
          const held = this.inventory.getItem(this.inventory.selectedSlot);
          if (held) {
            const heldDef = ItemDefinitions[held.type];
            if (heldDef && heldDef.foodValue && this.hunger < this.maxHunger) {
              if (this.eatFood(held.type)) {
                this.inventory.removeItem(this.inventory.selectedSlot, 1);
                this.inventoryUI.updateHotbar();
              }
              return;
            }
          }
          if (this.currentItemLogic) {
              this.currentItemLogic.onUseStart(this);
          } else {
              // Check if right-clicking an interactive block
              const intersection = this.getIntersection();
              if (intersection) {
                const hitPoint = intersection.point.clone().sub(intersection.face.normal.clone().multiplyScalar(0.5));
                const bx = Math.floor(hitPoint.x);
                const by = Math.floor(hitPoint.y);
                const bz = Math.floor(hitPoint.z);
                const clickedBlock = this.game.world.getBlock(bx, by, bz);
                
                if (clickedBlock === BlockType.CRAFTING_TABLE && this.game.craftingUI) {
                  this.game.craftingUI.openCraftingTable();
                  return;
                }
                if (clickedBlock === BlockType.FURNACE && this.game.craftingUI) {
                  this.game.craftingUI.openFurnace(bx, by, bz);
                  return;
                }
                if (clickedBlock === BlockType.CHEST && this.game.craftingUI) {
                  this.game.craftingUI.openChest(bx, by, bz);
                  return;
                }
                if (clickedBlock === BlockType.BED) {
                  this.useBed(bx, by, bz);
                  return;
                }
                if (clickedBlock === BlockType.ENCHANTING_TABLE && this.game.craftingUI) {
                  this.game.craftingUI.openEnchanting();
                  return;
                }
                // TNT ignition with flint and steel
                if (clickedBlock === BlockType.TNT) {
                  const heldItem = this.inventory.getItem(this.inventory.selectedSlot);
                  if (heldItem && heldItem.type === ItemType.FLINT_AND_STEEL) {
                    this.game.igniteTNT(bx, by, bz);
                    return;
                  }
                }
              }
              this.placeBlock();
          }
        }
      }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
          this._mouseDown = false;
          this.cancelBreaking();
        }
        if (this.controls.isLocked && !this.inventoryUI.isOpen) {
            if (event.button === 2) { // Clic droit
                if (this.currentItemLogic) {
                    this.currentItemLogic.onUseEnd(this);
                }
            }
        }
    });

    // Mouse Wheel for Hotbar
    document.addEventListener('wheel', (event) => {
      if (this.controls.isLocked) {
        if (event.deltaY > 0) {
          this.inventory.selectedSlot = (this.inventory.selectedSlot + 1) % 9;
        } else {
          this.inventory.selectedSlot = (this.inventory.selectedSlot - 1 + 9) % 9;
        }
        this.inventoryUI.updateHotbar();
      }
    });

    const onKeyDown = (event) => {
      // Handle Hotbar Selection 1-9
      if (event.code.startsWith('Digit') && event.code !== 'Digit0') {
        const slotIndex = parseInt(event.key) - 1;
        if (slotIndex >= 0 && slotIndex < 9) {
          this.inventory.selectedSlot = slotIndex;
          this.inventoryUI.updateHotbar();
        }
        return;
      }

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
        case 'KeyP':
          this.isThirdPerson = !this.isThirdPerson;
          this.playerMesh.mesh.visible = this.isThirdPerson;
          this.heldItem.mesh.visible = !this.isThirdPerson;
          if (!this.isThirdPerson && this.isCameraOffset) {
              this.camera.position.copy(this.eyePosition);
              this.isCameraOffset = false;
          }
          break;
        case 'Space':
          const now = Date.now();
          if (this.gamemode === 'creative' && now - this.lastSpacePressTime < 300) {
            this.flyMode = !this.flyMode;
            this.lastSpacePressTime = 0;
            if (this.flyMode) {
                this.velocity.y = 0;
            }
          } else {
            this.lastSpacePressTime = now;
          }

          if (this.flyMode) {
            this.moveUp = true;
          } else if (this.physics.inWater) {
              this.canJump = true; // Allow swimming up
          } else if (this.canJump) {
            this.velocity.y = 9.0;
            this.canJump = false;
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (this.flyMode) {
            this.moveDown = true;
          }
          this.isSprinting = true;
          break;
        case 'Escape':
          if (this.inventoryUI.isOpen) {
            this.inventoryUI.toggle();
          }
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
        case 'Space':
          this.moveUp = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.moveDown = false;
          this.isSprinting = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  getIntersection() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    // On récupère tous les meshes de chunks (uniquement les solides)
    const meshes = [];
    this.game.world.chunks.forEach(chunk => {
      if (chunk.meshes) {
        Object.values(chunk.meshes).forEach(mesh => meshes.push(mesh));
      }
      if (chunk.transparentMesh) {
        meshes.push(chunk.transparentMesh);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      return intersects[0];
    }
    return null;
  }

  breakBlock() {
    // Legacy method for mobile tap - just start and instantly check
    this.startBreaking();
  }

  placeBlock() {
    if (this.highlightMesh.visible) {
      const intersection = this.getIntersection();
      if (intersection) {
        const point = intersection.point;
        const normal = intersection.face.normal;
        
        // On calcule la position du bloc adjacent
        // Comme on a décalé les blocs de 0.5, ils sont centrés sur x.5
        // Le highlight est centré sur x.5
        // On veut trouver le centre du bloc adjacent
        
        const target = point.clone().add(normal.clone().multiplyScalar(0.5));
        const x = Math.floor(target.x);
        const y = Math.floor(target.y);
        const z = Math.floor(target.z);
        
        // Check for Spawn Pig
        const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
        if (selectedItem && selectedItem.type === ItemType.SPAWN_PIG) {
            // Spawn Pig
            // Center of the block
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('pig', spawnPos);
            return;
        }

        if (selectedItem && selectedItem.type === ItemType.SPAWN_CHICKEN) {
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('chicken', spawnPos);
            return;
        }

        if (selectedItem && selectedItem.type === ItemType.SPAWN_ZOMBIE) {
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('zombie', spawnPos);
            return;
        }

        if (selectedItem && selectedItem.type === ItemType.SPAWN_SKELETON) {
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('skeleton', spawnPos);
            return;
        }

        if (selectedItem && selectedItem.type === ItemType.SPAWN_CREEPER) {
            const spawnPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            this.game.spawnEntity('creeper', spawnPos);
            return;
        }

        // Vérification de collision avec le joueur
        const playerPos = this.camera.position;
        const playerWidth = this.physics.width;
        const playerHeight = this.physics.height;
        const playerDepth = this.physics.depth;
        const eyeHeight = 1.6; // Doit correspondre à Physics.js

        const playerMinX = playerPos.x - playerWidth / 2;
        const playerMaxX = playerPos.x + playerWidth / 2;
        const playerMinY = playerPos.y - eyeHeight;
        const playerMaxY = playerPos.y - eyeHeight + playerHeight;
        const playerMinZ = playerPos.z - playerDepth / 2;
        const playerMaxZ = playerPos.z + playerDepth / 2;

        const blockMinX = x;
        const blockMaxX = x + 1;
        const blockMinY = y;
        const blockMaxY = y + 1;
        const blockMinZ = z;
        const blockMaxZ = z + 1;

        // Test AABB (Axis-Aligned Bounding Box)
        if (playerMinX < blockMaxX && playerMaxX > blockMinX &&
            playerMinY < blockMaxY && playerMaxY > blockMinY &&
            playerMinZ < blockMaxZ && playerMaxZ > blockMinZ) {
          return; // Le joueur est dans le bloc, on ne pose pas
        }

        const blockType = this.inventory.getSelectedBlockType(ItemDefinitions);
        const itemDef = ItemDefinitions[this.inventory.getItem(this.inventory.selectedSlot)?.type];
        
        if (blockType && itemDef && itemDef.isPlaceable) {
          this.game.world.setBlock(x, y, z, blockType);

          // Place sound
          const placedDef = BlockDefinitions[blockType];
          if (placedDef && this.game.soundSystem) {
            this.game.soundSystem.playBlockPlace(placedDef.material || 'stone');
          }
          
          if (this.game.networkManager && this.game.networkManager.connected) {
              this.game.networkManager.sendBlockUpdate(x, y, z, blockType);
          }
          
          // Consume item
          this.inventory.removeItem(this.inventory.selectedSlot, 1);
          this.inventoryUI.updateHotbar();
          if (this.inventoryUI.isOpen) {
              this.inventoryUI.updateSlots();
          }
        }
      }
    }
  }

  updateHighlight() {
    const intersection = this.getIntersection();
    if (intersection) {
      const point = intersection.point;
      const normal = intersection.face.normal;
      
      // On recule un peu pour être dans le bloc visé
      const target = point.clone().add(normal.clone().multiplyScalar(-0.1));
      
      const x = Math.floor(target.x);
      const y = Math.floor(target.y);
      const z = Math.floor(target.z);
      
      this.highlightMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.highlightMesh.visible = true;
      this.lookingAtBlock = { x, y, z };
    } else {
      this.highlightMesh.visible = false;
      this.lookingAtBlock = null;
    }
  }

  update(delta) {
    // Restore camera position for physics/logic
    if (this.isCameraOffset) {
        this.camera.position.copy(this.eyePosition);
        this.isCameraOffset = false;
    }

    // Sync camera rotation with controls if in 1st person
    // In 3rd person, we'll override it later, but we need the "Head" rotation for logic
    // Actually, let's just use controlsObject for logic.

    this.updateHighlight();

    // Update block breaking
    if (this._mouseDown && this.isBreaking) {
      this.updateBreaking(delta);
    } else if (this._mouseDown && !this.isBreaking && this.lookingAtBlock) {
      // Re-start breaking if we moved to a new block while holding
      this.startBreaking();
    }

    // Update Held Item
    const selectedItem = this.inventory.getItem(this.inventory.selectedSlot);
    const currentItemType = selectedItem ? selectedItem.type : null;
    const currentItemCount = selectedItem ? selectedItem.count : 0;

    if (this.inventory.selectedSlot !== this.lastSelectedSlot || 
        currentItemType !== this.lastItemType ||
        currentItemCount !== this.lastItemCount) {
        
        this.heldItem.setItem(currentItemType);
        
        // Update Item Logic
        this.currentItemLogic = null;
        if (currentItemType) {
            const itemDef = ItemDefinitions[currentItemType];
            if (itemDef && itemDef.class === 'Bow') {
                this.currentItemLogic = new Bow(this.game);
            }
        }
        
        this.lastSelectedSlot = this.inventory.selectedSlot;
        this.lastItemType = currentItemType;
        this.lastItemCount = currentItemCount;
    }
    
    if (this.currentItemLogic) {
        this.currentItemLogic.onUpdate(delta, this);
    }
    
    this.heldItem.update(delta);

    if (this.controls.isLocked === true || this.isMobile) {
      
      // FOV Effect for sprinting
      const targetFOV = this.isSprinting ? 85 : 75;
      if (Math.abs(this.camera.fov - targetFOV) > 0.1) {
          this.camera.fov += (targetFOV - this.camera.fov) * delta * 10;
          this.camera.updateProjectionMatrix();
      }

      const currentSpeed = this.flyMode ? this.flySpeed : (this.isSprinting ? this.sprintSpeed : this.speed);

      // Calcul de la direction de mouvement souhaitée
      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize();

      // On applique la vitesse directement (mouvement "arcade" réactif)
      // La physique gérera les collisions et la gravité
      if (this.moveForward || this.moveBackward) {
        // On projette la direction de la caméra sur le plan XZ
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.controlsObject.quaternion);
        forward.y = 0;
        forward.normalize();
        
        // On ajoute le mouvement avant/arrière
        const moveZ = forward.multiplyScalar(this.direction.z * currentSpeed);
        this.velocity.x = moveZ.x;
        this.velocity.z = moveZ.z;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      if (this.moveLeft || this.moveRight) {
        // On calcule le vecteur "droite"
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.controlsObject.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveX = right.multiplyScalar(this.direction.x * currentSpeed);
        
        // Si on bouge déjà en Z, on combine
        if (this.moveForward || this.moveBackward) {
            // Normalisation si diagonale ? Pour l'instant simple addition
            this.velocity.x += moveX.x;
            this.velocity.z += moveX.z;
            // On renormalise la vitesse horizontale pour ne pas aller plus vite en diagonale
            const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
            if (horizontalVelocity.length() > currentSpeed) {
                horizontalVelocity.normalize().multiplyScalar(currentSpeed);
                this.velocity.x = horizontalVelocity.x;
                this.velocity.z = horizontalVelocity.y;
            }
        } else {
            this.velocity.x = moveX.x;
            this.velocity.z = moveX.z;
        }
      }
      
      // Si aucune touche n'est pressée, on arrête le mouvement horizontal
      if (!this.moveForward && !this.moveBackward && !this.moveLeft && !this.moveRight) {
          this.velocity.x = 0;
          this.velocity.z = 0;
      }

      // Mise à jour physique
      this.physics.update(delta);
      
      // Survival mechanics
      this.updateSurvival(delta);
      
      // Network Update (20 times per second)
      const now = performance.now();
      if (now - this.lastNetworkUpdate > 50) {
          this.lastNetworkUpdate = now;
          if (this.game.networkManager && this.game.networkManager.connected) {
              this.game.networkManager.send({
                  type: 'update',
                  position: {
                      x: this.camera.position.x,
                      y: this.camera.position.y,
                      z: this.camera.position.z
                  },
                  rotation: {
                      x: this.controlsObject.rotation.x,
                      y: this.controlsObject.rotation.y,
                      z: this.controlsObject.rotation.z
                  }
              });
          }
      }
    }

    // Update Player Mesh
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    this.playerMesh.update(delta, isMoving, this.isSprinting, this.controlsObject.rotation.y, this.controlsObject.rotation.x);
    
    // Mesh Position (Feet)
    const feetPos = this.camera.position.clone();
    feetPos.y -= 1.6; // Eye height to feet
    this.playerMesh.mesh.position.copy(feetPos);
    
    // Mesh Rotation is now handled inside PlayerMesh.update()

    // Third Person Camera
    if (this.isThirdPerson) {
        this.eyePosition.copy(this.camera.position);
        
        // Calculate offset
        // Back 5 units, Up 2 units for a plunging view
        const offset = new THREE.Vector3(0, 0, 5);
        offset.applyQuaternion(this.controlsObject.quaternion);
        
        this.camera.position.add(offset);
        
        // Look at the eye position
        this.camera.lookAt(this.eyePosition);
        
        this.isCameraOffset = true;
    } else {
        // Sync camera rotation with controls
        this.camera.quaternion.copy(this.controlsObject.quaternion);
    }
  }
}
