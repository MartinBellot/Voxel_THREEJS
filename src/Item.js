import { texture } from 'three/tsl';
import { BlockType } from './World/Block.js';

export const ItemType = {
  ...BlockType,
  TORCH: 100,
  CARROT: 200,
  SWORD: 300,
  BOW: 301,
  ARROW: 302,
  SPAWN_PIG: 400
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
  
  // Magical World Items
  [ItemType.MAGIC_STONE]: { name: 'Magic Stone', blockType: BlockType.MAGIC_STONE, isPlaceable: true, texture: '../block/magic_stone.png' },
  [ItemType.MAGIC_DIRT]: { name: 'Magic Dirt', blockType: BlockType.MAGIC_DIRT, isPlaceable: true, texture: '../block/magic_dirt.png' },
  [ItemType.MAGIC_LOG]: { name: 'Magic Log', blockType: BlockType.MAGIC_LOG, isPlaceable: true, texture: '../block/magic_log.png' },
  [ItemType.MAGIC_LEAVES]: { name: 'Magic Leaves', blockType: BlockType.MAGIC_LEAVES, isPlaceable: true, texture: '../block/magic_leaves.png' },
  [ItemType.MAGIC_WATER]: { name: 'Magic Water', blockType: BlockType.MAGIC_WATER, isPlaceable: true, texture: '../block/magic_water.png' },

  // Special Items
  [ItemType.TORCH]: { name: 'Torch', blockType: 100, isPlaceable: true },
  [ItemType.CARROT]: { name: 'Carrot', isPlaceable: false, texture: 'carrot.png' },
  [ItemType.SWORD]: { name: 'Sword', isPlaceable: false, texture: 'sword.png' },
  [ItemType.BOW]: { name: 'Bow', isPlaceable: false, texture: 'bow.png', class: 'Bow' },
  [ItemType.ARROW]: { name: 'Arrow', isPlaceable: false, texture: 'arrow.png' },
  [ItemType.SPAWN_PIG]: { name: 'Spawn Pig', isPlaceable: false, texture: '../entities/pig.png' },
};
