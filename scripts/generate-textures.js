import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS = path.join(__dirname, '..', 'assets', 'textures');

function createPNG(width, height) {
  const png = new PNG({ width, height });
  return png;
}

function setPixel(png, x, y, r, g, b, a = 255) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fill(png, r, g, b, a = 255) {
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++)
      setPixel(png, x, y, r, g, b, a);
}

function noise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453;
  return n - Math.floor(n);
}

function vary(base, amount, x, y, seed = 0) {
  const n = noise(x, y, seed);
  return Math.max(0, Math.min(255, base + Math.floor((n - 0.5) * amount)));
}

function savePNG(png, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    console.log(`  SKIP (exists): ${path.relative(ASSETS, filePath)}`);
    return;
  }
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`  CREATED: ${path.relative(ASSETS, filePath)}`);
}

// === BLOCK TEXTURES ===

function generateStoneVariant(name, baseR, baseG, baseB, speckR, speckG, speckB) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y, 1);
      let r = vary(baseR, 30, x, y, 2);
      let g = vary(baseG, 30, x, y, 3);
      let b = vary(baseB, 30, x, y, 4);
      if (n > 0.7) { r = speckR; g = speckG; b = speckB; }
      setPixel(png, x, y, r, g, b);
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateOre(name, baseR, baseG, baseB, oreR, oreG, oreB, deepslate = false) {
  const png = createPNG(16, 16);
  // Stone base
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let r = vary(baseR, 20, x, y, 5);
      let g = vary(baseG, 20, x, y, 6);
      let b = vary(baseB, 20, x, y, 7);
      setPixel(png, x, y, r, g, b);
    }
  }
  // Ore spots
  const spots = [[3,3],[5,7],[10,4],[8,10],[12,12],[2,11],[13,6],[6,13]];
  spots.forEach(([sx, sy]) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const px = sx + dx, py = sy + dy;
        if (px >= 0 && px < 16 && py >= 0 && py < 16 && noise(px+sx, py+sy, 8) > 0.3) {
          setPixel(png, px, py, oreR, oreG, oreB);
        }
      }
    }
  });
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generatePlanks(name, baseR, baseG, baseB) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let r = vary(baseR, 15, x, y, 10);
      let g = vary(baseG, 15, x, y, 11);
      let b = vary(baseB, 15, x, y, 12);
      // Plank lines
      if (y % 4 === 0) { r = Math.max(0, r - 30); g = Math.max(0, g - 30); b = Math.max(0, b - 30); }
      // Vertical grain
      if (x % 8 === 0 && y % 4 !== 0) { r = Math.max(0, r - 15); g = Math.max(0, g - 15); b = Math.max(0, b - 15); }
      setPixel(png, x, y, r, g, b);
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateLog(name, baseR, baseG, baseB) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let r = vary(baseR, 20, x, y, 13);
      let g = vary(baseG, 20, x, y, 14);
      let b = vary(baseB, 20, x, y, 15);
      // Bark lines
      if ((y + Math.floor(noise(x, y, 16) * 2)) % 3 === 0) {
        r = Math.max(0, r - 25); g = Math.max(0, g - 25); b = Math.max(0, b - 25);
      }
      setPixel(png, x, y, r, g, b);
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateLogTop(name, baseR, baseG, baseB, ringR, ringG, ringB) {
  const png = createPNG(16, 16);
  const cx = 7.5, cy = 7.5;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > 7) {
        // Bark
        setPixel(png, x, y, vary(baseR, 15, x, y, 17), vary(baseG, 15, x, y, 18), vary(baseB, 15, x, y, 19));
      } else {
        // Rings
        const ring = Math.floor(dist) % 3;
        if (ring === 0) {
          setPixel(png, x, y, ringR, ringG, ringB);
        } else {
          setPixel(png, x, y, vary(ringR + 20, 10, x, y, 20), vary(ringG + 15, 10, x, y, 21), vary(ringB + 10, 10, x, y, 22));
        }
      }
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateLeaves(name, baseR, baseG, baseB) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y, 25);
      if (n > 0.15) {
        let r = vary(baseR, 40, x, y, 26);
        let g = vary(baseG, 40, x, y, 27);
        let b = vary(baseB, 40, x, y, 28);
        setPixel(png, x, y, r, g, b);
      } else {
        setPixel(png, x, y, 0, 0, 0, 0); // Transparent gaps
      }
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateSolid(name, r, g, b, variation = 20) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      setPixel(png, x, y, vary(r, variation, x, y, 30), vary(g, variation, x, y, 31), vary(b, variation, x, y, 32));
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateGlass(name, r, g, b) {
  const png = createPNG(16, 16);
  fill(png, r, g, b, 60); // Very transparent
  // Frame
  for (let i = 0; i < 16; i++) {
    setPixel(png, i, 0, r - 40, g - 40, b - 40, 200);
    setPixel(png, i, 15, r - 40, g - 40, b - 40, 200);
    setPixel(png, 0, i, r - 40, g - 40, b - 40, 200);
    setPixel(png, 15, i, r - 40, g - 40, b - 40, 200);
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateWool(name, r, g, b) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y, 35) * 15;
      setPixel(png, x, y, Math.min(255, r + n), Math.min(255, g + n), Math.min(255, b + n));
    }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateBricks(name, brickR, brickG, brickB, mortarR, mortarG, mortarB) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const offset = (row % 2) * 8;
      const brickX = (x + offset) % 16;
      if (y % 4 === 0 || brickX % 8 === 0) {
        setPixel(png, x, y, mortarR, mortarG, mortarB);
      } else {
        setPixel(png, x, y, vary(brickR, 20, x, y, 40), vary(brickG, 20, x, y, 41), vary(brickB, 20, x, y, 42));
      }
    }
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateCraftingTable(face) {
  const png = createPNG(16, 16);
  if (face === 'top') {
    // Wooden top with grid lines
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        setPixel(png, x, y, vary(160, 15, x, y, 50), vary(120, 15, x, y, 51), vary(70, 15, x, y, 52));
      }
    // Grid
    for (let i = 0; i < 16; i++) {
      setPixel(png, 5, i, 80, 60, 30);
      setPixel(png, 10, i, 80, 60, 30);
      setPixel(png, i, 5, 80, 60, 30);
      setPixel(png, i, 10, 80, 60, 30);
    }
  } else if (face === 'front') {
    generatePlanks('_tmp_ct.png', 160, 120, 70);
    // Actually let's just make a distinctive side
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let r = vary(160, 15, x, y, 53), g = vary(120, 15, x, y, 54), b = vary(70, 15, x, y, 55);
        if (y % 4 === 0) { r -= 30; g -= 30; b -= 30; }
        setPixel(png, x, y, Math.max(0,r), Math.max(0,g), Math.max(0,b));
      }
    // Tools pattern
    // Saw
    for (let i = 2; i < 7; i++) setPixel(png, i, 3, 150, 150, 150);
    for (let i = 2; i < 7; i++) setPixel(png, i, 4, 120, 120, 120);
    // Hammer
    for (let i = 10; i < 14; i++) setPixel(png, i, 3, 100, 100, 100);
    setPixel(png, 12, 4, 120, 90, 50);
    setPixel(png, 12, 5, 120, 90, 50);
    setPixel(png, 12, 6, 120, 90, 50);
  } else {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let r = vary(160, 15, x, y, 56), g = vary(120, 15, x, y, 57), b = vary(70, 15, x, y, 58);
        if (y % 4 === 0) { r -= 30; g -= 30; b -= 30; }
        setPixel(png, x, y, Math.max(0,r), Math.max(0,g), Math.max(0,b));
      }
  }
  return png;
}

