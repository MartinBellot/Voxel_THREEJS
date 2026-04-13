import { ItemType } from './Item.js';
import { BlockType } from './World/Block.js';

// Crafting recipes: { result, count, pattern (3x3 grid), key mapping }
// Pattern uses characters; ' ' = empty, other chars map to ingredients
// For shapeless recipes, use `ingredients` array instead of `pattern`

const T = ItemType;

export const CraftingRecipes = [
  // === PLANKS (from any log) ===
  { result: T.OAK_PLANKS, count: 4, shapeless: true, ingredients: [T.OAK_LOG] },
  { result: T.SPRUCE_PLANKS, count: 4, shapeless: true, ingredients: [T.SPRUCE_LOG] },
  { result: T.BIRCH_PLANKS, count: 4, shapeless: true, ingredients: [T.BIRCH_LOG] },
  { result: T.JUNGLE_PLANKS, count: 4, shapeless: true, ingredients: [T.JUNGLE_LOG] },
  { result: T.ACACIA_PLANKS, count: 4, shapeless: true, ingredients: [T.ACACIA_LOG] },
  { result: T.DARK_OAK_PLANKS, count: 4, shapeless: true, ingredients: [T.DARK_OAK_LOG] },
  { result: T.CHERRY_PLANKS, count: 4, shapeless: true, ingredients: [T.CHERRY_LOG] },
  { result: T.MANGROVE_PLANKS, count: 4, shapeless: true, ingredients: [T.MANGROVE_LOG] },

  // === STICKS ===
  { result: T.STICK, count: 4, pattern: ['P', 'P'], key: { P: 'PLANKS' } },

  // === CRAFTING TABLE ===
  { result: T.CRAFTING_TABLE, count: 1, pattern: ['PP', 'PP'], key: { P: 'PLANKS' } },

  // === FURNACE ===
  { result: T.FURNACE, count: 1, pattern: ['CCC', 'C C', 'CCC'], key: { C: T.COBBLESTONE } },

  // === CHEST ===
  { result: T.CHEST, count: 1, pattern: ['PPP', 'P P', 'PPP'], key: { P: 'PLANKS' } },

  // === BED ===
  { result: T.BED, count: 1, pattern: ['WWW', 'PPP'], key: { W: T.RED_WOOL, P: 'PLANKS' } },

  // === TOOLS - Wooden ===
  { result: T.WOODEN_PICKAXE, count: 1, pattern: ['PPP', ' S ', ' S '], key: { P: 'PLANKS', S: T.STICK } },
  { result: T.WOODEN_AXE, count: 1, pattern: ['PP', 'PS', ' S'], key: { P: 'PLANKS', S: T.STICK } },
  { result: T.WOODEN_SHOVEL, count: 1, pattern: ['P', 'S', 'S'], key: { P: 'PLANKS', S: T.STICK } },
  { result: T.WOODEN_HOE, count: 1, pattern: ['PP', ' S', ' S'], key: { P: 'PLANKS', S: T.STICK } },
  { result: T.WOODEN_SWORD, count: 1, pattern: ['P', 'P', 'S'], key: { P: 'PLANKS', S: T.STICK } },

  // === TOOLS - Stone ===
  { result: T.STONE_PICKAXE, count: 1, pattern: ['CCC', ' S ', ' S '], key: { C: T.COBBLESTONE, S: T.STICK } },
  { result: T.STONE_AXE, count: 1, pattern: ['CC', 'CS', ' S'], key: { C: T.COBBLESTONE, S: T.STICK } },
  { result: T.STONE_SHOVEL, count: 1, pattern: ['C', 'S', 'S'], key: { C: T.COBBLESTONE, S: T.STICK } },
  { result: T.STONE_HOE, count: 1, pattern: ['CC', ' S', ' S'], key: { C: T.COBBLESTONE, S: T.STICK } },
  { result: T.STONE_SWORD, count: 1, pattern: ['C', 'C', 'S'], key: { C: T.COBBLESTONE, S: T.STICK } },

  // === TOOLS - Iron ===
  { result: T.IRON_PICKAXE, count: 1, pattern: ['III', ' S ', ' S '], key: { I: T.IRON_INGOT, S: T.STICK } },
  { result: T.IRON_AXE, count: 1, pattern: ['II', 'IS', ' S'], key: { I: T.IRON_INGOT, S: T.STICK } },
  { result: T.IRON_SHOVEL, count: 1, pattern: ['I', 'S', 'S'], key: { I: T.IRON_INGOT, S: T.STICK } },
  { result: T.IRON_HOE, count: 1, pattern: ['II', ' S', ' S'], key: { I: T.IRON_INGOT, S: T.STICK } },
  { result: T.IRON_SWORD, count: 1, pattern: ['I', 'I', 'S'], key: { I: T.IRON_INGOT, S: T.STICK } },

  // === TOOLS - Golden ===
  { result: T.GOLDEN_PICKAXE, count: 1, pattern: ['GGG', ' S ', ' S '], key: { G: T.GOLD_INGOT, S: T.STICK } },
  { result: T.GOLDEN_AXE, count: 1, pattern: ['GG', 'GS', ' S'], key: { G: T.GOLD_INGOT, S: T.STICK } },
  { result: T.GOLDEN_SHOVEL, count: 1, pattern: ['G', 'S', 'S'], key: { G: T.GOLD_INGOT, S: T.STICK } },
  { result: T.GOLDEN_HOE, count: 1, pattern: ['GG', ' S', ' S'], key: { G: T.GOLD_INGOT, S: T.STICK } },
  { result: T.GOLDEN_SWORD, count: 1, pattern: ['G', 'G', 'S'], key: { G: T.GOLD_INGOT, S: T.STICK } },

  // === TOOLS - Diamond ===
  { result: T.DIAMOND_PICKAXE, count: 1, pattern: ['DDD', ' S ', ' S '], key: { D: T.DIAMOND, S: T.STICK } },
  { result: T.DIAMOND_AXE, count: 1, pattern: ['DD', 'DS', ' S'], key: { D: T.DIAMOND, S: T.STICK } },
  { result: T.DIAMOND_SHOVEL, count: 1, pattern: ['D', 'S', 'S'], key: { D: T.DIAMOND, S: T.STICK } },
  { result: T.DIAMOND_HOE, count: 1, pattern: ['DD', ' S', ' S'], key: { D: T.DIAMOND, S: T.STICK } },
  { result: T.DIAMOND_SWORD, count: 1, pattern: ['D', 'D', 'S'], key: { D: T.DIAMOND, S: T.STICK } },

  // === ARMOR - Leather ===
  { result: T.LEATHER_HELMET, count: 1, pattern: ['LLL', 'L L'], key: { L: T.LEATHER } },
  { result: T.LEATHER_CHESTPLATE, count: 1, pattern: ['L L', 'LLL', 'LLL'], key: { L: T.LEATHER } },
  { result: T.LEATHER_LEGGINGS, count: 1, pattern: ['LLL', 'L L', 'L L'], key: { L: T.LEATHER } },
  { result: T.LEATHER_BOOTS, count: 1, pattern: ['L L', 'L L'], key: { L: T.LEATHER } },

  // === ARMOR - Iron ===
  { result: T.IRON_HELMET, count: 1, pattern: ['III', 'I I'], key: { I: T.IRON_INGOT } },
  { result: T.IRON_CHESTPLATE, count: 1, pattern: ['I I', 'III', 'III'], key: { I: T.IRON_INGOT } },
  { result: T.IRON_LEGGINGS, count: 1, pattern: ['III', 'I I', 'I I'], key: { I: T.IRON_INGOT } },
  { result: T.IRON_BOOTS, count: 1, pattern: ['I I', 'I I'], key: { I: T.IRON_INGOT } },

  // === ARMOR - Gold ===
  { result: T.GOLDEN_HELMET, count: 1, pattern: ['GGG', 'G G'], key: { G: T.GOLD_INGOT } },
  { result: T.GOLDEN_CHESTPLATE, count: 1, pattern: ['G G', 'GGG', 'GGG'], key: { G: T.GOLD_INGOT } },
  { result: T.GOLDEN_LEGGINGS, count: 1, pattern: ['GGG', 'G G', 'G G'], key: { G: T.GOLD_INGOT } },
  { result: T.GOLDEN_BOOTS, count: 1, pattern: ['G G', 'G G'], key: { G: T.GOLD_INGOT } },

  // === ARMOR - Diamond ===
  { result: T.DIAMOND_HELMET, count: 1, pattern: ['DDD', 'D D'], key: { D: T.DIAMOND } },
  { result: T.DIAMOND_CHESTPLATE, count: 1, pattern: ['D D', 'DDD', 'DDD'], key: { D: T.DIAMOND } },
  { result: T.DIAMOND_LEGGINGS, count: 1, pattern: ['DDD', 'D D', 'D D'], key: { D: T.DIAMOND } },
  { result: T.DIAMOND_BOOTS, count: 1, pattern: ['D D', 'D D'], key: { D: T.DIAMOND } },

  // === RANGED ===
  { result: T.BOW, count: 1, pattern: [' SI', 'S I', ' SI'], key: { S: T.STICK, I: T.STRING } },
  { result: T.ARROW, count: 4, pattern: ['F', 'S', 'E'], key: { F: T.FLINT, S: T.STICK, E: T.FEATHER } },
  { result: T.SHIELD, count: 1, pattern: ['PIP', 'PPP', ' P '], key: { P: 'PLANKS', I: T.IRON_INGOT } },

  // === MINERAL BLOCKS ===
  { result: T.IRON_BLOCK, count: 1, pattern: ['III', 'III', 'III'], key: { I: T.IRON_INGOT } },
  { result: T.GOLD_BLOCK, count: 1, pattern: ['GGG', 'GGG', 'GGG'], key: { G: T.GOLD_INGOT } },
  { result: T.DIAMOND_BLOCK, count: 1, pattern: ['DDD', 'DDD', 'DDD'], key: { D: T.DIAMOND } },
  { result: T.EMERALD_BLOCK, count: 1, pattern: ['EEE', 'EEE', 'EEE'], key: { E: T.EMERALD } },
  { result: T.LAPIS_BLOCK, count: 1, pattern: ['LLL', 'LLL', 'LLL'], key: { L: T.LAPIS_LAZULI } },
  { result: T.REDSTONE_BLOCK, count: 1, pattern: ['RRR', 'RRR', 'RRR'], key: { R: T.REDSTONE_DUST } },
  { result: T.COAL_BLOCK, count: 1, pattern: ['CCC', 'CCC', 'CCC'], key: { C: T.COAL } },

  // === Block decomposition ===
  { result: T.IRON_INGOT, count: 9, shapeless: true, ingredients: [T.IRON_BLOCK] },
  { result: T.GOLD_INGOT, count: 9, shapeless: true, ingredients: [T.GOLD_BLOCK] },
  { result: T.DIAMOND, count: 9, shapeless: true, ingredients: [T.DIAMOND_BLOCK] },
  { result: T.EMERALD, count: 9, shapeless: true, ingredients: [T.EMERALD_BLOCK] },
  { result: T.LAPIS_LAZULI, count: 9, shapeless: true, ingredients: [T.LAPIS_BLOCK] },
  { result: T.REDSTONE_DUST, count: 9, shapeless: true, ingredients: [T.REDSTONE_BLOCK] },
  { result: T.COAL, count: 9, shapeless: true, ingredients: [T.COAL_BLOCK] },

  // === MISC ===
  { result: T.TORCH_ITEM, count: 4, pattern: ['C', 'S'], key: { C: T.COAL, S: T.STICK } },
  { result: T.TORCH_ITEM, count: 4, pattern: ['C', 'S'], key: { C: T.CHARCOAL, S: T.STICK } },
  { result: T.LADDER, count: 3, pattern: ['S S', 'SSS', 'S S'], key: { S: T.STICK } },
  { result: T.BUCKET, count: 1, pattern: ['I I', ' I '], key: { I: T.IRON_INGOT } },
  { result: T.BOOK, count: 1, shapeless: true, ingredients: [T.LEATHER, T.LEATHER, T.LEATHER] },
  { result: T.BOOKSHELF, count: 1, pattern: ['PPP', 'BBB', 'PPP'], key: { P: 'PLANKS', B: T.BOOK } },
  { result: T.FLINT_AND_STEEL, count: 1, shapeless: true, ingredients: [T.IRON_INGOT, T.FLINT] },
  { result: T.SHEARS, count: 1, pattern: [' I', 'I '], key: { I: T.IRON_INGOT } },

  // === FOOD ===
  { result: T.BREAD, count: 1, pattern: ['WWW'], key: { W: T.POTATO } }, // Simplified
  { result: T.GOLDEN_APPLE, count: 1, pattern: ['GGG', 'GAG', 'GGG'], key: { G: T.GOLD_INGOT, A: T.APPLE } },
  { result: T.COOKIE, count: 8, pattern: ['WCW'], key: { W: T.POTATO, C: T.COAL } }, // Simplified (no cocoa beans)
  { result: T.PUMPKIN_PIE, count: 1, shapeless: true, ingredients: [T.PUMPKIN, T.POTATO, T.POTATO] }, // Simplified

  // === BUILDING ===
  { result: T.STONE_BRICKS, count: 4, pattern: ['SS', 'SS'], key: { S: T.STONE } },
  { result: T.BRICKS, count: 1, pattern: ['BB', 'BB'], key: { B: T.BRICK } },
  { result: T.SANDSTONE, count: 1, pattern: ['SS', 'SS'], key: { S: T.SAND } },
  { result: T.SMOOTH_STONE, count: 1, shapeless: true, ingredients: [T.STONE] }, // Simplified (normally smelting)
  { result: T.GLASS, count: 1, shapeless: true, ingredients: [T.SAND] }, // Simplified (normally smelting)
  { result: T.NOTE_BLOCK, count: 1, pattern: ['PPP', 'PRP', 'PPP'], key: { P: 'PLANKS', R: T.REDSTONE_DUST } },
  { result: T.JUKEBOX, count: 1, pattern: ['PPP', 'PDP', 'PPP'], key: { P: 'PLANKS', D: T.DIAMOND } },

  // === BONE MEAL ===
  { result: T.BONE_MEAL, count: 3, shapeless: true, ingredients: [T.BONE] },

  // === WOOL from string ===
  { result: T.WHITE_WOOL, count: 1, pattern: ['SS', 'SS'], key: { S: T.STRING } },
];

