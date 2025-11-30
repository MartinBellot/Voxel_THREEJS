import { ItemDefinitions } from './Item.js';
import { BlockDefinitions } from './World/Block.js';
import * as THREE from 'three';
import { PlayerMesh } from './Player/PlayerMesh.js';

export class InventoryUI {
  constructor(game, inventory) {
    this.game = game;
    this.inventory = inventory;
    this.isOpen = false;
    this.cursorItem = null; // Item currently being dragged/held
    
    this.container = document.getElementById('inventory-menu');
    this.grid = document.getElementById('inventory-grid');
    this.hotbarContainer = document.getElementById('toolbar');
    
    // Create Tooltip Element
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'inventory-tooltip';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '5px 10px';
    this.tooltip.style.borderRadius = '4px';
    this.tooltip.style.pointerEvents = 'none'; // Don't block mouse events
    this.tooltip.style.display = 'none';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.fontFamily = 'Minecraft, monospace';
    this.tooltip.style.fontSize = '14px';
    document.body.appendChild(this.tooltip);

    this.setupCreativeMenu();
    this.setupEventListeners();
    this.setupCharacterPreview();
    this.updateHotbar();
  }

  updateGamemode(mode) {
      const creativeSection = this.container.querySelector('.creative-section');
      if (creativeSection) {
          creativeSection.style.display = mode === 'creative' ? 'block' : 'none';
      }
  }

  setupCharacterPreview() {
    const inventoryWindow = this.container.querySelector('.inventory-window');
    
    // Create Top Section Wrapper
    const topSection = document.createElement('div');
    topSection.className = 'inventory-top-section';
    
    // Character Preview Container
    const charContainer = document.createElement('div');
    charContainer.className = 'character-preview-container';
    
    // Armor Slots
    const armorSlots = document.createElement('div');
    armorSlots.className = 'armor-slots';
    // 3 slots for armor
    for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot armor-slot';
        // Optional: Add placeholder icons here
        armorSlots.appendChild(slot);
    }
    
    // Canvas Container
    const canvasContainer = document.createElement('div');
    canvasContainer.id = 'character-preview-canvas-container';
    
    charContainer.appendChild(armorSlots);
    charContainer.appendChild(canvasContainer);
    
    // Move Creative Grid to Top Section
    const creativeGrid = document.getElementById('creative-grid');
    const creativeHeader = inventoryWindow.querySelector('h3'); // "Creative Selection"
    
    const creativeSection = document.createElement('div');
    creativeSection.className = 'creative-section';
    if (creativeHeader) creativeSection.appendChild(creativeHeader);
    if (creativeGrid) creativeSection.appendChild(creativeGrid);
    
    topSection.appendChild(charContainer);
    topSection.appendChild(creativeSection);
    
    // Insert topSection at the beginning
    inventoryWindow.insertBefore(topSection, inventoryWindow.firstChild);
    
    // Initialize Three.js Scene for Preview
    this.previewScene = new THREE.Scene();
    // this.previewScene.background = new THREE.Color(0x000000); // Transparent or dark
    
    // Camera
    const aspect = 150 / 200; 
    this.previewCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.previewCamera.position.set(0, 1, 3.5);
    this.previewCamera.lookAt(0, 0.9, 0);
    
    // Renderer
    this.previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.previewRenderer.setSize(150, 200);
    this.previewRenderer.setClearColor(0x000000, 0);
    canvasContainer.appendChild(this.previewRenderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.previewScene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2, 5, 5);
    this.previewScene.add(dirLight);
    
    // Player Mesh
    this.previewPlayerMesh = new PlayerMesh(this.previewScene);
    this.previewPlayerMesh.mesh.rotation.y = Math.PI; // Initialize facing camera
    this.previewScene.add(this.previewPlayerMesh.mesh);
    
