import { BlockType } from './World/Block.js';

export const ItemType = {
  ...BlockType,
  TORCH: 100 // Custom ID for Torch if not in BlockType yet, but we will add it there too.
};

export const ItemDefinitions = {
  // Map items to blocks where applicable
  [ItemType.STONE]: { name: 'Stone', blockType: BlockType.STONE },
  [ItemType.DIRT]: { name: 'Dirt', blockType: BlockType.DIRT },
  [ItemType.GRASS]: { name: 'Grass', blockType: BlockType.GRASS },
  [ItemType.BEDROCK]: { name: 'Bedrock', blockType: BlockType.BEDROCK },
  [ItemType.LOG]: { name: 'Log', blockType: BlockType.LOG },
  [ItemType.LEAVES]: { name: 'Leaves', blockType: BlockType.LEAVES },
  [ItemType.SAND]: { name: 'Sand', blockType: BlockType.SAND },
  [ItemType.WATER]: { name: 'Water', blockType: BlockType.WATER },
  [ItemType.PINE_LEAVES]: { name: 'Pine Leaves', blockType: BlockType.PINE_LEAVES },
  [ItemType.CACTUS]: { name: 'Cactus', blockType: BlockType.CACTUS },
  [ItemType.SNOW]: { name: 'Snow', blockType: BlockType.SNOW },
  [ItemType.MUSHROOM_STEM]: { name: 'Mushroom Stem', blockType: BlockType.MUSHROOM_STEM },
  [ItemType.MUSHROOM_CAP]: { name: 'Mushroom Cap', blockType: BlockType.MUSHROOM_CAP },
  [ItemType.MYCELIUM]: { name: 'Mycelium', blockType: BlockType.MYCELIUM },
  
  // Special Items
  [ItemType.TORCH]: { name: 'Torch', blockType: 100 } // We will add 100 to BlockType
};
