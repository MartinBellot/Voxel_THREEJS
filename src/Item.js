import { texture } from 'three/tsl';
import { BlockType } from './World/Block.js';

export const ToolMaterial = {
  WOOD: { miningLevel: 1, miningSpeed: 2, damage: 0, durability: 59, enchantability: 15 },
  STONE: { miningLevel: 2, miningSpeed: 4, damage: 1, durability: 131, enchantability: 5 },
  IRON: { miningLevel: 3, miningSpeed: 6, damage: 2, durability: 250, enchantability: 14 },
  GOLD: { miningLevel: 1, miningSpeed: 12, damage: 0, durability: 32, enchantability: 22 },
  DIAMOND: { miningLevel: 4, miningSpeed: 8, damage: 3, durability: 1561, enchantability: 10 },
  NETHERITE: { miningLevel: 5, miningSpeed: 9, damage: 4, durability: 2031, enchantability: 15 },
};

export const ArmorMaterial = {
  LEATHER: { helmet: 1, chestplate: 3, leggings: 2, boots: 1, durabilityMult: 5, enchantability: 15 },
  CHAINMAIL: { helmet: 2, chestplate: 5, leggings: 4, boots: 1, durabilityMult: 15, enchantability: 12 },
  IRON: { helmet: 2, chestplate: 6, leggings: 5, boots: 2, durabilityMult: 15, enchantability: 9 },
  GOLD: { helmet: 2, chestplate: 5, leggings: 3, boots: 1, durabilityMult: 7, enchantability: 25 },
  DIAMOND: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durabilityMult: 33, enchantability: 10 },
  NETHERITE: { helmet: 3, chestplate: 8, leggings: 6, boots: 3, durabilityMult: 37, enchantability: 15 },
};

export const ItemCategory = {
  BLOCK: 'block',
  TOOL: 'tool',
  WEAPON: 'weapon',
  ARMOR: 'armor',
  FOOD: 'food',
  MATERIAL: 'material',
  MISC: 'misc',
};

export const ItemType = {
  ...BlockType,
  // Tools - Swords (300-305)
  WOODEN_SWORD: 300,
  STONE_SWORD: 301,
  IRON_SWORD: 302,
  GOLDEN_SWORD: 303,
  DIAMOND_SWORD: 304,
  NETHERITE_SWORD: 305,

  // Tools - Pickaxes (310-315)
  WOODEN_PICKAXE: 310,
  STONE_PICKAXE: 311,
  IRON_PICKAXE: 312,
  GOLDEN_PICKAXE: 313,
  DIAMOND_PICKAXE: 314,
  NETHERITE_PICKAXE: 315,

  // Tools - Axes (320-325)
  WOODEN_AXE: 320,
  STONE_AXE: 321,
  IRON_AXE: 322,
  GOLDEN_AXE: 323,
  DIAMOND_AXE: 324,
  NETHERITE_AXE: 325,

  // Tools - Shovels (330-335)
  WOODEN_SHOVEL: 330,
  STONE_SHOVEL: 331,
  IRON_SHOVEL: 332,
  GOLDEN_SHOVEL: 333,
  DIAMOND_SHOVEL: 334,
  NETHERITE_SHOVEL: 335,

  // Tools - Hoes (340-345)
  WOODEN_HOE: 340,
  STONE_HOE: 341,
  IRON_HOE: 342,
  GOLDEN_HOE: 343,
  DIAMOND_HOE: 344,
  NETHERITE_HOE: 345,

  // Ranged
  BOW: 350,
  CROSSBOW: 351,
  ARROW: 352,
  SHIELD: 353,

  // Armor - Helmets (400-405)
  LEATHER_HELMET: 400,
  CHAINMAIL_HELMET: 401,
  IRON_HELMET: 402,
  GOLDEN_HELMET: 403,
  DIAMOND_HELMET: 404,
  NETHERITE_HELMET: 405,

  // Armor - Chestplates (410-415)
  LEATHER_CHESTPLATE: 410,
  CHAINMAIL_CHESTPLATE: 411,
  IRON_CHESTPLATE: 412,
  GOLDEN_CHESTPLATE: 413,
  DIAMOND_CHESTPLATE: 414,
  NETHERITE_CHESTPLATE: 415,

  // Armor - Leggings (420-425)
  LEATHER_LEGGINGS: 420,
  CHAINMAIL_LEGGINGS: 421,
  IRON_LEGGINGS: 422,
  GOLDEN_LEGGINGS: 423,
  DIAMOND_LEGGINGS: 424,
  NETHERITE_LEGGINGS: 425,

  // Armor - Boots (430-435)
  LEATHER_BOOTS: 430,
  CHAINMAIL_BOOTS: 431,
  IRON_BOOTS: 432,
  GOLDEN_BOOTS: 433,
  DIAMOND_BOOTS: 434,
  NETHERITE_BOOTS: 435,

  // Food (500-530)
  APPLE: 500,
  GOLDEN_APPLE: 501,
  BREAD: 502,
  RAW_PORKCHOP: 503,
  COOKED_PORKCHOP: 504,
  RAW_BEEF: 505,
  COOKED_BEEF: 506,
  RAW_CHICKEN_MEAT: 507,
  COOKED_CHICKEN_MEAT: 508,
  RAW_MUTTON: 509,
  COOKED_MUTTON: 510,
  RAW_COD: 511,
  COOKED_COD: 512,
  RAW_SALMON: 513,
  COOKED_SALMON: 514,
  MELON_SLICE: 515,
  SWEET_BERRIES: 516,
  CARROT: 517,
  POTATO: 518,
  BAKED_POTATO: 519,
  COOKIE: 520,
  CAKE: 521,
  PUMPKIN_PIE: 522,
  MUSHROOM_STEW: 523,
  BEETROOT: 524,
  BEETROOT_SOUP: 525,
  DRIED_KELP: 526,

  // Materials (600-650)
  COAL: 600,
  RAW_IRON: 601,
  RAW_GOLD: 602,
  RAW_COPPER: 603,
  IRON_INGOT: 604,
  GOLD_INGOT: 605,
  COPPER_INGOT: 606,
  DIAMOND: 607,
  EMERALD: 608,
  LAPIS_LAZULI: 609,
  REDSTONE_DUST: 610,
  QUARTZ: 611,
  NETHERITE_SCRAP: 612,
  NETHERITE_INGOT: 613,
  AMETHYST_SHARD: 614,
  FLINT: 615,
  STICK: 616,
  STRING: 617,
  LEATHER: 618,
  FEATHER: 619,
  BONE: 620,
  BONE_MEAL: 621,
  GUNPOWDER: 622,
  BLAZE_ROD: 623,
  BLAZE_POWDER: 624,
  ENDER_PEARL: 625,
  GHAST_TEAR: 626,
  GOLD_NUGGET: 627,
  IRON_NUGGET: 628,
  CHARCOAL: 629,
  CLAY_BALL: 630,
  BRICK: 631,
  NETHER_BRICK_ITEM: 632,
  GLOWSTONE_DUST: 633,
  INK_SAC: 634,

  // Misc (700+)
  BUCKET: 700,
  WATER_BUCKET: 701,
  LAVA_BUCKET: 702,
  MILK_BUCKET: 703,
  FLINT_AND_STEEL: 704,
  COMPASS: 705,
  CLOCK: 706,
  MAP: 707,
  BOOK: 708,
  FISHING_ROD: 709,
  SHEARS: 710,
  LEAD: 711,
  NAME_TAG: 712,
  TORCH_ITEM: 100,

  // Spawn eggs
  SPAWN_PIG: 800,
  SPAWN_CHICKEN: 801,
  SPAWN_ZOMBIE: 802,
  SPAWN_SKELETON: 803,
  SPAWN_CREEPER: 804,
  SPAWN_COW: 805,
  SPAWN_SHEEP: 806,
  SPAWN_SPIDER: 807,
};

