import { ItemDefinitions, ItemType } from './Item.js';
import { BlockDefinitions } from './World/Block.js';
import { CraftingSystem } from './CraftingSystem.js';
import { FurnaceState } from './FurnaceSystem.js';
import { getRandomEnchantments, formatEnchantment } from './EnchantingSystem.js';

export class CraftingUI {
  constructor(game) {
    this.game = game;
    this.craftingSystem = new CraftingSystem();
    this.inventory = game.player.inventory;
    
    // 2x2 crafting (player inventory)
    this.craftingGrid2x2 = [null, null, null, null];
    
    // 3x3 crafting (crafting table)
    this.craftingGrid3x3 = Array(9).fill(null);
    
    // Furnace state
    this.furnaceStates = new Map(); // key -> FurnaceState
    this.activeFurnaceKey = null;
    
    // UI state
    this.craftingTableOpen = false;
    this.furnaceOpen = false;
    
    // Chest storage: key "x,y,z" -> Array(27) of items
    this.chestStorage = new Map();
    this.activeChestKey = null;
    
    this.setupCraftingGrid('crafting-grid-2x2', 2);
    this.setupCraftingGrid('crafting-grid-3x3', 3);
    this.setupFurnaceSlots();
    this.setupCraftingTableInventory();
    this.setupFurnaceInventory();
    this.setupCloseHandlers();
  }

