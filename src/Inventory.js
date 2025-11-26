export class Inventory {
  constructor(size = 36, hotbarSize = 9) {
    this.size = size;
    this.hotbarSize = hotbarSize;
    this.slots = new Array(size).fill(null);
    this.selectedSlot = 0;
  }

  addItem(itemType, count = 1) {
    // Try to stack first
    for (let i = 0; i < this.size; i++) {
      if (this.slots[i] && this.slots[i].type === itemType && this.slots[i].count < 64) {
        const space = 64 - this.slots[i].count;
        const toAdd = Math.min(space, count);
        this.slots[i].count += toAdd;
        count -= toAdd;
        if (count === 0) return true;
      }
    }

    // Find empty slot
    for (let i = 0; i < this.size; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { type: itemType, count: count };
        return true;
      }
    }

    return false; // Inventory full
  }

  setItem(index, itemType, count) {
    if (index >= 0 && index < this.size) {
      this.slots[index] = { type: itemType, count: count };
    }
  }

  getItem(index) {
    return this.slots[index];
  }

  removeItem(index, count = 1) {
    if (this.slots[index]) {
      this.slots[index].count -= count;
      if (this.slots[index].count <= 0) {
        this.slots[index] = null;
      }
    }
  }

  swap(index1, index2) {
    const temp = this.slots[index1];
    this.slots[index1] = this.slots[index2];
    this.slots[index2] = temp;
  }

  getSelectedBlockType(ItemDefinitions) {
    const item = this.slots[this.selectedSlot];
    if (item && ItemDefinitions[item.type]) {
      return ItemDefinitions[item.type].blockType;
    }
    return null;
  }
}
