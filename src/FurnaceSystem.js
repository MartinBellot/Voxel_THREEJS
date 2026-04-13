import { ItemType } from './Item.js';

// Smelting recipes: input -> { result, count, xp }
const T = ItemType;

export const SmeltingRecipes = {
  [T.RAW_IRON]: { result: T.IRON_INGOT, count: 1, xp: 0.7 },
  [T.RAW_GOLD]: { result: T.GOLD_INGOT, count: 1, xp: 1.0 },
  [T.RAW_COPPER]: { result: T.COPPER_INGOT, count: 1, xp: 0.7 },
  [T.IRON_ORE]: { result: T.IRON_INGOT, count: 1, xp: 0.7 },
  [T.GOLD_ORE]: { result: T.GOLD_INGOT, count: 1, xp: 1.0 },
  [T.COPPER_ORE]: { result: T.COPPER_INGOT, count: 1, xp: 0.7 },
  [T.SAND]: { result: T.GLASS, count: 1, xp: 0.1 },
  [T.COBBLESTONE]: { result: T.STONE, count: 1, xp: 0.1 },
  [T.STONE]: { result: T.SMOOTH_STONE, count: 1, xp: 0.1 },
  [T.OAK_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.SPRUCE_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.BIRCH_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.JUNGLE_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.ACACIA_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.DARK_OAK_LOG]: { result: T.CHARCOAL, count: 1, xp: 0.15 },
  [T.CLAY]: { result: T.TERRACOTTA, count: 1, xp: 0.35 },
  [T.CLAY_BALL]: { result: T.BRICK, count: 1, xp: 0.3 },
  [T.RAW_PORKCHOP]: { result: T.COOKED_PORKCHOP, count: 1, xp: 0.35 },
  [T.RAW_BEEF]: { result: T.COOKED_BEEF, count: 1, xp: 0.35 },
  [T.RAW_CHICKEN_MEAT]: { result: T.COOKED_CHICKEN_MEAT, count: 1, xp: 0.35 },
  [T.RAW_MUTTON]: { result: T.COOKED_MUTTON, count: 1, xp: 0.35 },
  [T.RAW_COD]: { result: T.COOKED_COD, count: 1, xp: 0.35 },
  [T.RAW_SALMON]: { result: T.COOKED_SALMON, count: 1, xp: 0.35 },
  [T.POTATO]: { result: T.BAKED_POTATO, count: 1, xp: 0.35 },
  [T.NETHER_QUARTZ_ORE]: { result: T.QUARTZ, count: 1, xp: 0.2 },
  [T.ANCIENT_DEBRIS]: { result: T.NETHERITE_SCRAP, count: 1, xp: 2.0 },
};

// Fuel values in ticks (items smelted per fuel)
export const FuelValues = {
  [T.COAL]: 8,
  [T.CHARCOAL]: 8,
  [T.OAK_PLANKS]: 1.5,
  [T.SPRUCE_PLANKS]: 1.5,
  [T.BIRCH_PLANKS]: 1.5,
  [T.JUNGLE_PLANKS]: 1.5,
  [T.ACACIA_PLANKS]: 1.5,
  [T.DARK_OAK_PLANKS]: 1.5,
  [T.CHERRY_PLANKS]: 1.5,
  [T.MANGROVE_PLANKS]: 1.5,
  [T.STICK]: 0.5,
  [T.OAK_LOG]: 1.5,
  [T.SPRUCE_LOG]: 1.5,
  [T.BIRCH_LOG]: 1.5,
  [T.JUNGLE_LOG]: 1.5,
  [T.ACACIA_LOG]: 1.5,
  [T.DARK_OAK_LOG]: 1.5,
  [T.COAL_BLOCK]: 80,
  [T.LAVA_BUCKET]: 100,
  [T.BOOKSHELF]: 1.5,
  [T.CRAFTING_TABLE]: 1.5,
  [T.CHEST]: 1.5,
  [T.BOW]: 1.5,
  [T.WOODEN_PICKAXE]: 1,
  [T.WOODEN_AXE]: 1,
  [T.WOODEN_SHOVEL]: 1,
  [T.WOODEN_HOE]: 1,
  [T.WOODEN_SWORD]: 1,
};

export class FurnaceState {
  constructor() {
    this.inputSlot = null;   // { type, count }
    this.fuelSlot = null;    // { type, count }
    this.outputSlot = null;  // { type, count }
    this.burnTime = 0;       // remaining burn time
    this.maxBurnTime = 0;    // max burn time for current fuel
    this.cookProgress = 0;   // 0 to 10 (seconds)
    this.cookTime = 10;      // seconds to smelt one item
    this.totalXP = 0;
  }

  update(delta) {
    // Check if currently burning
    if (this.burnTime > 0) {
      this.burnTime -= delta;
    }

    // Check if we can smelt
    const recipe = this.inputSlot ? SmeltingRecipes[this.inputSlot.type] : null;
    if (!recipe) {
      this.cookProgress = 0;
      return;
    }

    // Check if output can accept result
    if (this.outputSlot &&
        (this.outputSlot.type !== recipe.result || this.outputSlot.count >= 64)) {
      this.cookProgress = 0;
      return;
    }

    // Try to consume fuel
    if (this.burnTime <= 0) {
      if (this.fuelSlot && FuelValues[this.fuelSlot.type]) {
        const fuelVal = FuelValues[this.fuelSlot.type];
        this.maxBurnTime = fuelVal * this.cookTime;
        this.burnTime = this.maxBurnTime;
        this.fuelSlot.count--;
        if (this.fuelSlot.count <= 0) this.fuelSlot = null;
      } else {
        this.cookProgress = 0;
        return;
      }
    }

    // Progress cooking
    this.cookProgress += delta;
    if (this.cookProgress >= this.cookTime) {
      this.cookProgress = 0;
      // Produce output
      if (!this.outputSlot) {
        this.outputSlot = { type: recipe.result, count: recipe.count };
      } else {
        this.outputSlot.count += recipe.count;
      }
      this.totalXP += recipe.xp;
      // Consume input
      this.inputSlot.count--;
      if (this.inputSlot.count <= 0) this.inputSlot = null;
    }
  }
}
