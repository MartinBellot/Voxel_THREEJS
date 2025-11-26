export const BlockType = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  BEDROCK: 4,
  LOG: 5,
  LEAVES: 6,
  SAND: 7,
  WATER: 8,
  PINE_LEAVES: 9,
  CACTUS: 10,
  SNOW: 11,
  MUSHROOM_STEM: 12,
  MUSHROOM_CAP: 13,
  MYCELIUM: 14,
  TORCH: 100
};

export const BlockModels = {
  CUBE: 'cube',
  TORCH: 'torch'
};

export const BlockDefinitions = {
  [BlockType.AIR]: { visible: false },
  [BlockType.STONE]: { color: 0x888888, visible: true, model: BlockModels.CUBE },
  [BlockType.DIRT]: { color: 0x8B4513, visible: true, model: BlockModels.CUBE },
  [BlockType.GRASS]: { color: 0x00AA00, visible: true, model: BlockModels.CUBE },
  [BlockType.BEDROCK]: { color: 0x333333, visible: true, model: BlockModels.CUBE },
  [BlockType.LOG]: { color: 0x5D4037, visible: true, model: BlockModels.CUBE },
  [BlockType.LEAVES]: { color: 0x2E7D32, visible: true, model: BlockModels.CUBE },
  [BlockType.SAND]: { color: 0xE1C699, visible: true, model: BlockModels.CUBE },
  [BlockType.WATER]: { color: 0x4FC3F7, visible: true, model: BlockModels.CUBE },
  [BlockType.PINE_LEAVES]: { color: 0x1B5E20, visible: true, model: BlockModels.CUBE }, // Darker green
  [BlockType.CACTUS]: { color: 0x66BB6A, visible: true, model: BlockModels.CUBE },
  [BlockType.SNOW]: { color: 0xFFFFFF, visible: true, model: BlockModels.CUBE },
  [BlockType.MUSHROOM_STEM]: { color: 0xD7CCC8, visible: true, model: BlockModels.CUBE },
  [BlockType.MUSHROOM_CAP]: { color: 0xE53935, visible: true, model: BlockModels.CUBE }, // Red mushroom
  [BlockType.MYCELIUM]: { color: 0x7E57C2, visible: true, model: BlockModels.CUBE }, // Purple grass
  [BlockType.TORCH]: { color: 0xFFD700, visible: true, light: 15, transparent: true, model: BlockModels.TORCH } // Gold color for torch
};
