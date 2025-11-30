export const BlockType = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  BEDROCK: 4,
  SPRUCE_LOG: 5,
  LEAVES: 6,
  SAND: 7,
  WATER: 8,
  PINE_LEAVES: 9,
  CACTUS: 10,
  SNOW: 11,
  MUSHROOM_STEM: 12,
  MUSHROOM_CAP: 13,
  MYCELIUM: 14,
  COAL_ORE: 15,
  MAGMA: 16,
  DARK_OAK_LOG: 17,
  DARK_OAK_LEAVES: 18,
  CLOUD: 19,
  TORCH: 100,
  CARROT: 200,
  // New Mushroom Biome Blocks
  MUSHROOM_STEM_PORE: 20,
  RED_MUSHROOM_BLOCK: 21,
  BROWN_MUSHROOM_BLOCK: 22,
  SPORE_BLOCK: 23,
  // Magical World Blocks
  MAGIC_STONE: 30,
  MAGIC_DIRT: 31,
  MAGIC_LOG: 33,
  MAGIC_LEAVES: 34,
  MAGIC_WATER: 36
};

export const BlockModels = {
  CUBE: 'cube',
  TORCH: 'torch',
  CACTUS: 'cactus'
};

export const BlockDefinitions = {
  [BlockType.AIR]: { visible: false },
  [BlockType.MAGIC_STONE]: { 
      color: 0x4B0082, 
      visible: true, 
      model: BlockModels.CUBE,
      textures: { all: 'magic_stone.png' }
  },
  [BlockType.MAGIC_DIRT]: { 
      color: 0x8A2BE2, 
      visible: true, 
      model: BlockModels.CUBE,
      textures: { all: 'dirt.png' }
  },
  [BlockType.MAGIC_LOG]: { 
      color: 0x483D8B, 
      visible: true, 
      model: BlockModels.CUBE,
      textures: {
          top: 'magic_log_top.png',
          bottom: 'magic_log_top.png',
          side: 'magic_log.png'
      }
  },
  [BlockType.MAGIC_LEAVES]: { 
      color: 0x00CED1, 
      visible: true, 
      model: BlockModels.CUBE, 
      transparent: true, 
      opacity: 0.9,
      textures: { all: 'magic_leaves.png' }
  },
  [BlockType.MAGIC_WATER]: { 
      color: 0x00FFFF, 
      visible: true, 
      model: BlockModels.CUBE, 
      transparent: true, 
      opacity: 0.6,
      textures: { all: 'water_overlay.png' }
  },
  [BlockType.CLOUD]: { color: 0xFFFFFF, visible: true, model: BlockModels.CUBE, transparent: true, opacity: 0.8 },
  [BlockType.STONE]: { color: 0x888888, visible: true, model: BlockModels.CUBE, textures: { all: 'stone.png' } },
  [BlockType.DIRT]: { 
    color: 0x8B4513, 
    visible: true, 
    model: BlockModels.CUBE,
    textures: { all: 'dirt.png' }
  },
  [BlockType.GRASS]: { 
    color: 0x00AA00, 
    visible: true, 
    model: BlockModels.CUBE,
    textures: {
      top: 'grass_block_tint.png',
      side: 'grass_block_side.png',
      bottom: 'dirt.png'
    }
  },
  [BlockType.BEDROCK]: { color: 0x333333, visible: true, model: BlockModels.CUBE },
  [BlockType.SPRUCE_LOG]: { 
    color: 0x5D4037, 
    visible: true, 
    model: BlockModels.CUBE,
    textures: {
      top: 'spruce_log_top.png',
      bottom: 'spruce_log_top.png',
      side: 'spruce_log.png'
    }
  },
  [BlockType.LEAVES]: { color: 0x2E7D32, visible: true, model: BlockModels.CUBE, textures: { all: 'spruce_leaves.png' } },
  [BlockType.SAND]: { color: 0xE1C699, visible: true, model: BlockModels.CUBE, textures: { all: 'sand.png' } },
  [BlockType.WATER]: { color: 0x4FC3F7, visible: true, model: BlockModels.CUBE, textures: { all: 'water_overlay.png' } },
  [BlockType.PINE_LEAVES]: { color: 0x1B5E20, visible: true, model: BlockModels.CUBE, textures: { all: 'spruce_leaves.png' } }, // Darker green
  [BlockType.CACTUS]: { 
    color: 0x66BB6A, 
    visible: true, 
    model: BlockModels.CACTUS, 
    textures: {
      top: 'cactus_top.png',
      side: 'cactus_side.png',
      bottom: 'cactus_top.png'
    } 
},
  [BlockType.SNOW]: { color: 0xFFFFFF, visible: true, model: BlockModels.CUBE, textures: { all: 'snow.png' } },
  [BlockType.MUSHROOM_STEM]: { 
    color: 0xD7CCC8, 
    visible: true, 
    model: BlockModels.CUBE,
    // TODO: Add mushroom_stem.png texture
    textures: { all: 'mushroom_stem.png' } 
  },
  [BlockType.MUSHROOM_CAP]: { color: 0xE53935, visible: true, model: BlockModels.CUBE }, // Red mushroom
  [BlockType.CARROT]: { color: 0xFFA500, visible: false }, // Item only
  [BlockType.MYCELIUM]: { 
    color: 0x7E57C2, 
    visible: true, 
    model: BlockModels.CUBE,
    // TODO: Add mycelium_top.png, mycelium_side.png textures
    textures: {
      top: 'mycelium_top.png',
      side: 'mycelium_side.png',
      bottom: 'dirt.png'
    }
  }, 
  [BlockType.COAL_ORE]: { color: 0x111111, visible: true, model: BlockModels.CUBE, textures: { all: 'coal_ore.png' } }, // Black coal block
  [BlockType.MAGMA]: { color: 0xFF4500, visible: true, model: BlockModels.CUBE, textures: { all: 'stone.png' } }, // Orange-Red, reusing stone texture
  [BlockType.DARK_OAK_LOG]: { 
    color: 0x3E2723, // Very dark brown
    visible: true, 
    model: BlockModels.CUBE,
    textures: {
      top: 'spruce_log_top.png', // Reusing spruce textures but darker color will be applied if I remove texture or tint it. 
      // Actually, the renderer prefers texture if available. 
      // I'll rely on the color tinting logic I'll add or just use the color if texture is missing.
      // But wait, the renderer uses white if texture exists.
      // I should probably not set texture if I want the color to show, OR I need to implement tinting for these blocks.
      // For now, let's reuse spruce textures.
      top: 'spruce_log_top.png',
      bottom: 'spruce_log_top.png',
      side: 'spruce_log.png'
    }
  },
  [BlockType.DARK_OAK_LEAVES]: { color: 0x1B5E20, visible: true, model: BlockModels.CUBE, textures: { all: 'spruce_leaves.png' } },
  [BlockType.TORCH]: { color: 0xFFD700, visible: true, light: 15, transparent: true, model: BlockModels.TORCH }, // Gold color for torch
  
  // New Mushroom Biome Blocks Definitions
  [BlockType.MUSHROOM_STEM_PORE]: { 
    color: 0xCFCFCF, 
    visible: true, 
    model: BlockModels.CUBE,
    // TODO: Add mushroom_block_inside.png texture (pores)
    textures: { all: 'mushroom_block_inside.png' }
  },
  [BlockType.RED_MUSHROOM_BLOCK]: { 
    color: 0xC62828, 
    visible: true, 
    model: BlockModels.CUBE,
    textures: { all: 'red_mushroom_block.png' }
  },
  [BlockType.BROWN_MUSHROOM_BLOCK]: { 
    color: 0x5D4037, 
    visible: true, 
    model: BlockModels.CUBE,
    // TODO: Add brown_mushroom_block.png texture
    textures: { all: 'brown_mushroom_block.png' }
  },
  [BlockType.SPORE_BLOCK]: { 
    color: 0x9C27B0, 
    visible: true, 
    model: BlockModels.CUBE,
    // TODO: Add spore_block.png texture (maybe animated later?)
    textures: { all: 'spore_block.png' }
  }
};