// Group of planks types for the PLANKS key
const PLANKS_TYPES = [
  T.OAK_PLANKS, T.SPRUCE_PLANKS, T.BIRCH_PLANKS, T.JUNGLE_PLANKS,
  T.ACACIA_PLANKS, T.DARK_OAK_PLANKS, T.CHERRY_PLANKS, T.MANGROVE_PLANKS,
];

function isPlanks(itemType) {
  return PLANKS_TYPES.includes(itemType);
}

export class CraftingSystem {
  constructor() {
    this.recipes = CraftingRecipes;
  }

  // Check if a grid matches a recipe
  // grid is a flat array: 4 items for 2x2, 9 items for 3x3
  // Each element is { type, count } or null
  findRecipe(grid, gridSize) {
    for (const recipe of this.recipes) {
      if (recipe.shapeless) {
        if (this.matchShapeless(grid, recipe)) return recipe;
      } else {
        if (this.matchShaped(grid, gridSize, recipe)) return recipe;
      }
    }
    return null;
  }

  matchShapeless(grid, recipe) {
    const available = [];
    for (const slot of grid) {
      if (slot && slot.type !== undefined) {
        for (let i = 0; i < (slot.count || 1); i++) {
          available.push(slot.type);
        }
      }
    }

    // Must have exactly the ingredients
    const needed = [...recipe.ingredients];
    if (available.length !== needed.length) return false;

    for (const ing of needed) {
      const idx = available.indexOf(ing);
      if (idx === -1) return false;
      available.splice(idx, 1);
    }
    return available.length === 0;
  }