function generateFurnace(face, lit = false) {
  const png = createPNG(16, 16);
  // Cobblestone-like base
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      setPixel(png, x, y, vary(130, 25, x, y, 60), vary(130, 25, x, y, 61), vary(130, 25, x, y, 62));
  
  if (face === 'front') {
    // Opening
    for (let y = 5; y < 13; y++)
      for (let x = 4; x < 12; x++) {
        if (lit) setPixel(png, x, y, vary(255, 20, x, y, 63), vary(150, 30, x, y, 64), vary(50, 20, x, y, 65));
        else setPixel(png, x, y, 40, 40, 40);
      }
    // Frame
    for (let i = 4; i < 12; i++) {
      setPixel(png, i, 4, 80, 80, 80);
      setPixel(png, i, 13, 80, 80, 80);
      setPixel(png, 3, i+1, 80, 80, 80);
      setPixel(png, 12, i+1, 80, 80, 80);
    }
  }
  return png;
}

// === ITEM TEXTURES ===
function generateToolTexture(name, headR, headG, headB, toolType) {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0); // Transparent
  
  // Handle (diagonal)
  const handleColor = [120, 85, 50];
  if (toolType === 'sword') {
    // Blade
    for (let i = 1; i < 11; i++) {
      setPixel(png, 7 - Math.floor(i * 0.3), 15 - i, headR, headG, headB);
      setPixel(png, 8 - Math.floor(i * 0.3), 15 - i, headR + 20, headG + 20, headB + 20);
    }
    // Guard
    setPixel(png, 5, 12, 80, 80, 80);
    setPixel(png, 6, 12, 80, 80, 80);
    setPixel(png, 7, 12, 80, 80, 80);
    setPixel(png, 8, 12, 80, 80, 80);
    setPixel(png, 9, 12, 80, 80, 80);
    // Handle
    for (let i = 13; i < 16; i++) {
      setPixel(png, 8 + (i - 12), i, ...handleColor);
    }
  } else if (toolType === 'pickaxe') {
    // Handle
    for (let i = 6; i < 16; i++) setPixel(png, i - 1, i, ...handleColor);
    // Head
    for (let x = 2; x < 9; x++) { setPixel(png, x, 3, headR, headG, headB); setPixel(png, x, 4, headR, headG, headB); }
    setPixel(png, 2, 5, headR, headG, headB);
    setPixel(png, 8, 5, headR, headG, headB);
  } else if (toolType === 'axe') {
    for (let i = 6; i < 16; i++) setPixel(png, i - 1, i, ...handleColor);
    // Head
    for (let y = 2; y < 7; y++) for (let x = 3; x < 7; x++) {
      if (x - 3 <= y - 2) setPixel(png, x, y, headR, headG, headB);
    }
  } else if (toolType === 'shovel') {
    for (let i = 5; i < 16; i++) setPixel(png, 8 - Math.floor((i-5)*0.3), i, ...handleColor);
    // Head
    for (let y = 1; y < 6; y++) for (let x = 5; x < 9; x++) {
      if (Math.abs(x - 6.5) + Math.abs(y - 3) < 3.5) setPixel(png, x, y, headR, headG, headB);
    }
  } else if (toolType === 'hoe') {
    for (let i = 6; i < 16; i++) setPixel(png, i - 1, i, ...handleColor);
    for (let x = 3; x < 8; x++) { setPixel(png, x, 3, headR, headG, headB); setPixel(png, x, 4, headR, headG, headB); }
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}

function generateFoodTexture(name, r, g, b, shape = 'round') {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);
  if (shape === 'round') {
    for (let y = 4; y < 12; y++)
      for (let x = 4; x < 12; x++) {
        if ((x-7.5)**2 + (y-7.5)**2 < 16) {
          setPixel(png, x, y, vary(r, 20, x, y, 70), vary(g, 20, x, y, 71), vary(b, 20, x, y, 72));
        }
      }
  } else if (shape === 'steak') {
    for (let y = 3; y < 13; y++)
      for (let x = 3; x < 13; x++) {
        const n = noise(x, y, 73);
        if (n > 0.2 && (x-8)**2 + (y-8)**2 < 30) {
          setPixel(png, x, y, vary(r, 25, x, y, 74), vary(g, 25, x, y, 75), vary(b, 25, x, y, 76));
        }
      }
  } else if (shape === 'bread') {
    for (let y = 5; y < 12; y++)
      for (let x = 2; x < 14; x++) {
        const top = y < 7;
        setPixel(png, x, y, vary(r + (top?20:0), 15, x, y, 77), vary(g + (top?15:0), 15, x, y, 78), vary(b, 10, x, y, 79));
      }
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}

function generateIngot(name, r, g, b) {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);
  // Ingot shape (trapezoid)
  for (let y = 4; y < 12; y++) {
    const w = y < 7 ? 10 : 12;
    const sx = 8 - w/2;
    for (let x = sx; x < sx + w; x++) {
      if (x >= 0 && x < 16) {
        const highlight = y < 6 ? 30 : 0;
        setPixel(png, Math.floor(x), y, 
          Math.min(255, r + highlight + Math.floor(noise(x,y,80)*15)), 
          Math.min(255, g + highlight + Math.floor(noise(x,y,81)*15)), 
          Math.min(255, b + highlight + Math.floor(noise(x,y,82)*15)));
      }
    }
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}

