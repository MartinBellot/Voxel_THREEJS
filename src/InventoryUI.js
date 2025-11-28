import { ItemDefinitions } from './Item.js';
import { BlockDefinitions } from './World/Block.js';

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
    this.updateHotbar();
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
      const blockDef = BlockDefinitions[def.blockType];
      
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
    if (item) {
      const def = ItemDefinitions[item.type];
      const blockDef = BlockDefinitions[def.blockType];
      
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
    } else {
      this.game.player.controls.lock();
      // Drop held item if any? Or keep it. For now keep it.
    }
  }
}