  matchShaped(grid, gridSize, recipe) {
    const pattern = recipe.pattern;
    const patternH = pattern.length;
    const patternW = Math.max(...pattern.map(r => r.length));

    // Try all possible offsets
    for (let offsetY = 0; offsetY <= gridSize - patternH; offsetY++) {
      for (let offsetX = 0; offsetX <= gridSize - patternW; offsetX++) {
        if (this.matchAtOffset(grid, gridSize, recipe, offsetX, offsetY)) {
          return true;
        }
      }
    }
    // Also try mirrored
    const mirroredPattern = pattern.map(row => row.split('').reverse().join(''));
    const mirroredRecipe = { ...recipe, pattern: mirroredPattern };
    for (let offsetY = 0; offsetY <= gridSize - patternH; offsetY++) {
      for (let offsetX = 0; offsetX <= gridSize - patternW; offsetX++) {
        if (this.matchAtOffset(grid, gridSize, mirroredRecipe, offsetX, offsetY)) {
          return true;
        }
      }
    }
    return false;
  }

  matchAtOffset(grid, gridSize, recipe, offsetX, offsetY) {
    const pattern = recipe.pattern;
    const key = recipe.key;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const gridIdx = y * gridSize + x;
        const slot = grid[gridIdx];
        const patternY = y - offsetY;
        const patternX = x - offsetX;

        let expectedChar = ' ';
        if (patternY >= 0 && patternY < pattern.length) {
          const row = pattern[patternY];
          if (patternX >= 0 && patternX < row.length) {
            expectedChar = row[patternX];
          }
        }

        if (expectedChar === ' ') {
          // This cell should be empty
          if (slot && slot.type !== undefined && slot.type !== null) return false;
        } else {
          // This cell should match the key
          if (!slot || slot.type === undefined || slot.type === null) return false;
          const expectedItem = key[expectedChar];
          if (expectedItem === 'PLANKS') {
            if (!isPlanks(slot.type)) return false;
          } else {
            if (slot.type !== expectedItem) return false;
          }
        }
      }
    }
    return true;
  }

  // Consume ingredients from grid
  consumeIngredients(grid) {
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] && grid[i].type !== undefined) {
        grid[i].count--;
        if (grid[i].count <= 0) {
          grid[i] = null;
        }
      }
    }
  }
}