function generateGem(name, r, g, b) {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);
  // Diamond/emerald shape
  const shape = [
    [7,3],[8,3],
    [6,4],[7,4],[8,4],[9,4],
    [5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
    [5,6],[6,6],[7,6],[8,6],[9,6],[10,6],
    [5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
    [6,8],[7,8],[8,8],[9,8],
    [6,9],[7,9],[8,9],[9,9],
    [7,10],[8,10],
    [7,11],[8,11],
  ];
  shape.forEach(([x, y]) => {
    const highlight = y < 6 ? 40 : (x < 8 ? 20 : 0);
    setPixel(png, x, y, Math.min(255, r + highlight), Math.min(255, g + highlight), Math.min(255, b + highlight));
  });
  savePNG(png, path.join(ASSETS, 'item', name));
}

// === GENERATE ALL TEXTURES ===
console.log('=== Generating missing textures ===\n');

// --- BLOCK TEXTURES ---
console.log('Block textures:');

// Cobblestone
generateStoneVariant('cobblestone.png', 120, 120, 120, 90, 90, 90);
// Mossy cobblestone
generateStoneVariant('mossy_cobblestone.png', 110, 120, 110, 60, 100, 60);
// Granite
generateStoneVariant('granite.png', 160, 110, 90, 140, 90, 70);
// Polished granite
generateSolid('polished_granite.png', 155, 105, 85, 10);
// Diorite
generateStoneVariant('diorite.png', 190, 190, 190, 160, 160, 160);
// Polished diorite
generateSolid('polished_diorite.png', 195, 195, 195, 8);
// Andesite
generateStoneVariant('andesite.png', 140, 140, 140, 120, 125, 120);
// Polished andesite
generateSolid('polished_andesite.png', 145, 145, 145, 8);
// Deepslate
generateStoneVariant('deepslate.png', 60, 60, 65, 45, 45, 50);
// Tuff
generateStoneVariant('tuff.png', 105, 105, 95, 90, 90, 80);
// Calcite
generateSolid('calcite.png', 225, 225, 220, 10);

// Gravel
generateStoneVariant('gravel.png', 130, 125, 120, 100, 95, 90);
// Clay
generateSolid('clay.png', 160, 165, 175, 12);
// Obsidian
generateSolid('obsidian.png', 20, 15, 30, 8);
// Bedrock (use existing or generate)
generateStoneVariant('bedrock.png', 50, 50, 50, 30, 30, 30);

// Glass
generateGlass('glass.png', 200, 220, 240);

// Ores
generateOre('iron_ore.png', 136, 136, 136, 210, 180, 150);
generateOre('gold_ore.png', 136, 136, 136, 255, 215, 0);
generateOre('diamond_ore.png', 136, 136, 136, 80, 220, 230);
generateOre('emerald_ore.png', 136, 136, 136, 50, 200, 80);
generateOre('lapis_ore.png', 136, 136, 136, 30, 60, 180);
generateOre('redstone_ore.png', 136, 136, 136, 200, 30, 30);
generateOre('copper_ore.png', 136, 136, 136, 190, 120, 70);
generateOre('deepslate_iron_ore.png', 60, 60, 65, 210, 180, 150);
generateOre('deepslate_gold_ore.png', 60, 60, 65, 255, 215, 0);
generateOre('deepslate_diamond_ore.png', 60, 60, 65, 80, 220, 230);
generateOre('deepslate_coal_ore.png', 60, 60, 65, 30, 30, 30);
generateOre('deepslate_copper_ore.png', 60, 60, 65, 190, 120, 70);
generateOre('deepslate_emerald_ore.png', 60, 60, 65, 50, 200, 80);
generateOre('deepslate_lapis_ore.png', 60, 60, 65, 30, 60, 180);
generateOre('deepslate_redstone_ore.png', 60, 60, 65, 200, 30, 30);
generateOre('nether_gold_ore.png', 130, 55, 55, 255, 215, 0);
generateOre('nether_quartz_ore.png', 130, 55, 55, 230, 220, 210);
generateOre('ancient_debris_side.png', 100, 70, 60, 70, 50, 40);

// Ore blocks
generateSolid('iron_block.png', 220, 220, 220, 12);
generateSolid('gold_block.png', 255, 215, 0, 15);
generateSolid('diamond_block.png', 100, 230, 240, 12);
generateSolid('emerald_block.png', 60, 210, 90, 12);
generateSolid('lapis_block.png', 35, 65, 185, 15);
generateSolid('redstone_block.png', 180, 20, 20, 12);
generateSolid('copper_block.png', 190, 120, 70, 15);
generateSolid('netherite_block.png', 50, 45, 45, 8);
generateSolid('amethyst_block.png', 140, 90, 200, 15);
generateSolid('raw_iron_block.png', 200, 175, 150, 20);
generateSolid('raw_gold_block.png', 240, 200, 50, 20);
generateSolid('raw_copper_block.png', 185, 115, 65, 20);

// Wood types
const woodTypes = [
  { name: 'oak', r: 170, g: 135, b: 85, barkR: 110, barkG: 85, barkB: 50, leafR: 55, leafG: 120, leafB: 35 },
  { name: 'birch', r: 210, g: 200, b: 170, barkR: 220, barkG: 215, barkB: 200, leafR: 75, leafG: 140, leafB: 50 },
  { name: 'jungle', r: 155, g: 110, b: 65, barkR: 85, barkG: 70, barkB: 35, leafR: 40, leafG: 110, leafB: 20 },
  { name: 'acacia', r: 170, g: 95, b: 50, barkR: 110, barkG: 105, barkB: 100, leafR: 100, leafG: 130, leafB: 30 },
  { name: 'cherry', r: 230, g: 175, b: 160, barkR: 60, barkG: 40, barkB: 45, leafR: 230, leafG: 170, leafB: 190 },
  { name: 'mangrove', r: 120, g: 60, b: 45, barkR: 90, barkG: 55, barkB: 35, leafR: 40, leafG: 100, leafB: 25 },
];

woodTypes.forEach(w => {
  generatePlanks(`${w.name}_planks.png`, w.r, w.g, w.b);
  generateLog(`${w.name}_log.png`, w.barkR, w.barkG, w.barkB);
  generateLogTop(`${w.name}_log_top.png`, w.barkR, w.barkG, w.barkB, w.r-30, w.g-20, w.b-10);
  generateLeaves(`${w.name}_leaves.png`, w.leafR, w.leafG, w.leafB);
});

// Spruce & Dark Oak planks
generatePlanks('spruce_planks.png', 115, 85, 50);
generatePlanks('dark_oak_planks.png', 65, 45, 25);
// Dark oak log
generateLog('dark_oak_log.png', 55, 40, 20);
generateLogTop('dark_oak_log_top.png', 55, 40, 20, 65, 50, 30);

// Bricks
generateBricks('bricks.png', 165, 85, 65, 180, 175, 165);
generateBricks('stone_bricks.png', 130, 130, 130, 110, 110, 110);
generateBricks('nether_bricks.png', 50, 25, 30, 35, 15, 20);

// Wool colors
const woolColors = {
  white: [235, 235, 235], orange: [235, 140, 40], magenta: [190, 70, 190],
  light_blue: [110, 170, 230], yellow: [240, 220, 50], lime: [120, 200, 50],
  pink: [240, 160, 180], gray: [75, 75, 75], light_gray: [155, 155, 155],
  cyan: [30, 130, 140], purple: [120, 50, 180], blue: [55, 55, 180],
  brown: [115, 75, 40], green: [85, 115, 30], red: [160, 45, 40], black: [25, 25, 25]
};
Object.entries(woolColors).forEach(([color, [r, g, b]]) => {
  generateWool(`${color}_wool.png`, r, g, b);
  generateSolid(`${color}_concrete.png`, r, g, b, 8);
  generateSolid(`${color}_terracotta.png`, 
    Math.floor(r * 0.7 + 50),
    Math.floor(g * 0.6 + 40), 
    Math.floor(b * 0.5 + 35), 12);
});

// Glowstone
generateSolid('glowstone.png', 255, 220, 120, 25);
// Netherrack
generateStoneVariant('netherrack.png', 130, 55, 55, 110, 40, 40);
// Soul sand
generateSolid('soul_sand.png', 80, 65, 50, 15);
// Soul soil
generateSolid('soul_soil.png', 70, 55, 40, 12);
// Basalt side
generateSolid('basalt_side.png', 75, 75, 80, 15);
// End stone
generateSolid('end_stone.png', 220, 220, 160, 12);
// Purpur block
generateSolid('purpur_block.png', 170, 125, 170, 10);
// Prismarine
generateStoneVariant('prismarine.png', 80, 150, 140, 60, 130, 120);
// Sea lantern
generateSolid('sea_lantern.png', 180, 220, 230, 20);
// Crying obsidian
generateSolid('crying_obsidian.png', 30, 10, 50, 10);
// Blackstone
generateStoneVariant('blackstone.png', 40, 35, 40, 30, 25, 30);
// Moss block
generateSolid('moss_block.png', 85, 120, 45, 20);
// Mud
generateSolid('mud.png', 65, 55, 50, 12);
// Packed mud  
generateSolid('packed_mud.png', 140, 110, 85, 15);
// Sculk
generateSolid('sculk.png', 15, 30, 40, 10);

// Crafting table
let png = generateCraftingTable('top');
savePNG(png, path.join(ASSETS, 'block', 'crafting_table_top.png'));
png = generateCraftingTable('front');
savePNG(png, path.join(ASSETS, 'block', 'crafting_table_front.png'));
png = generateCraftingTable('side');
savePNG(png, path.join(ASSETS, 'block', 'crafting_table_side.png'));

// Furnace
png = generateFurnace('front', false);
savePNG(png, path.join(ASSETS, 'block', 'furnace_front.png'));
png = generateFurnace('front', true);
savePNG(png, path.join(ASSETS, 'block', 'furnace_front_on.png'));
png = generateFurnace('side');
savePNG(png, path.join(ASSETS, 'block', 'furnace_side.png'));
png = generateFurnace('top');
savePNG(png, path.join(ASSETS, 'block', 'furnace_top.png'));

// Chest
generateSolid('chest_front.png', 160, 120, 50, 20);
generateSolid('chest_side.png', 150, 110, 45, 15);
generateSolid('chest_top.png', 140, 105, 40, 12);

// TNT
{
  const tnt = createPNG(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (y < 4 || y > 11) setPixel(tnt, x, y, vary(180, 10, x, y, 90), vary(160, 10, x, y, 91), vary(130, 10, x, y, 92));
      else setPixel(tnt, x, y, vary(220, 15, x, y, 93), vary(50, 15, x, y, 94), vary(40, 15, x, y, 95));
    }
  savePNG(tnt, path.join(ASSETS, 'block', 'tnt_side.png'));
  generateSolid('tnt_top.png', 200, 180, 140, 15);
  generateSolid('tnt_bottom.png', 190, 170, 130, 12);
}

// Bookshelf
{
  const bs = createPNG(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (y < 3 || y > 12) {
        // Planks top/bottom
        setPixel(bs, x, y, vary(160, 12, x, y, 96), vary(120, 12, x, y, 97), vary(70, 12, x, y, 98));
      } else {
        // Books
        const book = Math.floor(x / 4) % 3;
        const colors = [[140, 40, 40], [50, 100, 50], [50, 50, 140]];
        const [r, g, b] = colors[book];
        setPixel(bs, x, y, vary(r, 15, x, y, 99), vary(g, 15, x, y, 100), vary(b, 15, x, y, 101));
      }
    }
  savePNG(bs, path.join(ASSETS, 'block', 'bookshelf.png'));
}

// Lava
generateSolid('lava.png', 220, 100, 20, 30);
generateSolid('lava_still.png', 220, 100, 20, 30);

// Farmland
generateSolid('farmland.png', 120, 80, 40, 15);
generateSolid('farmland_moist.png', 80, 55, 30, 12);

// Grass path / Dirt path
generateSolid('dirt_path_top.png', 165, 145, 95, 12);

// Sponge
generateSolid('sponge.png', 200, 200, 60, 20);

// Note block / Jukebox
generatePlanks('note_block.png', 90, 60, 40);
generatePlanks('jukebox_side.png', 90, 60, 40);
generateSolid('jukebox_top.png', 80, 55, 35, 10);

// Pumpkin
generateSolid('pumpkin_side.png', 210, 140, 30, 20);
generateSolid('pumpkin_top.png', 180, 130, 30, 15);
// Jack o lantern
generateSolid('jack_o_lantern.png', 220, 150, 40, 20);

// Melon
generateSolid('melon_side.png', 120, 160, 40, 20);
generateSolid('melon_top.png', 140, 170, 50, 15);

// Hay bale
generateSolid('hay_block_side.png', 200, 180, 80, 20);
generateSolid('hay_block_top.png', 210, 190, 90, 15);

// Terracotta (plain)
generateSolid('terracotta.png', 160, 100, 75, 12);

// Smooth stone
generateSolid('smooth_stone.png', 165, 165, 165, 6);
generateSolid('smooth_stone_slab_side.png', 160, 160, 160, 8);

// Sandstone
generateSolid('sandstone.png', 220, 205, 160, 12);
generateSolid('sandstone_top.png', 225, 210, 165, 8);
generateSolid('sandstone_bottom.png', 215, 200, 155, 8);
generateSolid('red_sandstone.png', 190, 105, 45, 15);

// Quartz
generateSolid('quartz_block_side.png', 235, 230, 225, 6);
generateSolid('quartz_block_top.png', 240, 235, 230, 5);

// Lantern (simple)
generateSolid('lantern.png', 80, 60, 30, 15);

// Ladder
{
  const ladder = createPNG(16, 16);
  fill(ladder, 0, 0, 0, 0);
  // Vertical rails
  for (let y = 0; y < 16; y++) {
    setPixel(ladder, 3, y, 130, 95, 55);
    setPixel(ladder, 12, y, 130, 95, 55);
  }
  // Horizontal rungs
  for (let x = 3; x <= 12; x++) {
    setPixel(ladder, x, 3, 150, 115, 70);
    setPixel(ladder, x, 7, 150, 115, 70);
    setPixel(ladder, x, 11, 150, 115, 70);
  }
  savePNG(ladder, path.join(ASSETS, 'block', 'ladder.png'));
}

// Enchanting table
generateSolid('enchanting_table_top.png', 45, 20, 20, 10);
generateSolid('enchanting_table_side.png', 160, 30, 30, 12);
generateSolid('enchanting_table_bottom.png', 50, 50, 50, 8);

// Anvil
generateSolid('anvil.png', 60, 60, 60, 15);

// Brewing stand (simple texture)
generateSolid('brewing_stand.png', 100, 90, 80, 12);

// Barrier (invisible in-game, red X for inventory)
{
  const barrier = createPNG(16, 16);
  fill(barrier, 0, 0, 0, 0);
  for (let i = 0; i < 16; i++) {
    setPixel(barrier, i, i, 255, 0, 0);
    setPixel(barrier, 15-i, i, 255, 0, 0);
  }
  savePNG(barrier, path.join(ASSETS, 'block', 'barrier.png'));
}

// Spawner
generateStoneVariant('spawner.png', 50, 50, 60, 30, 30, 40);

// --- ITEM TEXTURES ---
console.log('\nItem textures:');

// Tools - Wood tier
generateToolTexture('wooden_sword.png', 160, 120, 70, 'sword');
generateToolTexture('wooden_pickaxe.png', 160, 120, 70, 'pickaxe');
generateToolTexture('wooden_axe.png', 160, 120, 70, 'axe');
generateToolTexture('wooden_shovel.png', 160, 120, 70, 'shovel');
generateToolTexture('wooden_hoe.png', 160, 120, 70, 'hoe');

// Stone tier
generateToolTexture('stone_sword.png', 130, 130, 130, 'sword');
generateToolTexture('stone_pickaxe.png', 130, 130, 130, 'pickaxe');
generateToolTexture('stone_axe.png', 130, 130, 130, 'axe');
generateToolTexture('stone_shovel.png', 130, 130, 130, 'shovel');
generateToolTexture('stone_hoe.png', 130, 130, 130, 'hoe');

// Iron tier
generateToolTexture('iron_sword.png', 210, 210, 210, 'sword');
generateToolTexture('iron_pickaxe.png', 210, 210, 210, 'pickaxe');
generateToolTexture('iron_axe.png', 210, 210, 210, 'axe');
generateToolTexture('iron_shovel.png', 210, 210, 210, 'shovel');
generateToolTexture('iron_hoe.png', 210, 210, 210, 'hoe');

// Gold tier
generateToolTexture('golden_sword.png', 255, 215, 0, 'sword');
generateToolTexture('golden_pickaxe.png', 255, 215, 0, 'pickaxe');
generateToolTexture('golden_axe.png', 255, 215, 0, 'axe');
generateToolTexture('golden_shovel.png', 255, 215, 0, 'shovel');
generateToolTexture('golden_hoe.png', 255, 215, 0, 'hoe');

// Diamond tier
generateToolTexture('diamond_sword.png', 80, 220, 230, 'sword');
generateToolTexture('diamond_pickaxe.png', 80, 220, 230, 'pickaxe');
generateToolTexture('diamond_axe.png', 80, 220, 230, 'axe');
generateToolTexture('diamond_shovel.png', 80, 220, 230, 'shovel');
generateToolTexture('diamond_hoe.png', 80, 220, 230, 'hoe');

// Netherite tier
generateToolTexture('netherite_sword.png', 70, 65, 65, 'sword');
generateToolTexture('netherite_pickaxe.png', 70, 65, 65, 'pickaxe');
generateToolTexture('netherite_axe.png', 70, 65, 65, 'axe');
generateToolTexture('netherite_shovel.png', 70, 65, 65, 'shovel');
generateToolTexture('netherite_hoe.png', 70, 65, 65, 'hoe');

// Materials
generateIngot('iron_ingot.png', 210, 210, 210);
generateIngot('gold_ingot.png', 255, 215, 0);
generateIngot('copper_ingot.png', 190, 120, 70);
generateIngot('netherite_ingot.png', 70, 65, 65);
generateGem('diamond.png', 80, 220, 230);
generateGem('emerald.png', 50, 200, 80);
generateGem('lapis_lazuli.png', 30, 60, 180);
generateGem('amethyst_shard.png', 140, 90, 200);
generateSolid('coal.png', 35, 35, 35, 8);
generateSolid('charcoal.png', 50, 40, 35, 8);
generateSolid('redstone.png', 200, 30, 30, 15);
generateSolid('flint.png', 60, 60, 65, 10);
generateIngot('brick.png', 165, 85, 65);
generateIngot('nether_brick.png', 50, 25, 30);

// Food
generateFoodTexture('apple.png', 200, 40, 40, 'round');
generateFoodTexture('golden_apple.png', 255, 215, 0, 'round');
generateFoodTexture('bread.png', 190, 150, 80, 'bread');
generateFoodTexture('cooked_beef.png', 140, 70, 40, 'steak');
generateFoodTexture('raw_beef.png', 180, 50, 50, 'steak');
generateFoodTexture('cooked_chicken.png', 180, 130, 80, 'steak');
generateFoodTexture('raw_chicken.png', 220, 170, 150, 'steak');
generateFoodTexture('cooked_porkchop.png', 170, 100, 60, 'steak');
generateFoodTexture('raw_porkchop.png', 200, 140, 130, 'steak');
generateFoodTexture('cooked_mutton.png', 150, 90, 55, 'steak');
generateFoodTexture('raw_mutton.png', 175, 60, 60, 'steak');
generateFoodTexture('cooked_cod.png', 180, 160, 120, 'steak');
generateFoodTexture('raw_cod.png', 160, 140, 100, 'steak');
generateFoodTexture('cooked_salmon.png', 200, 110, 70, 'steak');
generateFoodTexture('raw_salmon.png', 190, 80, 50, 'steak');
generateFoodTexture('melon_slice.png', 200, 50, 40, 'round');
generateFoodTexture('sweet_berries.png', 180, 30, 30, 'round');
generateFoodTexture('baked_potato.png', 200, 180, 100, 'round');
generateFoodTexture('poisonous_potato.png', 160, 190, 80, 'round');
generateFoodTexture('golden_carrot.png', 255, 200, 0, 'round');
generateFoodTexture('mushroom_stew.png', 150, 100, 60, 'round');
generateFoodTexture('rabbit_stew.png', 160, 110, 70, 'round');
generateFoodTexture('cookie.png', 160, 110, 50, 'round');
generateFoodTexture('pumpkin_pie.png', 210, 140, 40, 'round');
generateFoodTexture('cake.png', 240, 230, 210, 'round');
generateFoodTexture('beetroot.png', 130, 20, 30, 'round');

// Misc items
generateSolid('stick.png', 130, 95, 55, 10); // Simplistic
{
  const stick = createPNG(16, 16);
  fill(stick, 0, 0, 0, 0);
  for (let i = 2; i < 14; i++) {
    setPixel(stick, 6 + Math.floor(i*0.2), i, 130, 95, 55);
    setPixel(stick, 7 + Math.floor(i*0.2), i, 145, 110, 65);
  }
  savePNG(stick, path.join(ASSETS, 'item', 'stick.png'));
}

generateSolid('bone.png', 230, 225, 210, 8);
{
  const bone = createPNG(16, 16);
  fill(bone, 0, 0, 0, 0);
  for (let i = 3; i < 13; i++) setPixel(bone, 7, i, 230, 225, 210);
  for (let i = 3; i < 13; i++) setPixel(bone, 8, i, 220, 215, 200);
  // Ends
  for (let x = 5; x < 10; x++) { setPixel(bone, x, 2, 235, 230, 215); setPixel(bone, x, 13, 235, 230, 215); }
  savePNG(bone, path.join(ASSETS, 'item', 'bone.png'));
}

generateSolid('string.png', 230, 230, 230, 5);
generateSolid('leather.png', 150, 85, 40, 15);
generateSolid('feather.png', 220, 220, 220, 10);
generateSolid('gunpowder.png', 80, 80, 80, 15);
generateSolid('ender_pearl.png', 30, 80, 80, 15);
generateSolid('blaze_powder.png', 255, 200, 50, 20);
generateSolid('blaze_rod.png', 230, 180, 40, 15);
generateSolid('ghast_tear.png', 220, 220, 240, 10);
generateSolid('spider_eye.png', 130, 20, 30, 15);
generateSolid('slime_ball.png', 100, 200, 80, 15);
generateSolid('magma_cream.png', 230, 150, 40, 20);
generateSolid('nether_star.png', 255, 255, 200, 10);
generateSolid('book.png', 140, 90, 40, 15);
generateSolid('paper.png', 240, 235, 220, 6);
generateSolid('bucket.png', 180, 180, 180, 10);
generateSolid('water_bucket.png', 80, 140, 220, 15);
generateSolid('lava_bucket.png', 220, 100, 20, 15);
generateSolid('milk_bucket.png', 240, 240, 240, 8);

// Armor textures (item icons)
function generateArmorIcon(name, r, g, b, type) {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);
  if (type === 'helmet') {
    for (let y = 3; y < 10; y++)
      for (let x = 3; x < 13; x++)
        if (!(y > 6 && x > 4 && x < 12)) setPixel(png, x, y, vary(r, 15, x, y, 110), vary(g, 15, x, y, 111), vary(b, 15, x, y, 112));
  } else if (type === 'chestplate') {
    for (let y = 2; y < 14; y++)
      for (let x = 2; x < 14; x++) {
        if (y < 5 && (x < 5 || x > 10)) continue;
        if (y > 4 && x > 5 && x < 10) continue;
        setPixel(png, x, y, vary(r, 15, x, y, 113), vary(g, 15, x, y, 114), vary(b, 15, x, y, 115));
      }
  } else if (type === 'leggings') {
    for (let y = 2; y < 14; y++)
      for (let x = 3; x < 13; x++) {
        if (y > 5 && x > 6 && x < 9) continue;
        setPixel(png, x, y, vary(r, 15, x, y, 116), vary(g, 15, x, y, 117), vary(b, 15, x, y, 118));
      }
  } else if (type === 'boots') {
    for (let y = 6; y < 14; y++)
      for (let x = 3; x < 13; x++) {
        if (x > 6 && x < 9) continue;
        setPixel(png, x, y, vary(r, 15, x, y, 119), vary(g, 15, x, y, 120), vary(b, 15, x, y, 121));
      }
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}

const armorTiers = [
  { name: 'leather', r: 150, g: 85, b: 40 },
  { name: 'chainmail', r: 160, g: 160, b: 160 },
  { name: 'iron', r: 210, g: 210, b: 210 },
  { name: 'golden', r: 255, g: 215, b: 0 },
  { name: 'diamond', r: 80, g: 220, b: 230 },
  { name: 'netherite', r: 70, g: 65, b: 65 },
];
armorTiers.forEach(a => {
  generateArmorIcon(`${a.name}_helmet.png`, a.r, a.g, a.b, 'helmet');
  generateArmorIcon(`${a.name}_chestplate.png`, a.r, a.g, a.b, 'chestplate');
  generateArmorIcon(`${a.name}_leggings.png`, a.r, a.g, a.b, 'leggings');
  generateArmorIcon(`${a.name}_boots.png`, a.r, a.g, a.b, 'boots');
});

// Shield
{
  const shield = createPNG(16, 16);
  fill(shield, 0, 0, 0, 0);
  for (let y = 1; y < 14; y++)
    for (let x = 3; x < 13; x++) {
      if (y > 10 && (x < 5 || x > 10)) continue;
      if (y > 12 && (x < 6 || x > 9)) continue;
      setPixel(shield, x, y, vary(140, 10, x, y, 130), vary(100, 10, x, y, 131), vary(50, 10, x, y, 132));
    }
  // Iron trim
  for (let x = 3; x < 13; x++) setPixel(shield, x, 1, 180, 180, 180);
  for (let y = 1; y < 14; y++) { setPixel(shield, 3, y, 180, 180, 180); if (y < 11) setPixel(shield, 12, y, 180, 180, 180); }
  savePNG(shield, path.join(ASSETS, 'item', 'shield.png'));
}

// Block break animation stages (10 stages)
console.log('\nBlock break stages:');
for (let stage = 0; stage < 10; stage++) {
  const breakPng = createPNG(16, 16);
  const intensity = (stage + 1) / 10;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y, stage * 10 + 200);
      if (n < intensity * 0.8) {
        // Crack
        const alpha = Math.floor(80 + intensity * 150);
        setPixel(breakPng, x, y, 0, 0, 0, Math.min(255, alpha));
      } else {
        setPixel(breakPng, x, y, 0, 0, 0, 0);
      }
    }
  }
  savePNG(breakPng, path.join(ASSETS, 'block', `destroy_stage_${stage}.png`));
}

