import { BlockType } from './World/Block.js';

export const ItemType = {
  ...BlockType,
  TORCH: 100,
  CARROT: 200,
  SWORD: 300
};

export const ItemDefinitions = {
  // Map items to blocks where applicable
  [ItemType.STONE]: { name: 'Stone', blockType: BlockType.STONE, isPlaceable: true },
  [ItemType.DIRT]: { name: 'Dirt', blockType: BlockType.DIRT, isPlaceable: true },
  [ItemType.GRASS]: { name: 'Grass', blockType: BlockType.GRASS, isPlaceable: true },
  [ItemType.BEDROCK]: { name: 'Bedrock', blockType: BlockType.BEDROCK, isPlaceable: true },
  [ItemType.SPRUCE_LOG]: { name: 'Spruce Log', blockType: BlockType.SPRUCE_LOG, isPlaceable: true },
  [ItemType.LEAVES]: { name: 'Leaves', blockType: BlockType.LEAVES, isPlaceable: true },
  [ItemType.SAND]: { name: 'Sand', blockType: BlockType.SAND, isPlaceable: true },
  [ItemType.WATER]: { name: 'Water', blockType: BlockType.WATER, isPlaceable: true },
  [ItemType.PINE_LEAVES]: { name: 'Pine Leaves', blockType: BlockType.PINE_LEAVES, isPlaceable: true },
  [ItemType.CACTUS]: { name: 'Cactus', blockType: BlockType.CACTUS, isPlaceable: true },
  [ItemType.SNOW]: { name: 'Snow', blockType: BlockType.SNOW, isPlaceable: true },
  [ItemType.MUSHROOM_STEM]: { name: 'Mushroom Stem', blockType: BlockType.MUSHROOM_STEM, isPlaceable: true },
  [ItemType.MUSHROOM_CAP]: { name: 'Mushroom Cap', blockType: BlockType.MUSHROOM_CAP, isPlaceable: true },
  [ItemType.MYCELIUM]: { name: 'Mycelium', blockType: BlockType.MYCELIUM, isPlaceable: true },
  
  // Special Items
  [ItemType.TORCH]: { name: 'Torch', blockType: 100, isPlaceable: true },
  [ItemType.CARROT]: { name: 'Carrot', isPlaceable: false, texture: 'carrot.png' },
  [ItemType.SWORD]: { name: 'Sword', isPlaceable: false, texture: 'sword.png' }
};
