import { ItemType, ItemDefinitions, ItemCategory } from './Item.js';

// Enchantment types
export const Enchantment = {
  // Armor
  PROTECTION: 'protection',
  FIRE_PROTECTION: 'fire_protection',
  BLAST_PROTECTION: 'blast_protection',
  PROJECTILE_PROTECTION: 'projectile_protection',
  FEATHER_FALLING: 'feather_falling',
  RESPIRATION: 'respiration',
  AQUA_AFFINITY: 'aqua_affinity',
  THORNS: 'thorns',

  // Weapons
  SHARPNESS: 'sharpness',
  SMITE: 'smite',
  BANE_OF_ARTHROPODS: 'bane_of_arthropods',
  KNOCKBACK: 'knockback',
  FIRE_ASPECT: 'fire_aspect',
  LOOTING: 'looting',

  // Tools
  EFFICIENCY: 'efficiency',
  SILK_TOUCH: 'silk_touch',
  UNBREAKING: 'unbreaking',
  FORTUNE: 'fortune',
  MENDING: 'mending',

  // Bow
  POWER: 'power',
  PUNCH: 'punch',
  FLAME: 'flame',
  INFINITY: 'infinity',
};

export const EnchantmentData = {
  [Enchantment.PROTECTION]: { name: 'Protection', maxLevel: 4, weight: 10, slots: ['helmet', 'chestplate', 'leggings', 'boots'] },
  [Enchantment.FIRE_PROTECTION]: { name: 'Fire Protection', maxLevel: 4, weight: 5, slots: ['helmet', 'chestplate', 'leggings', 'boots'] },
  [Enchantment.BLAST_PROTECTION]: { name: 'Blast Protection', maxLevel: 4, weight: 2, slots: ['helmet', 'chestplate', 'leggings', 'boots'] },
  [Enchantment.PROJECTILE_PROTECTION]: { name: 'Projectile Protection', maxLevel: 4, weight: 5, slots: ['helmet', 'chestplate', 'leggings', 'boots'] },
  [Enchantment.FEATHER_FALLING]: { name: 'Feather Falling', maxLevel: 4, weight: 5, slots: ['boots'] },
  [Enchantment.RESPIRATION]: { name: 'Respiration', maxLevel: 3, weight: 2, slots: ['helmet'] },
  [Enchantment.AQUA_AFFINITY]: { name: 'Aqua Affinity', maxLevel: 1, weight: 2, slots: ['helmet'] },
  [Enchantment.THORNS]: { name: 'Thorns', maxLevel: 3, weight: 1, slots: ['chestplate'] },

  [Enchantment.SHARPNESS]: { name: 'Sharpness', maxLevel: 5, weight: 10, slots: ['sword', 'axe'] },
  [Enchantment.SMITE]: { name: 'Smite', maxLevel: 5, weight: 5, slots: ['sword', 'axe'] },
  [Enchantment.BANE_OF_ARTHROPODS]: { name: 'Bane of Arthropods', maxLevel: 5, weight: 5, slots: ['sword', 'axe'] },
  [Enchantment.KNOCKBACK]: { name: 'Knockback', maxLevel: 2, weight: 5, slots: ['sword'] },
  [Enchantment.FIRE_ASPECT]: { name: 'Fire Aspect', maxLevel: 2, weight: 2, slots: ['sword'] },
  [Enchantment.LOOTING]: { name: 'Looting', maxLevel: 3, weight: 2, slots: ['sword'] },

  [Enchantment.EFFICIENCY]: { name: 'Efficiency', maxLevel: 5, weight: 10, slots: ['pickaxe', 'axe', 'shovel', 'hoe'] },
  [Enchantment.SILK_TOUCH]: { name: 'Silk Touch', maxLevel: 1, weight: 1, slots: ['pickaxe', 'axe', 'shovel', 'hoe'] },
  [Enchantment.UNBREAKING]: { name: 'Unbreaking', maxLevel: 3, weight: 5, slots: ['all'] },
  [Enchantment.FORTUNE]: { name: 'Fortune', maxLevel: 3, weight: 2, slots: ['pickaxe', 'axe', 'shovel', 'hoe'] },
  [Enchantment.MENDING]: { name: 'Mending', maxLevel: 1, weight: 2, slots: ['all'] },

  [Enchantment.POWER]: { name: 'Power', maxLevel: 5, weight: 10, slots: ['bow'] },
  [Enchantment.PUNCH]: { name: 'Punch', maxLevel: 2, weight: 2, slots: ['bow'] },
  [Enchantment.FLAME]: { name: 'Flame', maxLevel: 1, weight: 2, slots: ['bow'] },
  [Enchantment.INFINITY]: { name: 'Infinity', maxLevel: 1, weight: 1, slots: ['bow'] },
};