// Heart textures for HUD
console.log('\nHUD textures:');
function generateHeart(name, r, g, b, empty = false) {
  const png = createPNG(9, 9);
  fill(png, 0, 0, 0, 0);
  // Heart shape
  const heartShape = [
    [0,0,1,1,0,1,1,0,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,0,0,0],
    [0,0,0,0,1,0,0,0,0],
  ];
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++)
      if (heartShape[y][x]) {
        if (empty) setPixel(png, x, y, 40, 40, 40, 180);
        else setPixel(png, x, y, r, g, b);
      }
  savePNG(png, path.join(ASSETS, 'item', name));
}
generateHeart('heart_full.png', 220, 30, 30);
generateHeart('heart_half.png', 220, 30, 30); // Will show half in CSS
generateHeart('heart_empty.png', 0, 0, 0, true);

// Hunger icons
function generateDrumstick(name, r, g, b, empty = false) {
  const png = createPNG(9, 9);
  fill(png, 0, 0, 0, 0);
  if (!empty) {
    // Meat part
    for (let y = 1; y < 5; y++)
      for (let x = 3; x < 8; x++)
        if ((x-5.5)**2 + (y-3)**2 < 6)
          setPixel(png, x, y, r, g, b);
    // Bone
    setPixel(png, 2, 5, 230, 225, 210);
    setPixel(png, 1, 6, 230, 225, 210);
    setPixel(png, 0, 7, 230, 225, 210);
    setPixel(png, 1, 7, 230, 225, 210);
    setPixel(png, 0, 8, 230, 225, 210);
  } else {
    for (let y = 1; y < 5; y++)
      for (let x = 3; x < 8; x++)
        if ((x-5.5)**2 + (y-3)**2 < 6)
          setPixel(png, x, y, 40, 40, 40, 180);
    setPixel(png, 2, 5, 40, 40, 40, 180);
    setPixel(png, 1, 6, 40, 40, 40, 180);
    setPixel(png, 0, 7, 40, 40, 40, 180);
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}
generateDrumstick('hunger_full.png', 170, 100, 40);
generateDrumstick('hunger_half.png', 170, 100, 40);
generateDrumstick('hunger_empty.png', 0, 0, 0, true);

// XP bottle
generateSolid('experience_bottle.png', 120, 200, 50, 15);

// Particles
console.log('\nParticle textures:');
{
  const crit = createPNG(8, 8);
  fill(crit, 0, 0, 0, 0);
  // Star shape
  const star = [[3,0],[4,0],[2,1],[3,1],[4,1],[5,1],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[2,5],[3,5],[4,5],[5,5],[3,6],[4,6],[3,7],[4,7]];
  star.forEach(([x,y]) => setPixel(crit, x, y, 255, 255, 200));
  savePNG(crit, path.join(ASSETS, 'item', 'critical_hit.png'));
}

// Torch texture (16x16 - side view like Minecraft)
console.log('\nTorch texture:');
{
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0); // Transparent background

  // Torch stick (brown wood) - centered 2px wide, from y=6 to y=15 (bottom)
  for (let y = 6; y < 16; y++) {
    for (let x = 7; x <= 8; x++) {
      const r = vary(120, 15, x, y, 90);
      const g = vary(85, 12, x, y, 91);
      const b = vary(50, 10, x, y, 92);
      setPixel(png, x, y, r, g, b);
    }
  }

  // Torch top (flame/lit part) - from y=3 to y=6
  // Yellow-orange core
  for (let y = 3; y < 6; y++) {
    for (let x = 7; x <= 8; x++) {
      if (y === 3) {
        setPixel(png, x, y, 255, 255, 180); // Bright yellow top
      } else if (y === 4) {
        setPixel(png, x, y, 255, 200, 80); // Orange-yellow
      } else {
        setPixel(png, x, y, 200, 150, 50); // Darker base of flame
      }
    }
  }

  // Top face texture (2x2 pixels at y=2, centered)
  setPixel(png, 7, 2, 180, 140, 40);
  setPixel(png, 8, 2, 180, 140, 40);

  savePNG(png, path.join(ASSETS, 'block', 'torch.png'));
}