// Helper to auto-generate block item definitions
function blockItem(blockType, name) {
  return { name, blockType, isPlaceable: true, category: ItemCategory.BLOCK, stackSize: 64 };
}

function toolItem(name, toolType, material, texFile) {
  const mat = ToolMaterial[material];
  const baseDamage = { SWORD: 4, PICKAXE: 2, AXE: 7, SHOVEL: 2.5, HOE: 1 };
  return {
    name, isPlaceable: false, category: toolType === 'SWORD' ? ItemCategory.WEAPON : ItemCategory.TOOL,
    texture: texFile, stackSize: 1,
    toolType, toolMaterial: material,
    damage: baseDamage[toolType] + mat.damage,
    miningSpeed: mat.miningSpeed,
    miningLevel: mat.miningLevel,
    durability: mat.durability,
  };
}

function armorItem(name, slot, material, texFile) {
  const mat = ArmorMaterial[material];
  const durBase = { helmet: 11, chestplate: 16, leggings: 15, boots: 13 };
  return {
    name, isPlaceable: false, category: ItemCategory.ARMOR,
    texture: texFile, stackSize: 1,
    armorSlot: slot, armorMaterial: material,
    armorPoints: mat[slot],
    durability: durBase[slot] * mat.durabilityMult,
  };
}

function foodItem(name, hunger, saturation, texFile) {
  return {
    name, isPlaceable: false, category: ItemCategory.FOOD,
    texture: texFile, stackSize: 64,
    foodValue: hunger, saturation,
  };
}

function matItem(name, texFile) {
  return { name, isPlaceable: false, category: ItemCategory.MATERIAL, texture: texFile, stackSize: 64 };
}