    // Mouse tracking for rotation
    this.mouseX = 0;
    this.mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    });
  }

  animatePreview() {
    if (!this.isOpen) return;
    
    this.previewAnimationId = requestAnimationFrame(() => this.animatePreview());
    
    if (this.previewPlayerMesh && this.previewPlayerMesh.mesh) {
        // Calculate mouse position relative to the preview canvas center
        const rect = this.previewRenderer.domElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const mouseX = this.mouseX || centerX;
        const mouseY = this.mouseY || centerY;
        
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        
        // Rotate 180 degrees (Math.PI) to face camera
        // Invert dx for correct left/right tracking when facing camera
        const yaw = Math.PI + (dx / 200); 
        let pitch = -(dy / 200);
        
        // Clamp pitch to prevent head from rotating too far (limit to ~60 degrees)
        const maxPitch = Math.PI / 3;
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
        
        this.previewPlayerMesh.update(0.016, false, false, yaw, pitch);
    }
    
    this.previewRenderer.render(this.previewScene, this.previewCamera);
  }

  setupCreativeMenu() {
    // Populate the creative grid with all available items
    const creativeGrid = document.getElementById('creative-grid');
    if (!creativeGrid) return;

    Object.keys(ItemDefinitions).forEach(key => {
      const itemType = parseInt(key);
      const def = ItemDefinitions[itemType];
      const blockDef = BlockDefinitions[def.blockType];
      
      const slot = document.createElement('div');
      slot.className = 'slot creative-slot';
      slot.dataset.type = itemType;
      
      // Visual representation
      const icon = document.createElement('div');
      icon.className = 'item-icon';
      
      if (def.texture) {
          icon.style.backgroundImage = `url('assets/textures/item/${def.texture}')`;
          icon.style.backgroundSize = 'contain';
          icon.style.backgroundRepeat = 'no-repeat';
          icon.style.backgroundPosition = 'center';
          icon.style.backgroundColor = 'transparent';
      } else if (blockDef && blockDef.color) {
        icon.style.backgroundColor = '#' + blockDef.color.toString(16).padStart(6, '0');
      }
      slot.appendChild(icon);
      
      // Tooltip
      // slot.title = def.name; // Disable native tooltip

      slot.addEventListener('mouseenter', (e) => {
          this.tooltip.innerText = def.name;
          this.tooltip.style.display = 'block';
          this.tooltip.style.left = (e.clientX + 15) + 'px';
          this.tooltip.style.top = (e.clientY + 15) + 'px';
      });

      slot.addEventListener('mousemove', (e) => {
          this.tooltip.style.left = (e.clientX + 15) + 'px';
          this.tooltip.style.top = (e.clientY + 15) + 'px';
      });

      slot.addEventListener('mouseleave', () => {
          this.tooltip.style.display = 'none';
      });

      slot.addEventListener('mousedown', (e) => {
        // In creative, clicking a slot gives you a stack of that item
        this.setCursorItem({ type: itemType, count: 64 });
      });

      creativeGrid.appendChild(slot);
    });
  }

  setupEventListeners() {
    // Toggle Inventory with E or Escape
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        if (this.game.console && this.game.console.isOpen) return;
        this.toggle();
      } else if (e.code === 'Escape') {
        if (this.isOpen) {
          this.toggle();
        }
      }
    });

    // Mouse move for cursor item
    document.addEventListener('mousemove', (e) => {
      const cursor = document.getElementById('cursor-item');
      if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      }
    });

    // Inventory Slots Interaction
    this.setupSlotListeners();
  }

  setupSlotListeners() {
    // We need to generate the player inventory slots in the DOM
    const playerGrid = document.getElementById('player-inventory-grid');
    playerGrid.innerHTML = '';

    // Main inventory (excluding hotbar)
    for (let i = 9; i < this.inventory.size; i++) {
      const slot = this.createSlotElement(i);
      playerGrid.appendChild(slot);
    }

    // Hotbar in the menu
    const hotbarGrid = document.getElementById('player-hotbar-grid');
    hotbarGrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slot = this.createSlotElement(i);
      hotbarGrid.appendChild(slot);
    }
  }

  createSlotElement(index) {
    const slot = document.createElement('div');
    slot.className = 'slot inventory-slot';
    slot.dataset.index = index;
    
    slot.addEventListener('mousedown', (e) => {
      this.handleSlotClick(index, e);
    });

    return slot;
  }

  handleSlotClick(index, e) {
    const item = this.inventory.getItem(index);
    
    if (!this.cursorItem) {
      // Pick up
      if (item) {
        this.setCursorItem(item);
        this.inventory.setItem(index, null, 0);
      }
    } else {
      // Place or Swap
      if (!item) {
        // Place into empty
        this.inventory.setItem(index, this.cursorItem.type, this.cursorItem.count);
        this.setCursorItem(null);
      } else {
        // Swap or Stack
        if (item.type === this.cursorItem.type) {
          // Stack
          const space = 64 - item.count;
          const toAdd = Math.min(space, this.cursorItem.count);
          item.count += toAdd;
          this.cursorItem.count -= toAdd;
          if (this.cursorItem.count <= 0) {
            this.setCursorItem(null);
          } else {
            this.updateCursorVisual();
          }
          this.inventory.notifyUpdate();
        } else {
          // Swap
          const temp = item;
          this.inventory.setItem(index, this.cursorItem.type, this.cursorItem.count);
          this.setCursorItem(temp);
        }
      }
    }
    this.updateSlots();
    this.updateHotbar();
  }

  setCursorItem(item) {
    this.cursorItem = item;
    this.updateCursorVisual();
  }

  updateCursorVisual() {
    let cursor = document.getElementById('cursor-item');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'cursor-item';
      document.body.appendChild(cursor);
    }

    if (this.cursorItem) {
      cursor.style.display = 'block';
      const def = ItemDefinitions[this.cursorItem.type];
      if (!def) {
        cursor.style.display = 'none';
        return;
      }
      const blockDef = def.blockType ? BlockDefinitions[def.blockType] : null;
      
      if (def.texture) {
          cursor.style.backgroundImage = `url('assets/textures/item/${def.texture}')`;
          cursor.style.backgroundSize = 'contain';
          cursor.style.backgroundRepeat = 'no-repeat';
          cursor.style.backgroundPosition = 'center';
          cursor.style.backgroundColor = 'transparent';
      } else {
          cursor.style.backgroundImage = 'none';
          cursor.style.backgroundColor = blockDef && blockDef.color ? '#' + blockDef.color.toString(16).padStart(6, '0') : '#fff';
      }
      cursor.innerText = this.cursorItem.count > 1 ? this.cursorItem.count : '';
    } else {
      cursor.style.display = 'none';
    }
  }

  updateSlots() {
    const slots = document.querySelectorAll('.inventory-slot');
    slots.forEach(slot => {
      const index = parseInt(slot.dataset.index);
      const item = this.inventory.getItem(index);
      this.renderSlotContent(slot, item);
    });
  }

  updateHotbar() {
    // Update the main HUD hotbar
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
      const item = this.inventory.getItem(i);
      const slot = document.createElement('div');
      slot.className = 'slot';
      if (i === this.inventory.selectedSlot) slot.classList.add('active');
      
      this.renderSlotContent(slot, item);
      
      slot.addEventListener('click', () => {
        // Select slot logic handled in Player, but we can trigger it here if needed
        // For now, Player handles scroll/keys.
      });
      
      toolbar.appendChild(slot);
    }
  }

  renderSlotContent(slotElement, item) {
    slotElement.innerHTML = '';
    // Check if item is valid and has a type (not null/undefined)
    if (item && item.type !== null && item.type !== undefined) {
      const def = ItemDefinitions[item.type];
      if (!def) {
        console.warn('Unknown item type:', item.type);
        return;
      }
      const blockDef = def.blockType ? BlockDefinitions[def.blockType] : null;
      
      const icon = document.createElement('div');
      icon.className = 'item-icon';
      
      if (def.texture) {
          icon.style.backgroundImage = `url('assets/textures/item/${def.texture}')`;
          icon.style.backgroundSize = 'contain';
          icon.style.backgroundRepeat = 'no-repeat';
          icon.style.backgroundPosition = 'center';
          icon.style.backgroundColor = 'transparent';
      } else if (blockDef && blockDef.color) {
        icon.style.backgroundColor = '#' + blockDef.color.toString(16).padStart(6, '0');
      }
      
      const count = document.createElement('span');
      count.className = 'item-count';
      count.innerText = item.count > 1 ? item.count : '';
      
      slotElement.appendChild(icon);
      slotElement.appendChild(count);
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.container.style.display = this.isOpen ? 'flex' : 'none';
    
    if (this.isOpen) {
      this.game.player.controls.unlock();
      this.updateSlots();
      this.animatePreview();
    } else {
      this.game.player.controls.lock();
      if (this.previewAnimationId) cancelAnimationFrame(this.previewAnimationId);
      // Drop held item if any? Or keep it. For now keep it.
    }
  }
}