  setupCraftingGrid(elementId, size) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    
    const totalSlots = size * size;
    for (let i = 0; i < totalSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot crafting-input-slot';
      slot.dataset.index = i;
      slot.dataset.gridSize = size;
      
      slot.addEventListener('mousedown', (e) => {
        this.handleCraftingSlotClick(i, size, e);
      });
      
      container.appendChild(slot);
    }
  }

  setupFurnaceSlots() {
    const input = document.getElementById('furnace-input');
    const fuel = document.getElementById('furnace-fuel');
    const result = document.getElementById('furnace-result');
    
    if (input) {
      input.addEventListener('mousedown', (e) => this.handleFurnaceSlotClick('input', e));
    }
    if (fuel) {
      fuel.addEventListener('mousedown', (e) => this.handleFurnaceSlotClick('fuel', e));
    }
    if (result) {
      result.addEventListener('mousedown', (e) => this.handleFurnaceSlotClick('result', e));
    }
  }

  setupCraftingTableInventory() {
    const invGrid = document.getElementById('ct-inventory-grid');
    const hotbarGrid = document.getElementById('ct-hotbar-grid');
    if (!invGrid || !hotbarGrid) return;
    
    invGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';
    
    for (let i = 9; i < this.inventory.size; i++) {
      const slot = this.createInventorySlot(i, 'ct');
      invGrid.appendChild(slot);
    }
    
    for (let i = 0; i < 9; i++) {
      const slot = this.createInventorySlot(i, 'ct');
      hotbarGrid.appendChild(slot);
    }
  }

  setupFurnaceInventory() {
    const invGrid = document.getElementById('furnace-inventory-grid');
    const hotbarGrid = document.getElementById('furnace-hotbar-grid');
    if (!invGrid || !hotbarGrid) return;
    
    invGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';
    
    for (let i = 9; i < this.inventory.size; i++) {
      const slot = this.createInventorySlot(i, 'furnace');
      invGrid.appendChild(slot);
    }
    
    for (let i = 0; i < 9; i++) {
      const slot = this.createInventorySlot(i, 'furnace');
      hotbarGrid.appendChild(slot);
    }
  }

  createInventorySlot(index, prefix) {
    const slot = document.createElement('div');
    slot.className = 'slot inventory-slot';
    slot.dataset.index = index;
    slot.dataset.prefix = prefix;
    
    slot.addEventListener('mousedown', (e) => {
      this.game.player.inventoryUI.handleSlotClick(index, e);
      this.updateAllSlots();
    });
    
    return slot;
  }

  setupCloseHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyE') {
        if (this.craftingTableOpen) {
          this.closeCraftingTable();
        }
        if (this.furnaceOpen) {
          this.closeFurnace();
        }
        const enchMenu = document.getElementById('enchanting-menu');
        if (enchMenu && enchMenu.style.display !== 'none') {
          this.closeEnchanting();
        }
        const chestMenu = document.getElementById('chest-menu');
        if (chestMenu && chestMenu.style.display !== 'none') {
          this.closeChest();
        }
      }
    });
  }

  // Open crafting table (3x3)
  openCraftingTable() {
    this.craftingTableOpen = true;
    document.getElementById('crafting-table-menu').style.display = 'flex';
    this.game.player.controls.unlock();
    this.craftingGrid3x3.fill(null);
    this.updateAllSlots();
  }

  closeCraftingTable() {
    this.craftingTableOpen = false;
    document.getElementById('crafting-table-menu').style.display = 'none';
    
    // Return crafting items to inventory
    for (let i = 0; i < this.craftingGrid3x3.length; i++) {
      if (this.craftingGrid3x3[i]) {
        this.inventory.addItem(this.craftingGrid3x3[i].type, this.craftingGrid3x3[i].count);
        this.craftingGrid3x3[i] = null;
      }
    }
    
    this.game.player.inventoryUI.updateHotbar();
    this.game.player.inventoryUI.updateInventorySlots();
  }

  // Open furnace
  openFurnace(blockX, blockY, blockZ) {
    this.furnaceOpen = true;
    this.activeFurnaceKey = `${blockX},${blockY},${blockZ}`;
    
    if (!this.furnaceStates.has(this.activeFurnaceKey)) {
      this.furnaceStates.set(this.activeFurnaceKey, new FurnaceState());
    }
    
    document.getElementById('furnace-menu').style.display = 'flex';
    this.game.player.controls.unlock();
    this.updateAllSlots();
    this.startFurnaceUpdate();
  }

  closeFurnace() {
    this.furnaceOpen = false;
    document.getElementById('furnace-menu').style.display = 'none';
    this.activeFurnaceKey = null;
    
    this.game.player.inventoryUI.updateHotbar();
    this.game.player.inventoryUI.updateInventorySlots();
  }

  startFurnaceUpdate() {
    if (!this.furnaceOpen) return;
    
    const state = this.furnaceStates.get(this.activeFurnaceKey);
    if (state) {
      state.update(1 / 20); // Simulate at 20 tps
      this.updateFurnaceDisplay(state);
    }
    
    setTimeout(() => this.startFurnaceUpdate(), 50);
  }

  updateFurnaceDisplay(state) {
    const fire = document.getElementById('furnace-fire');
    const arrowFill = document.getElementById('furnace-arrow-fill');
    
    if (fire) {
      fire.classList.toggle('active', state.burnTime > 0);
    }
    if (arrowFill) {
      const progress = state.cookProgress / 10 * 100;
      arrowFill.style.width = progress + '%';
    }
    
    this.updateFurnaceSlotDisplay('furnace-input', state.inputSlot);
    this.updateFurnaceSlotDisplay('furnace-fuel', state.fuelSlot);
    this.updateFurnaceSlotDisplay('furnace-result', state.outputSlot);
  }

  handleCraftingSlotClick(index, gridSize, e) {
    const grid = gridSize === 2 ? this.craftingGrid2x2 : this.craftingGrid3x3;
    const cursorItem = this.game.player.inventoryUI.cursorItem;
    
    if (!cursorItem) {
      // Pick up from crafting slot
      if (grid[index]) {
        this.game.player.inventoryUI.setCursorItem(grid[index]);
        grid[index] = null;
      }
    } else {
      // Place in crafting slot
      if (!grid[index]) {
        if (e.button === 2) {
          // Right click: place one
          grid[index] = { type: cursorItem.type, count: 1 };
          cursorItem.count--;
          if (cursorItem.count <= 0) {
            this.game.player.inventoryUI.setCursorItem(null);
          } else {
            this.game.player.inventoryUI.updateCursorVisual();
          }
        } else {
          grid[index] = { ...cursorItem };
          this.game.player.inventoryUI.setCursorItem(null);
        }
      } else if (grid[index].type === cursorItem.type) {
        // Stack
        grid[index].count += cursorItem.count;
        this.game.player.inventoryUI.setCursorItem(null);
      } else {
        // Swap
        const temp = grid[index];
        grid[index] = { ...cursorItem };
        this.game.player.inventoryUI.setCursorItem(temp);
      }
    }
    
    this.checkCraftingRecipe(gridSize);
    this.updateCraftingDisplay(gridSize);
  }

  handleCraftingOutputClick(gridSize) {
    const outputId = gridSize === 2 ? 'crafting-output' : 'crafting-table-output';
    const grid = gridSize === 2 ? this.craftingGrid2x2 : this.craftingGrid3x3;
    
    const result = this.craftingSystem.findRecipe(grid, gridSize);
    if (!result) return;
    
    const cursorItem = this.game.player.inventoryUI.cursorItem;
    
    // Check if cursor is empty or same type
    if (cursorItem && cursorItem.type !== result.type) return;
    if (cursorItem && cursorItem.count + result.count > 64) return;
    
    // Consume ingredients
    this.craftingSystem.consumeIngredients(grid, gridSize);
    
    // Give result
    if (cursorItem) {
      cursorItem.count += result.count;
      this.game.player.inventoryUI.updateCursorVisual();
    } else {
      this.game.player.inventoryUI.setCursorItem({ type: result.type, count: result.count });
    }
    
    this.checkCraftingRecipe(gridSize);
    this.updateCraftingDisplay(gridSize);
  }

  handleFurnaceSlotClick(slotName, e) {
    const state = this.furnaceStates.get(this.activeFurnaceKey);
    if (!state) return;
    
    const cursorItem = this.game.player.inventoryUI.cursorItem;
    let slotItem;
    
    if (slotName === 'input') slotItem = state.inputSlot;
    else if (slotName === 'fuel') slotItem = state.fuelSlot;
    else slotItem = state.outputSlot;
    
    if (!cursorItem) {
      // Pick up
      if (slotItem) {
        this.game.player.inventoryUI.setCursorItem({ ...slotItem });
        if (slotName === 'input') state.inputSlot = null;
        else if (slotName === 'fuel') state.fuelSlot = null;
        else state.outputSlot = null;
      }
    } else {
      if (slotName === 'result') {
        // Can only take from result
        return;
      }
      
      if (!slotItem) {
        if (slotName === 'input') state.inputSlot = { ...cursorItem };
        else state.fuelSlot = { ...cursorItem };
        this.game.player.inventoryUI.setCursorItem(null);
      } else if (slotItem.type === cursorItem.type) {
        slotItem.count += cursorItem.count;
        this.game.player.inventoryUI.setCursorItem(null);
      } else {
        // Swap
        const temp = { ...slotItem };
        if (slotName === 'input') state.inputSlot = { ...cursorItem };
        else state.fuelSlot = { ...cursorItem };
        this.game.player.inventoryUI.setCursorItem(temp);
      }
    }
    
    this.updateFurnaceDisplay(state);
  }

  checkCraftingRecipe(gridSize) {
    const grid = gridSize === 2 ? this.craftingGrid2x2 : this.craftingGrid3x3;
    const result = this.craftingSystem.findRecipe(grid, gridSize);
    
    const outputId = gridSize === 2 ? 'crafting-output' : 'crafting-table-output';
    const outputSlot = document.getElementById(outputId);
    if (!outputSlot) return;
    
    outputSlot.innerHTML = '';
    outputSlot.onclick = null;
    
    if (result) {
      this.renderSlotItem(outputSlot, result.type, result.count);
      outputSlot.onclick = () => this.handleCraftingOutputClick(gridSize);
    }
  }

  renderSlotItem(slot, itemType, count) {
    const def = ItemDefinitions[itemType];
    const blockDef = BlockDefinitions[itemType];
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    
    if (def && def.texture) {
      icon.style.backgroundImage = `url('assets/textures/item/${def.texture}')`;
      icon.style.backgroundSize = 'contain';
      icon.style.backgroundRepeat = 'no-repeat';
      icon.style.backgroundPosition = 'center';
    } else if (blockDef && blockDef.color) {
      icon.style.backgroundColor = '#' + blockDef.color.toString(16).padStart(6, '0');
      icon.style.width = '32px';
      icon.style.height = '32px';
    } else {
      icon.style.backgroundColor = '#888';
      icon.style.width = '32px';
      icon.style.height = '32px';
    }
    
    slot.appendChild(icon);
    
    if (count > 1) {
      const countEl = document.createElement('div');
      countEl.className = 'item-count';
      countEl.textContent = count;
      slot.appendChild(countEl);
    }
  }

  updateCraftingDisplay(gridSize) {
    const grid = gridSize === 2 ? this.craftingGrid2x2 : this.craftingGrid3x3;
    const containerId = gridSize === 2 ? 'crafting-grid-2x2' : 'crafting-grid-3x3';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const slots = container.querySelectorAll('.slot');
    slots.forEach((slot, i) => {
      slot.innerHTML = '';
      if (grid[i]) {
        this.renderSlotItem(slot, grid[i].type, grid[i].count);
      }
    });
  }

  updateFurnaceSlotDisplay(elementId, item) {
    const slot = document.getElementById(elementId);
    if (!slot) return;
    
    // Preserve event listeners by only clearing content
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    
    if (item) {
      this.renderSlotItem(slot, item.type, item.count);
    }
  }

  updateAllSlots() {
    this.updateCraftingDisplay(2);
    this.updateCraftingDisplay(3);
    
    // Update inventory displays in crafting table and furnace
    this.updateExternalInventory('ct');
    this.updateExternalInventory('furnace');
  }

  updateExternalInventory(prefix) {
    const invGrid = document.getElementById(`${prefix}-inventory-grid`);
    const hotbarGrid = document.getElementById(`${prefix}-hotbar-grid`);
    
    if (invGrid) {
      const slots = invGrid.querySelectorAll('.slot');
      slots.forEach(slot => {
        const index = parseInt(slot.dataset.index);
        slot.innerHTML = '';
        const item = this.inventory.getItem(index);
        if (item) {
          this.renderSlotItem(slot, item.type, item.count);
        }
      });
    }
    
    if (hotbarGrid) {
      const slots = hotbarGrid.querySelectorAll('.slot');
      slots.forEach(slot => {
        const index = parseInt(slot.dataset.index);
        slot.innerHTML = '';
        const item = this.inventory.getItem(index);
        if (item) {
          this.renderSlotItem(slot, item.type, item.count);
        }
      });
    }
  }

  // Update furnaces that are running even when UI is closed
  updateFurnaces(delta) {
    this.furnaceStates.forEach((state) => {
      state.update(delta);
    });
  }

  // === Enchanting ===
  openEnchanting() {
    const menu = document.getElementById('enchanting-menu');
    if (!menu) return;
    menu.style.display = 'flex';
    document.exitPointerLock();

    this.enchantingItem = null;
    this.enchantingLapis = null;

    // Setup slots
    const itemSlot = document.getElementById('enchanting-item-slot');
    const lapisSlot = document.getElementById('enchanting-lapis-slot');
    if (itemSlot) {
      itemSlot.innerHTML = '';
      itemSlot.onclick = () => this.handleEnchantSlotClick('item');
    }
    if (lapisSlot) {
      lapisSlot.innerHTML = '';
      lapisSlot.onclick = () => this.handleEnchantSlotClick('lapis');
    }

    // Setup enchant options
    const options = document.querySelectorAll('.enchant-option');
    options.forEach((opt) => {
      opt.classList.remove('available');
      opt.querySelector('.enchant-name').textContent = '---';
      opt.onclick = () => this.applyEnchantOption(parseInt(opt.dataset.level));
    });

    this.setupEnchantingInventory();
  }

  closeEnchanting() {
    const menu = document.getElementById('enchanting-menu');
    if (menu) menu.style.display = 'none';

    // Return items to inventory
    if (this.enchantingItem) {
      this.inventory.addItem(this.enchantingItem.type, this.enchantingItem.count || 1);
    }
    if (this.enchantingLapis) {
      this.inventory.addItem(this.enchantingLapis.type, this.enchantingLapis.count || 1);
    }
    this.enchantingItem = null;
    this.enchantingLapis = null;
  }

  handleEnchantSlotClick(slotType) {
    // Simple: take from selected hotbar slot
    const selected = this.inventory.selectedSlot;
    const item = this.inventory.getItem(selected);

    if (slotType === 'item') {
      if (this.enchantingItem) {
        this.inventory.addItem(this.enchantingItem.type, this.enchantingItem.count || 1);
        this.enchantingItem = null;
      }
      if (item) {
        this.enchantingItem = { type: item.type, count: 1, enchantments: item.enchantments || [] };
        item.count--;
        if (item.count <= 0) this.inventory.slots[selected] = null;
      }
    } else if (slotType === 'lapis') {
      if (this.enchantingLapis) {
        this.inventory.addItem(this.enchantingLapis.type, this.enchantingLapis.count || 1);
        this.enchantingLapis = null;
      }
      if (item) {
        this.enchantingLapis = { type: item.type, count: item.count };
        this.inventory.slots[selected] = null;
      }
    }

    this.updateEnchantingDisplay();
    this.game.player.inventoryUI.updateHotbar();
  }

  updateEnchantingDisplay() {
    const itemSlot = document.getElementById('enchanting-item-slot');
    const lapisSlot = document.getElementById('enchanting-lapis-slot');

    if (itemSlot) {
      itemSlot.innerHTML = '';
      if (this.enchantingItem) {
        this.renderSlotItem(itemSlot, this.enchantingItem.type, 1);
      }
    }
    if (lapisSlot) {
      lapisSlot.innerHTML = '';
      if (this.enchantingLapis) {
        this.renderSlotItem(lapisSlot, this.enchantingLapis.type, this.enchantingLapis.count);
      }
    }

    // Update enchant options
    const options = document.querySelectorAll('.enchant-option');
    const playerLevel = this.game.player.level;
    const hasItem = !!this.enchantingItem;
    const isLapis = this.enchantingLapis && this.enchantingLapis.type === ItemType.LAPIS_LAZULI;

    options.forEach((opt) => {
      const level = parseInt(opt.dataset.level);
      const costName = opt.querySelector('.enchant-name');

      if (hasItem) {
        const seed = (this.enchantingItem.type * 1000 + level * 3571) | 0;
        const enchants = getRandomEnchantments(this.enchantingItem.type, level * 10, seed);

        if (enchants.length > 0) {
          costName.textContent = enchants.map(e => formatEnchantment(e.id, e.level)).join(', ');
          const canAfford = playerLevel >= level && isLapis && this.enchantingLapis.count >= level;
          if (canAfford) {
            opt.classList.add('available');
          } else {
            opt.classList.remove('available');
          }
        } else {
          costName.textContent = '---';
          opt.classList.remove('available');
        }
      } else {
        costName.textContent = '---';
        opt.classList.remove('available');
      }
    });
  }

  applyEnchantOption(level) {
    if (!this.enchantingItem) return;
    const playerLevel = this.game.player.level;
    const isLapis = this.enchantingLapis && this.enchantingLapis.type === ItemType.LAPIS_LAZULI;

    if (playerLevel < level || !isLapis || this.enchantingLapis.count < level) return;

    const seed = (this.enchantingItem.type * 1000 + level * 3571) | 0;
    const enchants = getRandomEnchantments(this.enchantingItem.type, level * 10, seed);
    if (enchants.length === 0) return;

    // Apply enchantments
    if (!this.enchantingItem.enchantments) this.enchantingItem.enchantments = [];
    for (const ench of enchants) {
      const existing = this.enchantingItem.enchantments.find(e => e.id === ench.id);
      if (existing) {
        existing.level = Math.max(existing.level, ench.level);
      } else {
        this.enchantingItem.enchantments.push(ench);
      }
    }

    // Consume lapis and levels
    this.enchantingLapis.count -= level;
    if (this.enchantingLapis.count <= 0) this.enchantingLapis = null;
    this.game.player.level = Math.max(0, this.game.player.level - level);
    this.game.player.updateXPUI();

    // Return item to inventory
    this.inventory.addItem(this.enchantingItem.type, 1);
    // Store enchantments on the item in inventory
    const addedSlot = this.inventory.findItem(this.enchantingItem.type);
    if (addedSlot !== -1) {
      const invItem = this.inventory.getItem(addedSlot);
      if (invItem) invItem.enchantments = this.enchantingItem.enchantments;
    }
    this.enchantingItem = null;

    this.updateEnchantingDisplay();
    this.game.player.inventoryUI.updateHotbar();
  }

  setupEnchantingInventory() {
    const invGrid = document.getElementById('enchanting-inventory-grid');
    const hotbarGrid = document.getElementById('enchanting-hotbar-grid');
    if (!invGrid || !hotbarGrid) return;

    invGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';

    for (let i = 9; i < 36; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = i;
      const item = this.inventory.getItem(i);
      if (item) this.renderSlotItem(slot, item.type, item.count);
      invGrid.appendChild(slot);
    }

    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = i;
      const item = this.inventory.getItem(i);
      if (item) this.renderSlotItem(slot, item.type, item.count);
      hotbarGrid.appendChild(slot);
    }
  }

  // === Chest Storage ===
  openChest(x, y, z) {
    const menu = document.getElementById('chest-menu');
    if (!menu) return;
    menu.style.display = 'flex';
    document.exitPointerLock();

    const key = `${x},${y},${z}`;
    this.activeChestKey = key;

    if (!this.chestStorage.has(key)) {
      this.chestStorage.set(key, Array(27).fill(null));
    }

    this.setupChestUI();
  }

  closeChest() {
    const menu = document.getElementById('chest-menu');
    if (menu) menu.style.display = 'none';
    this.activeChestKey = null;
  }

  setupChestUI() {
    const chestGrid = document.getElementById('chest-grid');
    const invGrid = document.getElementById('chest-inventory-grid');
    const hotbarGrid = document.getElementById('chest-hotbar-grid');
    if (!chestGrid || !invGrid || !hotbarGrid) return;

    chestGrid.innerHTML = '';
    invGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';

    const storage = this.chestStorage.get(this.activeChestKey);

    // Chest slots (27 = 3 rows of 9)
    for (let i = 0; i < 27; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.chestIndex = i;
      if (storage[i]) {
        this.renderSlotItem(slot, storage[i].type, storage[i].count);
      }
      slot.addEventListener('click', () => this.handleChestSlotClick(i));
      chestGrid.appendChild(slot);
    }

    // Player inventory
    for (let i = 9; i < 36; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = i;
      const item = this.inventory.getItem(i);
      if (item) this.renderSlotItem(slot, item.type, item.count);
      slot.addEventListener('click', () => this.handleChestInvSlotClick(i));
      invGrid.appendChild(slot);
    }

    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = i;
      const item = this.inventory.getItem(i);
      if (item) this.renderSlotItem(slot, item.type, item.count);
      slot.addEventListener('click', () => this.handleChestInvSlotClick(i));
      hotbarGrid.appendChild(slot);
    }
  }

  handleChestSlotClick(chestIndex) {
    if (!this.activeChestKey) return;
    const storage = this.chestStorage.get(this.activeChestKey);

    // Simple swap: take from chest to hand, or put hand item there
    const selectedSlot = this.inventory.selectedSlot;
    const playerItem = this.inventory.getItem(selectedSlot);
    const chestItem = storage[chestIndex];

    // Swap
    if (playerItem) {
      storage[chestIndex] = { type: playerItem.type, count: playerItem.count };
      this.inventory.slots[selectedSlot] = chestItem ? { type: chestItem.type, count: chestItem.count } : null;
    } else if (chestItem) {
      this.inventory.slots[selectedSlot] = { type: chestItem.type, count: chestItem.count };
      storage[chestIndex] = null;
    }

    this.setupChestUI();
    this.game.player.inventoryUI.updateHotbar();
  }

  handleChestInvSlotClick(invIndex) {
    if (!this.activeChestKey) return;
    const storage = this.chestStorage.get(this.activeChestKey);

    // Move item from inventory to first empty chest slot
    const item = this.inventory.getItem(invIndex);
    if (!item) return;

    for (let i = 0; i < 27; i++) {
      if (!storage[i]) {
        storage[i] = { type: item.type, count: item.count };
        this.inventory.slots[invIndex] = null;
        break;
      }
    }

    this.setupChestUI();
    this.game.player.inventoryUI.updateHotbar();
  }
}