export const ItemDefinitions = {
  // === Block Items ===
  [ItemType.STONE]: blockItem(BlockType.STONE, 'Stone'),
  [ItemType.COBBLESTONE]: blockItem(BlockType.COBBLESTONE, 'Cobblestone'),
  [ItemType.MOSSY_COBBLESTONE]: blockItem(BlockType.MOSSY_COBBLESTONE, 'Mossy Cobblestone'),
  [ItemType.GRANITE]: blockItem(BlockType.GRANITE, 'Granite'),
  [ItemType.POLISHED_GRANITE]: blockItem(BlockType.POLISHED_GRANITE, 'Polished Granite'),
  [ItemType.DIORITE]: blockItem(BlockType.DIORITE, 'Diorite'),
  [ItemType.POLISHED_DIORITE]: blockItem(BlockType.POLISHED_DIORITE, 'Polished Diorite'),
  [ItemType.ANDESITE]: blockItem(BlockType.ANDESITE, 'Andesite'),
  [ItemType.POLISHED_ANDESITE]: blockItem(BlockType.POLISHED_ANDESITE, 'Polished Andesite'),
  [ItemType.DEEPSLATE]: blockItem(BlockType.DEEPSLATE, 'Deepslate'),
  [ItemType.TUFF]: blockItem(BlockType.TUFF, 'Tuff'),
  [ItemType.CALCITE]: blockItem(BlockType.CALCITE, 'Calcite'),
  [ItemType.SMOOTH_STONE]: blockItem(BlockType.SMOOTH_STONE, 'Smooth Stone'),
  [ItemType.STONE_BRICKS]: blockItem(BlockType.STONE_BRICKS, 'Stone Bricks'),
  [ItemType.DIRT]: blockItem(BlockType.DIRT, 'Dirt'),
  [ItemType.GRASS]: blockItem(BlockType.GRASS, 'Grass Block'),
  [ItemType.DIRT_PATH]: blockItem(BlockType.DIRT_PATH, 'Dirt Path'),
  [ItemType.FARMLAND]: blockItem(BlockType.FARMLAND, 'Farmland'),
  [ItemType.MYCELIUM]: blockItem(BlockType.MYCELIUM, 'Mycelium'),
  [ItemType.GRAVEL]: blockItem(BlockType.GRAVEL, 'Gravel'),
  [ItemType.CLAY]: blockItem(BlockType.CLAY, 'Clay'),
  [ItemType.MOSS_BLOCK]: blockItem(BlockType.MOSS_BLOCK, 'Moss Block'),
  [ItemType.SAND]: blockItem(BlockType.SAND, 'Sand'),
  [ItemType.SANDSTONE]: blockItem(BlockType.SANDSTONE, 'Sandstone'),
  [ItemType.RED_SANDSTONE]: blockItem(BlockType.RED_SANDSTONE, 'Red Sandstone'),
  [ItemType.SNOW]: blockItem(BlockType.SNOW, 'Snow Block'),
  [ItemType.BEDROCK]: blockItem(BlockType.BEDROCK, 'Bedrock'),
  [ItemType.COAL_ORE]: blockItem(BlockType.COAL_ORE, 'Coal Ore'),
  [ItemType.IRON_ORE]: blockItem(BlockType.IRON_ORE, 'Iron Ore'),
  [ItemType.GOLD_ORE]: blockItem(BlockType.GOLD_ORE, 'Gold Ore'),
  [ItemType.DIAMOND_ORE]: blockItem(BlockType.DIAMOND_ORE, 'Diamond Ore'),
  [ItemType.EMERALD_ORE]: blockItem(BlockType.EMERALD_ORE, 'Emerald Ore'),
  [ItemType.LAPIS_ORE]: blockItem(BlockType.LAPIS_ORE, 'Lapis Lazuli Ore'),
  [ItemType.REDSTONE_ORE]: blockItem(BlockType.REDSTONE_ORE, 'Redstone Ore'),
  [ItemType.COPPER_ORE]: blockItem(BlockType.COPPER_ORE, 'Copper Ore'),
  [ItemType.IRON_BLOCK]: blockItem(BlockType.IRON_BLOCK, 'Iron Block'),
  [ItemType.GOLD_BLOCK]: blockItem(BlockType.GOLD_BLOCK, 'Gold Block'),
  [ItemType.DIAMOND_BLOCK]: blockItem(BlockType.DIAMOND_BLOCK, 'Diamond Block'),
  [ItemType.EMERALD_BLOCK]: blockItem(BlockType.EMERALD_BLOCK, 'Emerald Block'),
  [ItemType.LAPIS_BLOCK]: blockItem(BlockType.LAPIS_BLOCK, 'Lapis Lazuli Block'),
  [ItemType.REDSTONE_BLOCK]: blockItem(BlockType.REDSTONE_BLOCK, 'Redstone Block'),
  [ItemType.COPPER_BLOCK]: blockItem(BlockType.COPPER_BLOCK, 'Copper Block'),
  [ItemType.NETHERITE_BLOCK]: blockItem(BlockType.NETHERITE_BLOCK, 'Netherite Block'),
  [ItemType.AMETHYST_BLOCK]: blockItem(BlockType.AMETHYST_BLOCK, 'Amethyst Block'),
  [ItemType.COAL_BLOCK]: blockItem(BlockType.COAL_BLOCK, 'Coal Block'),

  // Wood
  [ItemType.OAK_LOG]: blockItem(BlockType.OAK_LOG, 'Oak Log'),
  [ItemType.OAK_PLANKS]: blockItem(BlockType.OAK_PLANKS, 'Oak Planks'),
  [ItemType.OAK_LEAVES]: blockItem(BlockType.OAK_LEAVES, 'Oak Leaves'),
  [ItemType.BIRCH_LOG]: blockItem(BlockType.BIRCH_LOG, 'Birch Log'),
  [ItemType.BIRCH_PLANKS]: blockItem(BlockType.BIRCH_PLANKS, 'Birch Planks'),
  [ItemType.BIRCH_LEAVES]: blockItem(BlockType.BIRCH_LEAVES, 'Birch Leaves'),
  [ItemType.JUNGLE_LOG]: blockItem(BlockType.JUNGLE_LOG, 'Jungle Log'),
  [ItemType.JUNGLE_PLANKS]: blockItem(BlockType.JUNGLE_PLANKS, 'Jungle Planks'),
  [ItemType.JUNGLE_LEAVES]: blockItem(BlockType.JUNGLE_LEAVES, 'Jungle Leaves'),
  [ItemType.ACACIA_LOG]: blockItem(BlockType.ACACIA_LOG, 'Acacia Log'),
  [ItemType.ACACIA_PLANKS]: blockItem(BlockType.ACACIA_PLANKS, 'Acacia Planks'),
  [ItemType.ACACIA_LEAVES]: blockItem(BlockType.ACACIA_LEAVES, 'Acacia Leaves'),
  [ItemType.CHERRY_LOG]: blockItem(BlockType.CHERRY_LOG, 'Cherry Log'),
  [ItemType.CHERRY_PLANKS]: blockItem(BlockType.CHERRY_PLANKS, 'Cherry Planks'),
  [ItemType.CHERRY_LEAVES]: blockItem(BlockType.CHERRY_LEAVES, 'Cherry Leaves'),
  [ItemType.MANGROVE_LOG]: blockItem(BlockType.MANGROVE_LOG, 'Mangrove Log'),
  [ItemType.MANGROVE_PLANKS]: blockItem(BlockType.MANGROVE_PLANKS, 'Mangrove Planks'),
  [ItemType.MANGROVE_LEAVES]: blockItem(BlockType.MANGROVE_LEAVES, 'Mangrove Leaves'),
  [ItemType.SPRUCE_LOG]: blockItem(BlockType.SPRUCE_LOG, 'Spruce Log'),
  [ItemType.SPRUCE_PLANKS]: blockItem(BlockType.SPRUCE_PLANKS, 'Spruce Planks'),
  [ItemType.DARK_OAK_LOG]: blockItem(BlockType.DARK_OAK_LOG, 'Dark Oak Log'),
  [ItemType.DARK_OAK_PLANKS]: blockItem(BlockType.DARK_OAK_PLANKS, 'Dark Oak Planks'),
  [ItemType.LEAVES]: blockItem(BlockType.LEAVES, 'Leaves'),
  [ItemType.PINE_LEAVES]: blockItem(BlockType.PINE_LEAVES, 'Pine Leaves'),
  [ItemType.DARK_OAK_LEAVES]: blockItem(BlockType.DARK_OAK_LEAVES, 'Dark Oak Leaves'),

  // Building
  [ItemType.GLASS]: blockItem(BlockType.GLASS, 'Glass'),
  [ItemType.BRICKS]: blockItem(BlockType.BRICKS, 'Bricks'),
  [ItemType.BOOKSHELF]: blockItem(BlockType.BOOKSHELF, 'Bookshelf'),
  [ItemType.OBSIDIAN]: blockItem(BlockType.OBSIDIAN, 'Obsidian'),
  [ItemType.QUARTZ_BLOCK]: blockItem(BlockType.QUARTZ_BLOCK, 'Quartz Block'),
  [ItemType.PRISMARINE]: blockItem(BlockType.PRISMARINE, 'Prismarine'),
  [ItemType.END_STONE]: blockItem(BlockType.END_STONE, 'End Stone'),
  [ItemType.PURPUR_BLOCK]: blockItem(BlockType.PURPUR_BLOCK, 'Purpur Block'),
  [ItemType.NETHER_BRICKS]: blockItem(BlockType.NETHER_BRICKS, 'Nether Bricks'),
  [ItemType.SPONGE]: blockItem(BlockType.SPONGE, 'Sponge'),

  // Wool
  [ItemType.WHITE_WOOL]: blockItem(BlockType.WHITE_WOOL, 'White Wool'),
  [ItemType.ORANGE_WOOL]: blockItem(BlockType.ORANGE_WOOL, 'Orange Wool'),
  [ItemType.MAGENTA_WOOL]: blockItem(BlockType.MAGENTA_WOOL, 'Magenta Wool'),
  [ItemType.LIGHT_BLUE_WOOL]: blockItem(BlockType.LIGHT_BLUE_WOOL, 'Light Blue Wool'),
  [ItemType.YELLOW_WOOL]: blockItem(BlockType.YELLOW_WOOL, 'Yellow Wool'),
  [ItemType.LIME_WOOL]: blockItem(BlockType.LIME_WOOL, 'Lime Wool'),
  [ItemType.PINK_WOOL]: blockItem(BlockType.PINK_WOOL, 'Pink Wool'),
  [ItemType.GRAY_WOOL]: blockItem(BlockType.GRAY_WOOL, 'Gray Wool'),
  [ItemType.LIGHT_GRAY_WOOL]: blockItem(BlockType.LIGHT_GRAY_WOOL, 'Light Gray Wool'),
  [ItemType.CYAN_WOOL]: blockItem(BlockType.CYAN_WOOL, 'Cyan Wool'),
  [ItemType.PURPLE_WOOL]: blockItem(BlockType.PURPLE_WOOL, 'Purple Wool'),
  [ItemType.BLUE_WOOL]: blockItem(BlockType.BLUE_WOOL, 'Blue Wool'),
  [ItemType.BROWN_WOOL]: blockItem(BlockType.BROWN_WOOL, 'Brown Wool'),
  [ItemType.GREEN_WOOL]: blockItem(BlockType.GREEN_WOOL, 'Green Wool'),
  [ItemType.RED_WOOL]: blockItem(BlockType.RED_WOOL, 'Red Wool'),
  [ItemType.BLACK_WOOL]: blockItem(BlockType.BLACK_WOOL, 'Black Wool'),

  // Concrete
  [ItemType.WHITE_CONCRETE]: blockItem(BlockType.WHITE_CONCRETE, 'White Concrete'),
  [ItemType.ORANGE_CONCRETE]: blockItem(BlockType.ORANGE_CONCRETE, 'Orange Concrete'),
  [ItemType.MAGENTA_CONCRETE]: blockItem(BlockType.MAGENTA_CONCRETE, 'Magenta Concrete'),
  [ItemType.LIGHT_BLUE_CONCRETE]: blockItem(BlockType.LIGHT_BLUE_CONCRETE, 'Light Blue Concrete'),
  [ItemType.YELLOW_CONCRETE]: blockItem(BlockType.YELLOW_CONCRETE, 'Yellow Concrete'),
  [ItemType.LIME_CONCRETE]: blockItem(BlockType.LIME_CONCRETE, 'Lime Concrete'),
  [ItemType.PINK_CONCRETE]: blockItem(BlockType.PINK_CONCRETE, 'Pink Concrete'),
  [ItemType.GRAY_CONCRETE]: blockItem(BlockType.GRAY_CONCRETE, 'Gray Concrete'),
  [ItemType.LIGHT_GRAY_CONCRETE]: blockItem(BlockType.LIGHT_GRAY_CONCRETE, 'Light Gray Concrete'),
  [ItemType.CYAN_CONCRETE]: blockItem(BlockType.CYAN_CONCRETE, 'Cyan Concrete'),
  [ItemType.PURPLE_CONCRETE]: blockItem(BlockType.PURPLE_CONCRETE, 'Purple Concrete'),
  [ItemType.BLUE_CONCRETE]: blockItem(BlockType.BLUE_CONCRETE, 'Blue Concrete'),
  [ItemType.BROWN_CONCRETE]: blockItem(BlockType.BROWN_CONCRETE, 'Brown Concrete'),
  [ItemType.GREEN_CONCRETE]: blockItem(BlockType.GREEN_CONCRETE, 'Green Concrete'),
  [ItemType.RED_CONCRETE]: blockItem(BlockType.RED_CONCRETE, 'Red Concrete'),
  [ItemType.BLACK_CONCRETE]: blockItem(BlockType.BLACK_CONCRETE, 'Black Concrete'),

  [ItemType.TERRACOTTA]: blockItem(BlockType.TERRACOTTA, 'Terracotta'),

  // Functional
  [ItemType.CRAFTING_TABLE]: blockItem(BlockType.CRAFTING_TABLE, 'Crafting Table'),
  [ItemType.FURNACE]: blockItem(BlockType.FURNACE, 'Furnace'),
  [ItemType.BED]: blockItem(BlockType.BED, 'Bed'),
  [ItemType.CHEST]: blockItem(BlockType.CHEST, 'Chest'),
  [ItemType.TNT]: blockItem(BlockType.TNT, 'TNT'),
  [ItemType.ENCHANTING_TABLE]: blockItem(BlockType.ENCHANTING_TABLE, 'Enchanting Table'),
  [ItemType.ANVIL]: blockItem(BlockType.ANVIL, 'Anvil'),

  // Nature
  [ItemType.WATER]: blockItem(BlockType.WATER, 'Water'),
  [ItemType.LAVA]: blockItem(BlockType.LAVA, 'Lava'),
  [ItemType.GLOWSTONE]: blockItem(BlockType.GLOWSTONE, 'Glowstone'),
  [ItemType.NETHERRACK]: blockItem(BlockType.NETHERRACK, 'Netherrack'),
  [ItemType.SOUL_SAND]: blockItem(BlockType.SOUL_SAND, 'Soul Sand'),
  [ItemType.BASALT]: blockItem(BlockType.BASALT, 'Basalt'),
  [ItemType.BLACKSTONE]: blockItem(BlockType.BLACKSTONE, 'Blackstone'),
  [ItemType.CRYING_OBSIDIAN]: blockItem(BlockType.CRYING_OBSIDIAN, 'Crying Obsidian'),
  [ItemType.SEA_LANTERN]: blockItem(BlockType.SEA_LANTERN, 'Sea Lantern'),
  [ItemType.MAGMA]: blockItem(BlockType.MAGMA, 'Magma Block'),

  // Deco
  [ItemType.CACTUS]: blockItem(BlockType.CACTUS, 'Cactus'),
  [ItemType.PUMPKIN]: blockItem(BlockType.PUMPKIN, 'Pumpkin'),
  [ItemType.JACK_O_LANTERN]: blockItem(BlockType.JACK_O_LANTERN, "Jack o'Lantern"),
  [ItemType.MELON_BLOCK]: blockItem(BlockType.MELON_BLOCK, 'Melon'),
  [ItemType.HAY_BALE]: blockItem(BlockType.HAY_BALE, 'Hay Bale'),
  [ItemType.NOTE_BLOCK]: blockItem(BlockType.NOTE_BLOCK, 'Note Block'),
  [ItemType.JUKEBOX]: blockItem(BlockType.JUKEBOX, 'Jukebox'),
  [ItemType.MOSS_BLOCK]: blockItem(BlockType.MOSS_BLOCK, 'Moss Block'),
  [ItemType.LADDER]: blockItem(BlockType.LADDER, 'Ladder'),

  // Mushroom
  [ItemType.MUSHROOM_STEM]: blockItem(BlockType.MUSHROOM_STEM, 'Mushroom Stem'),
  [ItemType.MUSHROOM_CAP]: blockItem(BlockType.MUSHROOM_CAP, 'Mushroom Cap'),
  [ItemType.RED_MUSHROOM_BLOCK]: blockItem(BlockType.RED_MUSHROOM_BLOCK, 'Red Mushroom Block'),
  [ItemType.BROWN_MUSHROOM_BLOCK]: blockItem(BlockType.BROWN_MUSHROOM_BLOCK, 'Brown Mushroom Block'),
  [ItemType.SPORE_BLOCK]: blockItem(BlockType.SPORE_BLOCK, 'Spore Block'),

  // Magic
  [ItemType.MAGIC_STONE]: blockItem(BlockType.MAGIC_STONE, 'Magic Stone'),
  [ItemType.MAGIC_DIRT]: blockItem(BlockType.MAGIC_DIRT, 'Magic Dirt'),
  [ItemType.MAGIC_LOG]: blockItem(BlockType.MAGIC_LOG, 'Magic Log'),
  [ItemType.MAGIC_LEAVES]: blockItem(BlockType.MAGIC_LEAVES, 'Magic Leaves'),
  [ItemType.MAGIC_WATER]: blockItem(BlockType.MAGIC_WATER, 'Magic Water'),

  // Special block items
  [ItemType.TORCH_ITEM]: { name: 'Torch', blockType: BlockType.TORCH, isPlaceable: true, category: ItemCategory.BLOCK, stackSize: 64 },

  // === Swords ===
  [ItemType.WOODEN_SWORD]: toolItem('Wooden Sword', 'SWORD', 'WOOD', 'wooden_sword.png'),
  [ItemType.STONE_SWORD]: toolItem('Stone Sword', 'SWORD', 'STONE', 'stone_sword.png'),
  [ItemType.IRON_SWORD]: toolItem('Iron Sword', 'SWORD', 'IRON', 'iron_sword.png'),
  [ItemType.GOLDEN_SWORD]: toolItem('Golden Sword', 'SWORD', 'GOLD', 'golden_sword.png'),
  [ItemType.DIAMOND_SWORD]: toolItem('Diamond Sword', 'SWORD', 'DIAMOND', 'diamond_sword.png'),
  [ItemType.NETHERITE_SWORD]: toolItem('Netherite Sword', 'SWORD', 'NETHERITE', 'netherite_sword.png'),

  // === Pickaxes ===
  [ItemType.WOODEN_PICKAXE]: toolItem('Wooden Pickaxe', 'PICKAXE', 'WOOD', 'wooden_pickaxe.png'),
  [ItemType.STONE_PICKAXE]: toolItem('Stone Pickaxe', 'PICKAXE', 'STONE', 'stone_pickaxe.png'),
  [ItemType.IRON_PICKAXE]: toolItem('Iron Pickaxe', 'PICKAXE', 'IRON', 'iron_pickaxe.png'),
  [ItemType.GOLDEN_PICKAXE]: toolItem('Golden Pickaxe', 'PICKAXE', 'GOLD', 'golden_pickaxe.png'),
  [ItemType.DIAMOND_PICKAXE]: toolItem('Diamond Pickaxe', 'PICKAXE', 'DIAMOND', 'diamond_pickaxe.png'),
  [ItemType.NETHERITE_PICKAXE]: toolItem('Netherite Pickaxe', 'PICKAXE', 'NETHERITE', 'netherite_pickaxe.png'),

  // === Axes ===
  [ItemType.WOODEN_AXE]: toolItem('Wooden Axe', 'AXE', 'WOOD', 'wooden_axe.png'),
  [ItemType.STONE_AXE]: toolItem('Stone Axe', 'AXE', 'STONE', 'stone_axe.png'),
  [ItemType.IRON_AXE]: toolItem('Iron Axe', 'AXE', 'IRON', 'iron_axe.png'),
  [ItemType.GOLDEN_AXE]: toolItem('Golden Axe', 'AXE', 'GOLD', 'golden_axe.png'),
  [ItemType.DIAMOND_AXE]: toolItem('Diamond Axe', 'AXE', 'DIAMOND', 'diamond_axe.png'),
  [ItemType.NETHERITE_AXE]: toolItem('Netherite Axe', 'AXE', 'NETHERITE', 'netherite_axe.png'),

  // === Shovels ===
  [ItemType.WOODEN_SHOVEL]: toolItem('Wooden Shovel', 'SHOVEL', 'WOOD', 'wooden_shovel.png'),
  [ItemType.STONE_SHOVEL]: toolItem('Stone Shovel', 'SHOVEL', 'STONE', 'stone_shovel.png'),
  [ItemType.IRON_SHOVEL]: toolItem('Iron Shovel', 'SHOVEL', 'IRON', 'iron_shovel.png'),
  [ItemType.GOLDEN_SHOVEL]: toolItem('Golden Shovel', 'SHOVEL', 'GOLD', 'golden_shovel.png'),
  [ItemType.DIAMOND_SHOVEL]: toolItem('Diamond Shovel', 'SHOVEL', 'DIAMOND', 'diamond_shovel.png'),
  [ItemType.NETHERITE_SHOVEL]: toolItem('Netherite Shovel', 'SHOVEL', 'NETHERITE', 'netherite_shovel.png'),

  // === Hoes ===
  [ItemType.WOODEN_HOE]: toolItem('Wooden Hoe', 'HOE', 'WOOD', 'wooden_hoe.png'),
  [ItemType.STONE_HOE]: toolItem('Stone Hoe', 'HOE', 'STONE', 'stone_hoe.png'),
  [ItemType.IRON_HOE]: toolItem('Iron Hoe', 'HOE', 'IRON', 'iron_hoe.png'),
  [ItemType.GOLDEN_HOE]: toolItem('Golden Hoe', 'HOE', 'GOLD', 'golden_hoe.png'),
  [ItemType.DIAMOND_HOE]: toolItem('Diamond Hoe', 'HOE', 'DIAMOND', 'diamond_hoe.png'),
  [ItemType.NETHERITE_HOE]: toolItem('Netherite Hoe', 'HOE', 'NETHERITE', 'netherite_hoe.png'),

  // === Ranged ===
  [ItemType.BOW]: { name: 'Bow', isPlaceable: false, category: ItemCategory.WEAPON, texture: 'bow.png', stackSize: 1, class: 'Bow', durability: 384 },
  [ItemType.CROSSBOW]: { name: 'Crossbow', isPlaceable: false, category: ItemCategory.WEAPON, texture: 'crossbow.png', stackSize: 1, durability: 465 },
  [ItemType.ARROW]: { name: 'Arrow', isPlaceable: false, category: ItemCategory.MISC, texture: 'arrow.png', stackSize: 64 },
  [ItemType.SHIELD]: { name: 'Shield', isPlaceable: false, category: ItemCategory.WEAPON, texture: 'shield.png', stackSize: 1, durability: 336 },

  // === Armor ===
  [ItemType.LEATHER_HELMET]: armorItem('Leather Cap', 'helmet', 'LEATHER', 'leather_helmet.png'),
  [ItemType.LEATHER_CHESTPLATE]: armorItem('Leather Tunic', 'chestplate', 'LEATHER', 'leather_chestplate.png'),
  [ItemType.LEATHER_LEGGINGS]: armorItem('Leather Pants', 'leggings', 'LEATHER', 'leather_leggings.png'),
  [ItemType.LEATHER_BOOTS]: armorItem('Leather Boots', 'boots', 'LEATHER', 'leather_boots.png'),
  [ItemType.CHAINMAIL_HELMET]: armorItem('Chainmail Helmet', 'helmet', 'CHAINMAIL', 'chainmail_helmet.png'),
  [ItemType.CHAINMAIL_CHESTPLATE]: armorItem('Chainmail Chestplate', 'chestplate', 'CHAINMAIL', 'chainmail_chestplate.png'),
  [ItemType.CHAINMAIL_LEGGINGS]: armorItem('Chainmail Leggings', 'leggings', 'CHAINMAIL', 'chainmail_leggings.png'),
  [ItemType.CHAINMAIL_BOOTS]: armorItem('Chainmail Boots', 'boots', 'CHAINMAIL', 'chainmail_boots.png'),
  [ItemType.IRON_HELMET]: armorItem('Iron Helmet', 'helmet', 'IRON', 'iron_helmet.png'),
  [ItemType.IRON_CHESTPLATE]: armorItem('Iron Chestplate', 'chestplate', 'IRON', 'iron_chestplate.png'),
  [ItemType.IRON_LEGGINGS]: armorItem('Iron Leggings', 'leggings', 'IRON', 'iron_leggings.png'),
  [ItemType.IRON_BOOTS]: armorItem('Iron Boots', 'boots', 'IRON', 'iron_boots.png'),
  [ItemType.GOLDEN_HELMET]: armorItem('Golden Helmet', 'helmet', 'GOLD', 'golden_helmet.png'),
  [ItemType.GOLDEN_CHESTPLATE]: armorItem('Golden Chestplate', 'chestplate', 'GOLD', 'golden_chestplate.png'),
  [ItemType.GOLDEN_LEGGINGS]: armorItem('Golden Leggings', 'leggings', 'GOLD', 'golden_leggings.png'),
  [ItemType.GOLDEN_BOOTS]: armorItem('Golden Boots', 'boots', 'GOLD', 'golden_boots.png'),
  [ItemType.DIAMOND_HELMET]: armorItem('Diamond Helmet', 'helmet', 'DIAMOND', 'diamond_helmet.png'),
  [ItemType.DIAMOND_CHESTPLATE]: armorItem('Diamond Chestplate', 'chestplate', 'DIAMOND', 'diamond_chestplate.png'),
  [ItemType.DIAMOND_LEGGINGS]: armorItem('Diamond Leggings', 'leggings', 'DIAMOND', 'diamond_leggings.png'),
  [ItemType.DIAMOND_BOOTS]: armorItem('Diamond Boots', 'boots', 'DIAMOND', 'diamond_boots.png'),
  [ItemType.NETHERITE_HELMET]: armorItem('Netherite Helmet', 'helmet', 'NETHERITE', 'netherite_helmet.png'),
  [ItemType.NETHERITE_CHESTPLATE]: armorItem('Netherite Chestplate', 'chestplate', 'NETHERITE', 'netherite_chestplate.png'),
  [ItemType.NETHERITE_LEGGINGS]: armorItem('Netherite Leggings', 'leggings', 'NETHERITE', 'netherite_leggings.png'),
  [ItemType.NETHERITE_BOOTS]: armorItem('Netherite Boots', 'boots', 'NETHERITE', 'netherite_boots.png'),

  // === Food ===
  [ItemType.APPLE]: foodItem('Apple', 4, 2.4, 'apple.png'),
  [ItemType.GOLDEN_APPLE]: foodItem('Golden Apple', 4, 9.6, 'golden_apple.png'),
  [ItemType.BREAD]: foodItem('Bread', 5, 6.0, 'bread.png'),
  [ItemType.RAW_PORKCHOP]: foodItem('Raw Porkchop', 3, 1.8, 'raw_porkchop.png'),
  [ItemType.COOKED_PORKCHOP]: foodItem('Cooked Porkchop', 8, 12.8, 'cooked_porkchop.png'),
  [ItemType.RAW_BEEF]: foodItem('Raw Beef', 3, 1.8, 'raw_beef.png'),
  [ItemType.COOKED_BEEF]: foodItem('Steak', 8, 12.8, 'cooked_beef.png'),
  [ItemType.RAW_CHICKEN_MEAT]: foodItem('Raw Chicken', 2, 1.2, 'raw_chicken.png'),
  [ItemType.COOKED_CHICKEN_MEAT]: foodItem('Cooked Chicken', 6, 7.2, 'cooked_chicken.png'),
  [ItemType.RAW_MUTTON]: foodItem('Raw Mutton', 2, 1.2, 'raw_mutton.png'),
  [ItemType.COOKED_MUTTON]: foodItem('Cooked Mutton', 6, 9.6, 'cooked_mutton.png'),
  [ItemType.RAW_COD]: foodItem('Raw Cod', 2, 0.4, 'raw_cod.png'),
  [ItemType.COOKED_COD]: foodItem('Cooked Cod', 5, 6.0, 'cooked_cod.png'),
  [ItemType.RAW_SALMON]: foodItem('Raw Salmon', 2, 0.4, 'raw_salmon.png'),
  [ItemType.COOKED_SALMON]: foodItem('Cooked Salmon', 6, 9.6, 'cooked_salmon.png'),
  [ItemType.MELON_SLICE]: foodItem('Melon Slice', 2, 1.2, 'melon_slice.png'),
  [ItemType.SWEET_BERRIES]: foodItem('Sweet Berries', 2, 0.4, 'sweet_berries.png'),
  [ItemType.CARROT]: foodItem('Carrot', 3, 3.6, 'carrot.png'),
  [ItemType.POTATO]: foodItem('Potato', 1, 0.6, 'potato.png'),
  [ItemType.BAKED_POTATO]: foodItem('Baked Potato', 5, 6.0, 'baked_potato.png'),
  [ItemType.COOKIE]: foodItem('Cookie', 2, 0.4, 'cookie.png'),
  [ItemType.CAKE]: foodItem('Cake', 2, 0.4, 'cake.png'),
  [ItemType.PUMPKIN_PIE]: foodItem('Pumpkin Pie', 8, 4.8, 'pumpkin_pie.png'),
  [ItemType.MUSHROOM_STEW]: { ...foodItem('Mushroom Stew', 6, 7.2, 'mushroom_stew.png'), stackSize: 1 },
  [ItemType.BEETROOT]: foodItem('Beetroot', 1, 1.2, 'beetroot.png'),
  [ItemType.BEETROOT_SOUP]: { ...foodItem('Beetroot Soup', 6, 7.2, 'beetroot_soup.png'), stackSize: 1 },
  [ItemType.DRIED_KELP]: foodItem('Dried Kelp', 1, 0.6, 'dried_kelp.png'),

  // === Materials ===
  [ItemType.COAL]: matItem('Coal', 'coal.png'),
  [ItemType.RAW_IRON]: matItem('Raw Iron', 'raw_iron.png'),
  [ItemType.RAW_GOLD]: matItem('Raw Gold', 'raw_gold.png'),
  [ItemType.RAW_COPPER]: matItem('Raw Copper', 'raw_copper.png'),
  [ItemType.IRON_INGOT]: matItem('Iron Ingot', 'iron_ingot.png'),
  [ItemType.GOLD_INGOT]: matItem('Gold Ingot', 'gold_ingot.png'),
  [ItemType.COPPER_INGOT]: matItem('Copper Ingot', 'copper_ingot.png'),
  [ItemType.DIAMOND]: matItem('Diamond', 'diamond.png'),
  [ItemType.EMERALD]: matItem('Emerald', 'emerald.png'),
  [ItemType.LAPIS_LAZULI]: matItem('Lapis Lazuli', 'lapis_lazuli.png'),
  [ItemType.REDSTONE_DUST]: matItem('Redstone Dust', 'redstone_dust.png'),
  [ItemType.QUARTZ]: matItem('Nether Quartz', 'quartz.png'),
  [ItemType.NETHERITE_SCRAP]: matItem('Netherite Scrap', 'netherite_scrap.png'),
  [ItemType.NETHERITE_INGOT]: matItem('Netherite Ingot', 'netherite_ingot.png'),
  [ItemType.AMETHYST_SHARD]: matItem('Amethyst Shard', 'amethyst_shard.png'),
  [ItemType.FLINT]: matItem('Flint', 'flint.png'),
  [ItemType.STICK]: matItem('Stick', 'stick.png'),
  [ItemType.STRING]: matItem('String', 'string.png'),
  [ItemType.LEATHER]: matItem('Leather', 'leather.png'),
  [ItemType.FEATHER]: matItem('Feather', 'feather.png'),
  [ItemType.BONE]: matItem('Bone', 'bone.png'),
  [ItemType.BONE_MEAL]: matItem('Bone Meal', 'bone_meal.png'),
  [ItemType.GUNPOWDER]: matItem('Gunpowder', 'gunpowder.png'),
  [ItemType.BLAZE_ROD]: matItem('Blaze Rod', 'blaze_rod.png'),
  [ItemType.BLAZE_POWDER]: matItem('Blaze Powder', 'blaze_powder.png'),
  [ItemType.ENDER_PEARL]: matItem('Ender Pearl', 'ender_pearl.png'),
  [ItemType.GHAST_TEAR]: matItem('Ghast Tear', 'ghast_tear.png'),
  [ItemType.GOLD_NUGGET]: matItem('Gold Nugget', 'gold_nugget.png'),
  [ItemType.IRON_NUGGET]: matItem('Iron Nugget', 'iron_nugget.png'),
  [ItemType.CHARCOAL]: matItem('Charcoal', 'charcoal.png'),
  [ItemType.CLAY_BALL]: matItem('Clay Ball', 'clay_ball.png'),
  [ItemType.BRICK]: matItem('Brick', 'brick.png'),
  [ItemType.NETHER_BRICK_ITEM]: matItem('Nether Brick', 'nether_brick.png'),
  [ItemType.GLOWSTONE_DUST]: matItem('Glowstone Dust', 'glowstone_dust.png'),
  [ItemType.INK_SAC]: matItem('Ink Sac', 'ink_sac.png'),

  // === Misc ===
  [ItemType.BUCKET]: { name: 'Bucket', isPlaceable: false, category: ItemCategory.MISC, texture: 'bucket.png', stackSize: 16 },
  [ItemType.WATER_BUCKET]: { name: 'Water Bucket', isPlaceable: false, category: ItemCategory.MISC, texture: 'water_bucket.png', stackSize: 1 },
  [ItemType.LAVA_BUCKET]: { name: 'Lava Bucket', isPlaceable: false, category: ItemCategory.MISC, texture: 'lava_bucket.png', stackSize: 1 },
  [ItemType.MILK_BUCKET]: { name: 'Milk Bucket', isPlaceable: false, category: ItemCategory.MISC, texture: 'milk_bucket.png', stackSize: 1 },
  [ItemType.FLINT_AND_STEEL]: { name: 'Flint and Steel', isPlaceable: false, category: ItemCategory.MISC, texture: 'flint_and_steel.png', stackSize: 1, durability: 64 },
  [ItemType.COMPASS]: { name: 'Compass', isPlaceable: false, category: ItemCategory.MISC, texture: 'compass.png', stackSize: 64 },
  [ItemType.CLOCK]: { name: 'Clock', isPlaceable: false, category: ItemCategory.MISC, texture: 'clock.png', stackSize: 64 },
  [ItemType.MAP]: { name: 'Map', isPlaceable: false, category: ItemCategory.MISC, texture: 'map.png', stackSize: 64 },
  [ItemType.BOOK]: { name: 'Book', isPlaceable: false, category: ItemCategory.MISC, texture: 'book.png', stackSize: 64 },
  [ItemType.FISHING_ROD]: { name: 'Fishing Rod', isPlaceable: false, category: ItemCategory.MISC, texture: 'fishing_rod.png', stackSize: 1, durability: 64 },
  [ItemType.SHEARS]: { name: 'Shears', isPlaceable: false, category: ItemCategory.TOOL, texture: 'shears.png', stackSize: 1, durability: 238 },
  [ItemType.LEAD]: { name: 'Lead', isPlaceable: false, category: ItemCategory.MISC, texture: 'lead.png', stackSize: 64 },
  [ItemType.NAME_TAG]: { name: 'Name Tag', isPlaceable: false, category: ItemCategory.MISC, texture: 'name_tag.png', stackSize: 64 },

  // Spawn eggs
  [ItemType.SPAWN_PIG]: { name: 'Spawn Pig', isPlaceable: false, category: ItemCategory.MISC, texture: '../entities/pig.png', stackSize: 64 },
  [ItemType.SPAWN_CHICKEN]: { name: 'Spawn Chicken', isPlaceable: false, category: ItemCategory.MISC, texture: '../entities/chicken.png', stackSize: 64 },
  [ItemType.SPAWN_ZOMBIE]: { name: 'Spawn Zombie', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_zombie.png', stackSize: 64 },
  [ItemType.SPAWN_SKELETON]: { name: 'Spawn Skeleton', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_skeleton.png', stackSize: 64 },
  [ItemType.SPAWN_CREEPER]: { name: 'Spawn Creeper', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_creeper.png', stackSize: 64 },
  [ItemType.SPAWN_COW]: { name: 'Spawn Cow', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_cow.png', stackSize: 64 },
  [ItemType.SPAWN_SHEEP]: { name: 'Spawn Sheep', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_sheep.png', stackSize: 64 },
  [ItemType.SPAWN_SPIDER]: { name: 'Spawn Spider', isPlaceable: false, category: ItemCategory.MISC, texture: 'spawn_spider.png', stackSize: 64 },
};

// Helper to get effective tool for a block material
export function getEffectiveTool(blockMaterial) {
  switch (blockMaterial) {
    case 'stone': case 'metal': return 'PICKAXE';
    case 'dirt': case 'sand': return 'SHOVEL';
    case 'wood': return 'AXE';
    case 'wool': case 'plant': return 'SHEARS';
    default: return null;
  }
}

// Calculate mining time
export function getMiningTime(blockType, heldItemType) {
  const { BlockDefinitions, BlockMaterial: BMat } = require('./World/Block.js');
  const blockDef = BlockDefinitions[blockType];
  if (!blockDef || blockDef.hardness < 0) return Infinity; // unbreakable
  if (blockDef.hardness === 0) return 0.05; // instant

  const itemDef = heldItemType ? ItemDefinitions[heldItemType] : null;
  let speedMult = 1;
  let canHarvest = true;

  if (blockDef.miningLevel && blockDef.miningLevel > 0) {
    if (!itemDef || !itemDef.toolType) {
      canHarvest = false;
    } else {
      const effectiveTool = getEffectiveTool(blockDef.material);
      if (itemDef.toolType === effectiveTool && itemDef.miningLevel >= blockDef.miningLevel) {
        speedMult = itemDef.miningSpeed;
      } else {
        canHarvest = false;
      }
    }
  } else if (itemDef && itemDef.toolType) {
    const effectiveTool = getEffectiveTool(blockDef.material);
    if (itemDef.toolType === effectiveTool) {
      speedMult = itemDef.miningSpeed;
    }
  }

  let time = blockDef.hardness * (canHarvest ? 1.5 : 5.0) / speedMult;
  return Math.max(time, 0.05);
}