// Crosshair already exists as CSS

// === DOOR TEXTURES ===
console.log('\nDoor textures:');

function generateDoorBottom(name, baseR, baseG, baseB, isIron = false) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let r = vary(baseR, 12, x, y, 200);
      let g = vary(baseG, 12, x, y, 201);
      let b = vary(baseB, 12, x, y, 202);
      // Plank lines (horizontal)
      if (!isIron && y % 4 === 0) { r = Math.max(0, r - 25); g = Math.max(0, g - 25); b = Math.max(0, b - 25); }
      // Vertical center line
      if (x === 7 || x === 8) { r = Math.max(0, r - 15); g = Math.max(0, g - 15); b = Math.max(0, b - 15); }
      // Frame edges
      if (x === 0 || x === 15) { r = Math.max(0, r - 30); g = Math.max(0, g - 30); b = Math.max(0, b - 30); }
      if (y === 15) { r = Math.max(0, r - 30); g = Math.max(0, g - 30); b = Math.max(0, b - 30); }
      setPixel(png, x, y, r, g, b);
    }
  }
  // Door handle (right side)
  for (let hy = 6; hy <= 8; hy++) {
    setPixel(png, 12, hy, isIron ? 180 : 100, isIron ? 180 : 80, isIron ? 180 : 40);
    setPixel(png, 13, hy, isIron ? 200 : 120, isIron ? 200 : 95, isIron ? 200 : 55);
  }
  if (isIron) {
    // Metal rivets
    setPixel(png, 3, 3, 160, 160, 170);
    setPixel(png, 12, 3, 160, 160, 170);
    setPixel(png, 3, 12, 160, 160, 170);
    setPixel(png, 12, 12, 160, 160, 170);
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

function generateDoorTop(name, baseR, baseG, baseB, isIron = false) {
  const png = createPNG(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let r = vary(baseR, 12, x, y, 203);
      let g = vary(baseG, 12, x, y, 204);
      let b = vary(baseB, 12, x, y, 205);
      // Frame edges
      if (x === 0 || x === 15) { r = Math.max(0, r - 30); g = Math.max(0, g - 30); b = Math.max(0, b - 30); }
      if (y === 0) { r = Math.max(0, r - 30); g = Math.max(0, g - 30); b = Math.max(0, b - 30); }
      // Plank lines
      if (!isIron && y % 4 === 0) { r = Math.max(0, r - 25); g = Math.max(0, g - 25); b = Math.max(0, b - 25); }
      // Vertical center line
      if (x === 7 || x === 8) { r = Math.max(0, r - 15); g = Math.max(0, g - 15); b = Math.max(0, b - 15); }
      setPixel(png, x, y, r, g, b);
    }
  }
  // Window pane (top portion)
  for (let wy = 2; wy <= 7; wy++) {
    for (let wx = 3; wx <= 6; wx++) {
      if (isIron) {
        setPixel(png, wx, wy, 180, 210, 230, 160);
      } else {
        setPixel(png, wx, wy, 160, 200, 220, 140);
      }
    }
    for (let wx = 9; wx <= 12; wx++) {
      if (isIron) {
        setPixel(png, wx, wy, 180, 210, 230, 160);
      } else {
        setPixel(png, wx, wy, 160, 200, 220, 140);
      }
    }
  }
  // Window frame bars
  for (let wy = 2; wy <= 7; wy++) {
    setPixel(png, 2, wy, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
    setPixel(png, 7, wy, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
    setPixel(png, 8, wy, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
    setPixel(png, 13, wy, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
  }
  for (let wx = 2; wx <= 13; wx++) {
    setPixel(png, wx, 1, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
    setPixel(png, wx, 8, Math.max(0, baseR - 40), Math.max(0, baseG - 40), Math.max(0, baseB - 40));
  }
  if (isIron) {
    setPixel(png, 3, 11, 160, 160, 170);
    setPixel(png, 12, 11, 160, 160, 170);
  }
  savePNG(png, path.join(ASSETS, 'block', name));
}

// Oak door (warm brown)
generateDoorBottom('oak_door_bottom.png', 190, 150, 95);
generateDoorTop('oak_door_top.png', 190, 150, 95);

// Spruce door (dark brown)
generateDoorBottom('spruce_door_bottom.png', 107, 80, 50);
generateDoorTop('spruce_door_top.png', 107, 80, 50);

// Iron door (metallic gray)
generateDoorBottom('iron_door_bottom.png', 200, 200, 200, true);
generateDoorTop('iron_door_top.png', 200, 200, 200, true);

// Door item icons (for inventory)
function generateDoorItemIcon(name, baseR, baseG, baseB, isIron = false) {
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0); // Transparent background
  // Door shape: tall rectangle (5 wide x 14 tall)
  for (let y = 1; y < 15; y++) {
    for (let x = 5; x < 11; x++) {
      let r = vary(baseR, 10, x, y, 210);
      let g = vary(baseG, 10, x, y, 211);
      let b = vary(baseB, 10, x, y, 212);
      // Frame
      if (x === 5 || x === 10) { r = Math.max(0, r - 35); g = Math.max(0, g - 35); b = Math.max(0, b - 35); }
      if (y === 1 || y === 14) { r = Math.max(0, r - 35); g = Math.max(0, g - 35); b = Math.max(0, b - 35); }
      // Plank lines
      if (!isIron && y % 4 === 0) { r = Math.max(0, r - 20); g = Math.max(0, g - 20); b = Math.max(0, b - 20); }
      setPixel(png, x, y, r, g, b);
    }
  }
  // Window panes (top half)
  for (let wy = 3; wy <= 5; wy++) {
    for (let wx = 6; wx <= 9; wx++) {
      setPixel(png, wx, wy, 160, 200, 220, isIron ? 160 : 140);
    }
  }
  // Handle
  setPixel(png, 9, 9, isIron ? 180 : 100, isIron ? 180 : 80, isIron ? 180 : 40);
  setPixel(png, 9, 10, isIron ? 200 : 120, isIron ? 200 : 95, isIron ? 200 : 55);
  if (isIron) {
    setPixel(png, 6, 3, 160, 160, 170);
    setPixel(png, 9, 3, 160, 160, 170);
    setPixel(png, 6, 12, 160, 160, 170);
    setPixel(png, 9, 12, 160, 160, 170);
  }
  savePNG(png, path.join(ASSETS, 'item', name));
}

generateDoorItemIcon('oak_door.png', 190, 150, 95);
generateDoorItemIcon('spruce_door.png', 107, 80, 50);
generateDoorItemIcon('iron_door.png', 200, 200, 200, true);

// === ELYTRA ===
{
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);

  // Elytra shape: two wing-like shapes spreading from center
  // Minecraft elytra icon is gray/purple with a torn wing membrane look

  // Left wing
  const leftWing = [
    [3,2],[4,2],[5,2],
    [2,3],[3,3],[4,3],[5,3],[6,3],
    [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
    [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
    [2,7],[3,7],[4,7],[5,7],[6,7],
    [2,8],[3,8],[4,8],[5,8],[6,8],
    [3,9],[4,9],[5,9],[6,9],
    [4,10],[5,10],[6,10],
    [5,11],[6,11],
    [6,12],
  ];

  // Right wing (mirrored)
  const rightWing = leftWing.map(([x, y]) => [15 - x, y]);

  // Wing base color: grayish-purple like Minecraft elytra
  const baseR = 155, baseG = 140, baseB = 160;
  // Darker edge/vein color
  const darkR = 100, darkG = 85, darkB = 110;
  // Lighter highlight
  const lightR = 180, lightG = 170, lightB = 190;

  for (const [x, y] of leftWing) {
    // Edge detection: darker on outer edges
    const isEdge = !leftWing.some(([ex, ey]) => ex === x - 1 && ey === y) ||
                   !leftWing.some(([ex, ey]) => ex === x && ey === y - 1);
    // Vein lines for membrane look
    const isVein = (x + y) % 3 === 0;

    let r, g, b;
    if (isEdge) {
      r = vary(darkR, 12, x, y, 500);
      g = vary(darkG, 12, x, y, 501);
      b = vary(darkB, 12, x, y, 502);
    } else if (isVein) {
      r = vary(darkR + 15, 10, x, y, 503);
      g = vary(darkG + 15, 10, x, y, 504);
      b = vary(darkB + 15, 10, x, y, 505);
    } else {
      r = vary(baseR, 15, x, y, 506);
      g = vary(baseG, 15, x, y, 507);
      b = vary(baseB, 15, x, y, 508);
    }
    // Top highlight gradient
    if (y <= 4) {
      r = Math.min(255, r + 15);
      g = Math.min(255, g + 15);
      b = Math.min(255, b + 15);
    }
    setPixel(png, x, y, r, g, b);
  }

  for (const [x, y] of rightWing) {
    const isEdge = !rightWing.some(([ex, ey]) => ex === x + 1 && ey === y) ||
                   !rightWing.some(([ex, ey]) => ex === x && ey === y - 1);
    const isVein = (x + y) % 3 === 0;

    let r, g, b;
    if (isEdge) {
      r = vary(darkR, 12, x, y, 510);
      g = vary(darkG, 12, x, y, 511);
      b = vary(darkB, 12, x, y, 512);
    } else if (isVein) {
      r = vary(darkR + 15, 10, x, y, 513);
      g = vary(darkG + 15, 10, x, y, 514);
      b = vary(darkB + 15, 10, x, y, 515);
    } else {
      r = vary(baseR, 15, x, y, 516);
      g = vary(baseG, 15, x, y, 517);
      b = vary(baseB, 15, x, y, 518);
    }
    if (y <= 4) {
      r = Math.min(255, r + 15);
      g = Math.min(255, g + 15);
      b = Math.min(255, b + 15);
    }
    setPixel(png, x, y, r, g, b);
  }

  // Center spine (connecting the two wings at top)
  for (let y = 2; y <= 6; y++) {
    setPixel(png, 7, y, vary(darkR - 10, 8, 7, y, 520), vary(darkG - 10, 8, 7, y, 521), vary(darkB - 10, 8, 7, y, 522));
    setPixel(png, 8, y, vary(darkR - 10, 8, 8, y, 523), vary(darkG - 10, 8, 8, y, 524), vary(darkB - 10, 8, 8, y, 525));
  }

  savePNG(png, path.join(ASSETS, 'item', 'elytra.png'));
}

// === FIREWORK ROCKET ===
{
  const png = createPNG(16, 16);
  fill(png, 0, 0, 0, 0);

  // Rocket stick (wooden stick body, tall & thin)
  // Stick runs from y=3 to y=14 in center
  for (let y = 5; y <= 14; y++) {
    // Main stick body (2px wide)
    setPixel(png, 7, y, vary(180, 10, 7, y, 600), vary(150, 10, 7, y, 601), vary(90, 10, 7, y, 602));
    setPixel(png, 8, y, vary(160, 10, 8, y, 603), vary(130, 10, 8, y, 604), vary(75, 10, 8, y, 605));
  }

  // Paper wrapping around the stick (lighter, wider section in middle)
  for (let y = 6; y <= 12; y++) {
    // Paper wrap (beige/off-white)
    setPixel(png, 6, y, vary(225, 8, 6, y, 610), vary(218, 8, 6, y, 611), vary(200, 8, 6, y, 612));
    setPixel(png, 7, y, vary(235, 8, 7, y, 613), vary(228, 8, 7, y, 614), vary(210, 8, 7, y, 615));
    setPixel(png, 8, y, vary(220, 8, 8, y, 616), vary(213, 8, 8, y, 617), vary(195, 8, 8, y, 618));
    setPixel(png, 9, y, vary(210, 8, 9, y, 619), vary(203, 8, 9, y, 620), vary(185, 8, 9, y, 621));
  }

  // Colored band on the paper (red stripe like Minecraft)
  for (let y = 8; y <= 10; y++) {
    setPixel(png, 6, y, vary(180, 10, 6, y, 630), vary(40, 10, 6, y, 631), vary(40, 10, 6, y, 632));
    setPixel(png, 7, y, vary(200, 10, 7, y, 633), vary(50, 10, 7, y, 634), vary(50, 10, 7, y, 635));
    setPixel(png, 8, y, vary(190, 10, 8, y, 636), vary(45, 10, 8, y, 637), vary(45, 10, 8, y, 638));
    setPixel(png, 9, y, vary(170, 10, 9, y, 639), vary(35, 10, 9, y, 640), vary(35, 10, 9, y, 641));
  }

  // Rocket head / tip (cone shape at top)
  setPixel(png, 7, 3, vary(200, 10, 7, 3, 650), vary(200, 10, 7, 3, 651), vary(200, 10, 7, 3, 652));
  setPixel(png, 8, 3, vary(190, 10, 8, 3, 653), vary(190, 10, 8, 3, 654), vary(190, 10, 8, 3, 655));
  setPixel(png, 6, 4, vary(190, 8, 6, 4, 656), vary(190, 8, 6, 4, 657), vary(190, 8, 6, 4, 658));
  setPixel(png, 7, 4, vary(210, 8, 7, 4, 659), vary(210, 8, 7, 4, 660), vary(210, 8, 7, 4, 661));
  setPixel(png, 8, 4, vary(200, 8, 8, 4, 662), vary(200, 8, 8, 4, 663), vary(200, 8, 8, 4, 664));
  setPixel(png, 9, 4, vary(180, 8, 9, 4, 665), vary(180, 8, 9, 4, 666), vary(180, 8, 9, 4, 667));
  // Nose tip
  setPixel(png, 7, 2, vary(220, 5, 7, 2, 668), vary(220, 5, 7, 2, 669), vary(220, 5, 7, 2, 670));
  setPixel(png, 8, 2, vary(210, 5, 8, 2, 671), vary(210, 5, 8, 2, 672), vary(210, 5, 8, 2, 673));

  // Fins at bottom (small triangular fins)
  // Left fin
  setPixel(png, 5, 13, vary(200, 8, 5, 13, 680), vary(50, 8, 5, 13, 681), vary(50, 8, 5, 13, 682));
  setPixel(png, 5, 14, vary(180, 8, 5, 14, 683), vary(40, 8, 5, 14, 684), vary(40, 8, 5, 14, 685));
  setPixel(png, 6, 14, vary(190, 8, 6, 14, 686), vary(45, 8, 6, 14, 687), vary(45, 8, 6, 14, 688));
  // Right fin
  setPixel(png, 10, 13, vary(200, 8, 10, 13, 690), vary(50, 8, 10, 13, 691), vary(50, 8, 10, 13, 692));
  setPixel(png, 10, 14, vary(180, 8, 10, 14, 693), vary(40, 8, 10, 14, 694), vary(40, 8, 10, 14, 695));
  setPixel(png, 9, 14, vary(190, 8, 9, 14, 696), vary(45, 8, 9, 14, 697), vary(45, 8, 9, 14, 698));

  savePNG(png, path.join(ASSETS, 'item', 'firework_rocket.png'));
}

console.log('\n=== Texture generation complete! ===');