// Get the tool slot type from an item type
function getItemSlotType(itemType) {
  const def = ItemDefinitions[itemType];
  if (!def) return null;

  if (def.category === ItemCategory.TOOL) {
    if (def.name?.includes('Sword')) return 'sword';
    if (def.name?.includes('Pickaxe')) return 'pickaxe';
    if (def.name?.includes('Axe') && !def.name?.includes('Pickaxe')) return 'axe';
    if (def.name?.includes('Shovel')) return 'shovel';
    if (def.name?.includes('Hoe')) return 'hoe';
  }
  if (def.category === ItemCategory.ARMOR) {
    if (def.name?.includes('Helmet')) return 'helmet';
    if (def.name?.includes('Chestplate')) return 'chestplate';
    if (def.name?.includes('Leggings')) return 'leggings';
    if (def.name?.includes('Boots')) return 'boots';
  }
  if (itemType === ItemType.BOW) return 'bow';
  if (itemType === ItemType.CROSSBOW) return 'crossbow';
  return null;
}

// Check if item can have enchantment
export function canEnchant(itemType, enchantmentId) {
  const slotType = getItemSlotType(itemType);
  if (!slotType) return false;

  const data = EnchantmentData[enchantmentId];
  if (!data) return false;

  return data.slots.includes('all') || data.slots.includes(slotType);
}

// Get random enchantments for enchanting table
export function getRandomEnchantments(itemType, level, seed) {
  const slotType = getItemSlotType(itemType);
  if (!slotType) return [];

  const available = [];
  for (const [id, data] of Object.entries(EnchantmentData)) {
    if (data.slots.includes('all') || data.slots.includes(slotType)) {
      available.push({ id, ...data });
    }
  }

  if (available.length === 0) return [];

  // Pseudo-random based on seed
  let rng = seed;
  const nextRng = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  const result = [];
  const enchCount = Math.min(1 + Math.floor(level / 10), 3);

  for (let i = 0; i < enchCount && available.length > 0; i++) {
    // Weight-based selection
    const totalWeight = available.reduce((sum, e) => sum + e.weight, 0);
    let roll = nextRng() * totalWeight;
    let chosen = available[0];
    for (const ench of available) {
      roll -= ench.weight;
      if (roll <= 0) { chosen = ench; break; }
    }

    // Determine level based on enchanting level
    const maxLvl = chosen.maxLevel;
    const enchLevel = Math.min(maxLvl, 1 + Math.floor(nextRng() * (level / 10) * maxLvl));

    result.push({ id: chosen.id, level: enchLevel });
    available.splice(available.indexOf(chosen), 1);
  }

  return result;
}

// Apply enchantment bonuses
export function getEnchantmentBonus(enchantments, type) {
  if (!enchantments || enchantments.length === 0) return 0;

  let bonus = 0;
  for (const ench of enchantments) {
    switch (type) {
      case 'damage':
        if (ench.id === Enchantment.SHARPNESS) bonus += 0.5 + ench.level * 0.5;
        if (ench.id === Enchantment.SMITE) bonus += ench.level * 2.5;
        if (ench.id === Enchantment.POWER) bonus += 0.5 + ench.level * 0.5;
        break;
      case 'protection':
        if (ench.id === Enchantment.PROTECTION) bonus += ench.level;
        if (ench.id === Enchantment.FIRE_PROTECTION) bonus += ench.level * 2;
        if (ench.id === Enchantment.BLAST_PROTECTION) bonus += ench.level * 2;
        if (ench.id === Enchantment.PROJECTILE_PROTECTION) bonus += ench.level * 2;
        break;
      case 'mining_speed':
        if (ench.id === Enchantment.EFFICIENCY) bonus += ench.level * ench.level + 1;
        break;
      case 'unbreaking':
        if (ench.id === Enchantment.UNBREAKING) bonus += ench.level;
        break;
      case 'fortune':
        if (ench.id === Enchantment.FORTUNE) bonus += ench.level;
        break;
      case 'feather_falling':
        if (ench.id === Enchantment.FEATHER_FALLING) bonus += ench.level;
        break;
      case 'knockback':
        if (ench.id === Enchantment.KNOCKBACK) bonus += ench.level;
        if (ench.id === Enchantment.PUNCH) bonus += ench.level;
        break;
      case 'fire_aspect':
        if (ench.id === Enchantment.FIRE_ASPECT) bonus += ench.level * 4; // seconds
        break;
      case 'looting':
        if (ench.id === Enchantment.LOOTING) bonus += ench.level;
        break;
    }
  }
  return bonus;
}

// Format enchantment name with roman numerals
export function formatEnchantment(enchId, level) {
  const data = EnchantmentData[enchId];
  if (!data) return enchId;
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V'];
  return `${data.name} ${numerals[level] || level}`;
}
