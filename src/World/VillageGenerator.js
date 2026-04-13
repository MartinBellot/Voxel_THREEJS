import { BlockType } from './Block.js';
import { SeededRandom } from '../Utils/SeededRandom.js';

// Village types
const VillageType = {
  HAMLET: 'hamlet',
  VILLAGE: 'village',
  FORTIFIED: 'fortified',
  CASTLE: 'castle',
};

// Building types
const BuildingType = {
  SMALL_HOUSE: 'small_house',
  MEDIUM_HOUSE: 'medium_house',
  LARGE_HOUSE: 'large_house',
  TALL_HOUSE: 'tall_house',
  STONE_HOUSE: 'stone_house',
  LIBRARY: 'library',
  CHURCH: 'church',
  BLACKSMITH: 'blacksmith',
  MARKET_STALL: 'market_stall',
  FARM: 'farm',
  WELL: 'well',
  WATCHTOWER: 'watchtower',
  WALL: 'wall',
  GATE: 'gate',
  CORNER_TOWER: 'corner_tower',
  CASTLE_KEEP: 'castle_keep',
  CASTLE_TOWER: 'castle_tower',
  STABLE: 'stable',
  TAVERN: 'tavern',
  WINDMILL: 'windmill',
  BARRACKS: 'barracks',
};

export class VillageGenerator {
  constructor(world) {
    this.world = world;
    this.gridSize = 600;
    this._villageCache = new Map();
  }

  getVillageData(x, z) {
    const gridX = Math.floor(x / this.gridSize);
    const gridZ = Math.floor(z / this.gridSize);

    let closestVillage = null;
    let closestDist = Infinity;

    for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
      for (let gz = gridZ - 1; gz <= gridZ + 1; gz++) {
        const cacheKey = `${gx},${gz}`;
        let village = this._villageCache.get(cacheKey);

        if (village === undefined) {
          village = this._generateVillageForCell(gx, gz);
          this._villageCache.set(cacheKey, village);
          if (this._villageCache.size > 500) {
            const firstKey = this._villageCache.keys().next().value;
            this._villageCache.delete(firstKey);
          }
        }

        if (village) {
          const dist = Math.sqrt((x - village.cx) ** 2 + (z - village.cz) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            closestVillage = village;
          }
        }
      }
    }

    return closestVillage ? { village: closestVillage, dist: closestDist } : null;
  }

  _generateVillageForCell(gx, gz) {
    const cellSeed = (this.world.seed * 30000 + gx * 5623.789 + gz * 8417.321) % 1;
    const rng = new SeededRandom(cellSeed);

    // 12% chance of village in this cell
    if (rng.random() > 0.12) return null;

    const cx = gx * this.gridSize + rng.random() * this.gridSize;
    const cz = gz * this.gridSize + rng.random() * this.gridSize;

    // Only generate on suitable biomes
    const biome = this.world.getBiome(cx, cz);
    if (!['Plains', 'Birch Forest', 'Savanna', 'Pine Forest'].includes(biome)) return null;

    // Determine village type
    const typeRoll = rng.random();
    let type;
    if (typeRoll < 0.30) type = VillageType.HAMLET;
    else if (typeRoll < 0.60) type = VillageType.VILLAGE;
    else if (typeRoll < 0.82) type = VillageType.FORTIFIED;
    else type = VillageType.CASTLE;

    // Theme based on biome
    let theme;
    if (biome === 'Savanna') theme = 'acacia';
    else if (biome === 'Pine Forest') theme = 'spruce';
    else if (biome === 'Birch Forest') theme = 'birch';
    else theme = 'oak';

    const village = { cx, cz, type, theme, biome, seed: cellSeed };

    // Pre-generate building layout
    village.buildings = this._generateLayout(village, rng);
    village.radius = this._getVillageRadius(village);

    return village;
  }

  _getVillageRadius(village) {
    switch (village.type) {
      case VillageType.HAMLET: return 30;
      case VillageType.VILLAGE: return 50;
      case VillageType.FORTIFIED: return 60;
      case VillageType.CASTLE: return 75;
      default: return 40;
    }
  }

  _getThemeBlocks(theme) {
    switch (theme) {
      case 'spruce':
        return {
          log: BlockType.SPRUCE_LOG,
          planks: BlockType.SPRUCE_PLANKS,
          slab: BlockType.SPRUCE_SLAB,
          stairs: BlockType.SPRUCE_STAIRS,
          fence: BlockType.SPRUCE_FENCE,
          door_bottom: BlockType.SPRUCE_DOOR_BOTTOM,
          door_top: BlockType.SPRUCE_DOOR_TOP,
          trapdoor: BlockType.SPRUCE_TRAPDOOR,
        };
      case 'birch':
        return {
          log: BlockType.BIRCH_LOG,
          planks: BlockType.BIRCH_PLANKS,
          slab: BlockType.BIRCH_SLAB,
          stairs: BlockType.BIRCH_STAIRS,
          fence: BlockType.BIRCH_FENCE,
          door_bottom: BlockType.OAK_DOOR_BOTTOM,
          door_top: BlockType.OAK_DOOR_TOP,
          trapdoor: BlockType.OAK_TRAPDOOR,
        };
      case 'acacia':
        return {
          log: BlockType.ACACIA_LOG,
          planks: BlockType.ACACIA_PLANKS,
          slab: BlockType.ACACIA_SLAB,
          stairs: BlockType.ACACIA_STAIRS,
          fence: BlockType.ACACIA_FENCE,
          door_bottom: BlockType.OAK_DOOR_BOTTOM,
          door_top: BlockType.OAK_DOOR_TOP,
          trapdoor: BlockType.OAK_TRAPDOOR,
        };
      default: // oak
        return {
          log: BlockType.OAK_LOG,
          planks: BlockType.OAK_PLANKS,
          slab: BlockType.OAK_SLAB,
          stairs: BlockType.OAK_STAIRS,
          fence: BlockType.OAK_FENCE,
          door_bottom: BlockType.OAK_DOOR_BOTTOM,
          door_top: BlockType.OAK_DOOR_TOP,
          trapdoor: BlockType.OAK_TRAPDOOR,
        };
    }
  }

  _generateLayout(village, rng) {
    const buildings = [];
    const cx = village.cx;
    const cz = village.cz;

    // Always place a well at center
    buildings.push({ type: BuildingType.WELL, x: cx, z: cz, rotation: 0 });

    switch (village.type) {
      case VillageType.HAMLET:
        this._layoutHamlet(buildings, cx, cz, rng);
        break;
      case VillageType.VILLAGE:
        this._layoutVillage(buildings, cx, cz, rng);
        break;
      case VillageType.FORTIFIED:
        this._layoutFortified(buildings, cx, cz, rng, village);
        break;
      case VillageType.CASTLE:
        this._layoutCastle(buildings, cx, cz, rng, village);
        break;
    }

    return buildings;
  }

  _placeBuilding(buildings, type, cx, cz, angle, dist, rng) {
    const x = cx + Math.cos(angle) * dist;
    const z = cz + Math.sin(angle) * dist;
    buildings.push({ type, x, z, rotation: Math.floor(rng.random() * 4) });
  }

  _layoutHamlet(buildings, cx, cz, rng) {
    const count = 3 + Math.floor(rng.random() * 3); // 3-5 houses
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng.random() * 0.5;
      const dist = 10 + rng.random() * 12;
      const types = [BuildingType.SMALL_HOUSE, BuildingType.MEDIUM_HOUSE, BuildingType.SMALL_HOUSE];
      this._placeBuilding(buildings, types[i % types.length], cx, cz, angle, dist, rng);
    }
    // One farm
    this._placeBuilding(buildings, BuildingType.FARM, cx, cz, rng.random() * Math.PI * 2, 18 + rng.random() * 6, rng);
  }

  _layoutVillage(buildings, cx, cz, rng) {
    // Road-like layout: buildings along main axis
    const buildingTypes = [
      BuildingType.SMALL_HOUSE, BuildingType.MEDIUM_HOUSE, BuildingType.LARGE_HOUSE,
      BuildingType.SMALL_HOUSE, BuildingType.STONE_HOUSE, BuildingType.TALL_HOUSE,
      BuildingType.BLACKSMITH, BuildingType.LIBRARY, BuildingType.TAVERN,
      BuildingType.SMALL_HOUSE, BuildingType.MEDIUM_HOUSE,
    ];

    const count = 8 + Math.floor(rng.random() * 5);
    for (let i = 0; i < count && i < buildingTypes.length; i++) {
      const angle = (i / count) * Math.PI * 2 + rng.random() * 0.4;
      const dist = 12 + rng.random() * 18;
      this._placeBuilding(buildings, buildingTypes[i], cx, cz, angle, dist, rng);
    }

    // Church slightly farther
    this._placeBuilding(buildings, BuildingType.CHURCH, cx, cz, rng.random() * Math.PI * 2, 20 + rng.random() * 10, rng);

    // Farms on the outskirts
    for (let i = 0; i < 2; i++) {
      this._placeBuilding(buildings, BuildingType.FARM, cx, cz, rng.random() * Math.PI * 2, 30 + rng.random() * 10, rng);
    }

    // Market stalls near center
    for (let i = 0; i < 3; i++) {
      this._placeBuilding(buildings, BuildingType.MARKET_STALL, cx, cz, rng.random() * Math.PI * 2, 6 + rng.random() * 6, rng);
    }
  }

  _layoutFortified(buildings, cx, cz, rng, village) {
    // Inner village
    this._layoutVillage(buildings, cx, cz, rng);

    // Add walls in a square pattern
    const wallRadius = 45;
    const wallSegmentSize = 6;

    // 4 corners - towers
    buildings.push({ type: BuildingType.CORNER_TOWER, x: cx - wallRadius, z: cz - wallRadius, rotation: 0 });
    buildings.push({ type: BuildingType.CORNER_TOWER, x: cx + wallRadius, z: cz - wallRadius, rotation: 1 });
    buildings.push({ type: BuildingType.CORNER_TOWER, x: cx + wallRadius, z: cz + wallRadius, rotation: 2 });
    buildings.push({ type: BuildingType.CORNER_TOWER, x: cx - wallRadius, z: cz + wallRadius, rotation: 3 });

    // Wall segments along each side
    for (let side = 0; side < 4; side++) {
      const count = Math.floor((wallRadius * 2) / wallSegmentSize) - 1;
      for (let i = 1; i < count; i++) {
        const t = i / count;
        let wx, wz;
        if (side === 0) { wx = cx - wallRadius + t * wallRadius * 2; wz = cz - wallRadius; }
        else if (side === 1) { wx = cx + wallRadius; wz = cz - wallRadius + t * wallRadius * 2; }
        else if (side === 2) { wx = cx + wallRadius - t * wallRadius * 2; wz = cz + wallRadius; }
        else { wx = cx - wallRadius; wz = cz + wallRadius - t * wallRadius * 2; }

        // Gate in the middle of south wall
        if (side === 0 && Math.abs(t - 0.5) < 0.08) {
          buildings.push({ type: BuildingType.GATE, x: wx, z: wz, rotation: side });
        } else {
          buildings.push({ type: BuildingType.WALL, x: wx, z: wz, rotation: side });
        }
      }
    }

    // Watchtowers at midpoints
    buildings.push({ type: BuildingType.WATCHTOWER, x: cx, z: cz - wallRadius, rotation: 0 });
    buildings.push({ type: BuildingType.WATCHTOWER, x: cx, z: cz + wallRadius, rotation: 2 });
  }

  _layoutCastle(buildings, cx, cz, rng, village) {
    // Castle keep at center (replaces well)
    buildings[0] = { type: BuildingType.CASTLE_KEEP, x: cx, z: cz, rotation: 0 };

    // Inner courtyard buildings
    const innerBuildings = [
      BuildingType.BARRACKS, BuildingType.STABLE, BuildingType.BLACKSMITH,
      BuildingType.TAVERN, BuildingType.LIBRARY,
    ];
    for (let i = 0; i < innerBuildings.length; i++) {
      const angle = (i / innerBuildings.length) * Math.PI * 2 + 0.3;
      const dist = 18 + rng.random() * 8;
      this._placeBuilding(buildings, innerBuildings[i], cx, cz, angle, dist, rng);
    }

    // Castle towers at inner corners
    const innerRadius = 30;
    buildings.push({ type: BuildingType.CASTLE_TOWER, x: cx - innerRadius, z: cz - innerRadius, rotation: 0 });
    buildings.push({ type: BuildingType.CASTLE_TOWER, x: cx + innerRadius, z: cz - innerRadius, rotation: 1 });
    buildings.push({ type: BuildingType.CASTLE_TOWER, x: cx + innerRadius, z: cz + innerRadius, rotation: 2 });
    buildings.push({ type: BuildingType.CASTLE_TOWER, x: cx - innerRadius, z: cz + innerRadius, rotation: 3 });

    // Inner walls
    const wallSegmentSize = 5;
    for (let side = 0; side < 4; side++) {
      const count = Math.floor((innerRadius * 2) / wallSegmentSize);
      for (let i = 1; i < count; i++) {
        const t = i / count;
        let wx, wz;
        if (side === 0) { wx = cx - innerRadius + t * innerRadius * 2; wz = cz - innerRadius; }
        else if (side === 1) { wx = cx + innerRadius; wz = cz - innerRadius + t * innerRadius * 2; }
        else if (side === 2) { wx = cx + innerRadius - t * innerRadius * 2; wz = cz + innerRadius; }
        else { wx = cx - innerRadius; wz = cz + innerRadius - t * innerRadius * 2; }

        if (side === 0 && Math.abs(t - 0.5) < 0.1) {
          buildings.push({ type: BuildingType.GATE, x: wx, z: wz, rotation: side });
        } else {
          buildings.push({ type: BuildingType.WALL, x: wx, z: wz, rotation: side });
        }
      }
    }

    // Outer village (hamlet around the castle)
    const outerBuildings = [
      BuildingType.SMALL_HOUSE, BuildingType.SMALL_HOUSE, BuildingType.MEDIUM_HOUSE,
      BuildingType.FARM, BuildingType.FARM, BuildingType.MARKET_STALL,
      BuildingType.CHURCH, BuildingType.WINDMILL,
    ];
    for (let i = 0; i < outerBuildings.length; i++) {
      const angle = (i / outerBuildings.length) * Math.PI * 2 + rng.random() * 0.3;
      const dist = 40 + rng.random() * 20;
      this._placeBuilding(buildings, outerBuildings[i], cx, cz, angle, dist, rng);
    }
  }

  // Called by Chunk to generate village structures within its bounds
  generateForChunk(chunk) {
    const chunkWorldX = chunk.x * chunk.size;
    const chunkWorldZ = chunk.z * chunk.size;
    const chunkCenterX = chunkWorldX + chunk.size / 2;
    const chunkCenterZ = chunkWorldZ + chunk.size / 2;

    const data = this.getVillageData(chunkCenterX, chunkCenterZ);
    if (!data || !data.village) return;

    const village = data.village;
    const radius = village.radius;

    // Check if this chunk could contain any part of the village
    const margin = 20;
    if (Math.abs(chunkCenterX - village.cx) > radius + chunk.size + margin) return;
    if (Math.abs(chunkCenterZ - village.cz) > radius + chunk.size + margin) return;

    const tb = this._getThemeBlocks(village.theme);

    // Generate paths (dirt path) from center to buildings
    this._generatePaths(chunk, village, chunkWorldX, chunkWorldZ);

    // Generate each building that overlaps this chunk
    for (const building of village.buildings) {
      this._generateBuilding(chunk, building, village, tb, chunkWorldX, chunkWorldZ);
    }
  }

  _generatePaths(chunk, village, chunkWorldX, chunkWorldZ) {
    const cx = village.cx;
    const cz = village.cz;

    for (const b of village.buildings) {
      // Draw path from center to building
      const dx = b.x - cx;
      const dz = b.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 3) continue;

      const steps = Math.ceil(dist);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = Math.floor(cx + dx * t);
        const pz = Math.floor(cz + dz * t);

        for (let pw = -1; pw <= 1; pw++) {
          const pathX = px + (Math.abs(dz / dist) > 0.5 ? pw : 0);
          const pathZ = pz + (Math.abs(dx / dist) > 0.5 ? pw : 0);

          const localX = pathX - chunkWorldX;
          const localZ = pathZ - chunkWorldZ;
          if (localX < 0 || localX >= chunk.size || localZ < 0 || localZ >= chunk.size) continue;

          const surfaceY = this.world.getHeight(pathX, pathZ);
          if (surfaceY <= this.world.seaLevel) continue;

          const idx = localX + chunk.size * ((surfaceY - 1) + chunk.height * localZ);
          if (chunk.data[idx] === BlockType.GRASS || chunk.data[idx] === BlockType.DIRT) {
            chunk.data[idx] = BlockType.DIRT_PATH;
          }
        }
      }
    }
  }

  // Force-set a block in chunk data (overwrites existing)
  _setBlock(chunk, localX, y, localZ, type) {
    if (localX < 0 || localX >= chunk.size || localZ < 0 || localZ >= chunk.size || y < 1 || y >= chunk.height) return;
    const idx = localX + chunk.size * (y + chunk.height * localZ);
    chunk.data[idx] = type;
  }

  // Clear air in a volume
  _clearVolume(chunk, x1, y1, z1, x2, y2, z2, chunkWorldX, chunkWorldZ) {
    for (let x = x1; x <= x2; x++) {
      for (let z = z1; z <= z2; z++) {
        for (let y = y1; y <= y2; y++) {
          const lx = x - chunkWorldX;
          const lz = z - chunkWorldZ;
          this._setBlock(chunk, lx, y, lz, BlockType.AIR);
        }
      }
    }
  }

  _generateBuilding(chunk, building, village, tb, chunkWorldX, chunkWorldZ) {
    const bx = Math.floor(building.x);
    const bz = Math.floor(building.z);
    const surfaceY = this.world.getHeight(bx, bz);
    if (surfaceY <= this.world.seaLevel + 1) return;
    const by = surfaceY;

    switch (building.type) {
      case BuildingType.WELL:
        this._buildWell(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.SMALL_HOUSE:
        this._buildSmallHouse(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.MEDIUM_HOUSE:
        this._buildMediumHouse(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.LARGE_HOUSE:
        this._buildLargeHouse(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.TALL_HOUSE:
        this._buildTallHouse(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.STONE_HOUSE:
        this._buildStoneHouse(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.LIBRARY:
        this._buildLibrary(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ, building.rotation);
        break;
      case BuildingType.CHURCH:
        this._buildChurch(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.BLACKSMITH:
        this._buildBlacksmith(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.MARKET_STALL:
        this._buildMarketStall(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.FARM:
        this._buildFarm(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.WATCHTOWER:
        this._buildWatchtower(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.WALL:
        this._buildWall(chunk, bx, by, bz, building.rotation, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.GATE:
        this._buildGate(chunk, bx, by, bz, building.rotation, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.CORNER_TOWER:
        this._buildCornerTower(chunk, bx, by, bz, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.CASTLE_KEEP:
        this._buildCastleKeep(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.CASTLE_TOWER:
        this._buildCastleTower(chunk, bx, by, bz, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.STABLE:
        this._buildStable(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.TAVERN:
        this._buildTavern(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.WINDMILL:
        this._buildWindmill(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
      case BuildingType.BARRACKS:
        this._buildBarracks(chunk, bx, by, bz, tb, chunkWorldX, chunkWorldZ);
        break;
    }
  }

  // ========== BUILDING BLUEPRINTS ==========

  _buildWell(chunk, bx, by, bz, tb, cwx, cwz) {
    // 3x3 cobblestone well with fence posts and roof
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;
        // Base
        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);
        // Walls (only edges)
        if (Math.abs(dx) === 1 || Math.abs(dz) === 1) {
          this._setBlock(chunk, lx, by + 1, lz, BlockType.COBBLESTONE);
        } else {
          // Water inside
          this._setBlock(chunk, lx, by, lz, BlockType.WATER);
          this._setBlock(chunk, lx, by + 1, lz, BlockType.AIR);
        }
      }
    }
    // Fence posts (corners)
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lx = bx + dx - cwx;
      const lz = bz + dz - cwz;
      this._setBlock(chunk, lx, by + 2, lz, tb.fence);
      this._setBlock(chunk, lx, by + 3, lz, tb.fence);
    }
    // Roof
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this._setBlock(chunk, bx + dx - cwx, by + 4, bz + dz - cwz, tb.slab);
      }
    }
  }

  _buildSmallHouse(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    const w = 5, d = 5, h = 4;

    // Foundation leveling
    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        // Floor
        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            // Corner pillars: logs
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            // Walls
            if (dy === 2 && ((dx === Math.floor(w / 2) && (dz === 0 || dz === d - 1)) ||
                (dz === Math.floor(d / 2) && (dx === 0 || dx === w - 1)))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === Math.floor(w / 2) && dz === 0) {
              // Door
              this._setBlock(chunk, lx, by + dy, lz, tb.door_bottom);
              this._setBlock(chunk, lx, by + dy + 1, lz, tb.door_top);
            } else if (dy !== 2 || !(dx === Math.floor(w / 2) && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        // Roof - peaked
        this._setBlock(chunk, lx, by + h, lz, tb.slab);
      }
    }
    // Peaked roof ridge
    for (let dz = 0; dz < d; dz++) {
      const lz = bz + dz - cwz;
      this._setBlock(chunk, bx + Math.floor(w / 2) - cwx, by + h + 1, lz, tb.slab);
    }

    // Interior: crafting table
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 1 - cwz, BlockType.CRAFTING_TABLE);
    // Torch
    this._setBlock(chunk, bx + 3 - cwx, by + 2, bz + 3 - cwz, BlockType.TORCH);
  }

  _buildMediumHouse(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    const w = 7, d = 6, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 && !isEdgeX && !isEdgeZ) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 2 && (dx === 2 || dx === 4) && (dz === 0 || dz === d - 1)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 3 && (dx === 3) && (dz === 0 || dz === d - 1)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 3 && dz === 0) {
              this._setBlock(chunk, lx, by + dy, lz, tb.door_bottom);
              this._setBlock(chunk, lx, by + 2, lz, tb.door_top);
            } else if (!(dy === 2 && dx === 3 && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        // Roof
        this._setBlock(chunk, lx, by + h, lz, tb.stairs);
      }
    }

    // Peaked roof
    for (let dz = -1; dz <= d; dz++) {
      const lz = bz + dz - cwz;
      for (let dx = 1; dx < w - 1; dx++) {
        this._setBlock(chunk, bx + dx - cwx, by + h, lz, tb.slab);
      }
    }
    for (let dz = 0; dz < d; dz++) {
      this._setBlock(chunk, bx + Math.floor(w / 2) - cwx, by + h + 1, bz + dz - cwz, tb.planks);
    }

    // Interior
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 1 - cwz, BlockType.CRAFTING_TABLE);
    this._setBlock(chunk, bx + 5 - cwx, by + 1, bz + 4 - cwz, BlockType.CHEST);
    this._setBlock(chunk, bx + 1 - cwx, by + 3, bz + 1 - cwz, BlockType.TORCH);
    this._setBlock(chunk, bx + 5 - cwx, by + 3, bz + 4 - cwz, BlockType.TORCH);
  }

  _buildLargeHouse(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    const w = 9, d = 7, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        // Cobblestone base + floor
        this._setBlock(chunk, lx, by - 1, lz, BlockType.COBBLESTONE);
        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            // Mix of planks and stone bricks for larger houses
            if (dy <= 2) {
              if (dy === 2 && ((dx === 2 || dx === 4 || dx === 6) && (dz === 0 || dz === d - 1))) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
              } else if (dy === 2 && ((dz === 2 || dz === 4) && (dx === 0 || dx === w - 1))) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
              } else if (dy === 1 && dx === 4 && dz === 0) {
                this._setBlock(chunk, lx, by + 1, lz, tb.door_bottom);
                this._setBlock(chunk, lx, by + 2, lz, tb.door_top);
              } else if (!(dy === 2 && dx === 4 && dz === 0)) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
              }
            } else {
              if (dy === 3 && ((dx === 2 || dx === 6) && (dz === 0 || dz === d - 1))) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
              } else {
                this._setBlock(chunk, lx, by + dy, lz, tb.planks);
              }
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }
      }
    }

    // Roof
    for (let layer = 0; layer < 3; layer++) {
      for (let dz = -1; dz <= d; dz++) {
        for (let dx = layer; dx < w - layer; dx++) {
          this._setBlock(chunk, bx + dx - cwx, by + h + layer, bz + dz - cwz, 
            layer < 2 ? tb.stairs : tb.slab);
        }
      }
    }

    // Interior furniture
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 1 - cwz, BlockType.CRAFTING_TABLE);
    this._setBlock(chunk, bx + 7 - cwx, by + 1, bz + 5 - cwz, BlockType.CHEST);
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 5 - cwz, BlockType.FURNACE);
    this._setBlock(chunk, bx + 7 - cwx, by + 1, bz + 1 - cwz, BlockType.BOOKSHELF);
    // Torches
    this._setBlock(chunk, bx + 1 - cwx, by + 3, bz + 3 - cwz, BlockType.TORCH);
    this._setBlock(chunk, bx + 7 - cwx, by + 3, bz + 3 - cwz, BlockType.TORCH);
  }

  _buildTallHouse(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    // 2-story house, 6x6 base, 8 high
    const w = 6, d = 6, h1 = 4, h2 = 4;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        // First floor
        for (let dy = 1; dy <= h1; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 && ((dx === 3 && (dz === 0 || dz === d - 1)) || (dz === 3 && (dx === 0 || dx === w - 1)))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 3 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, tb.door_bottom);
              this._setBlock(chunk, lx, by + 2, lz, tb.door_top);
            } else if (!(dy === 2 && dx === 3 && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            if (dy === h1) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks); // Floor of 2nd story
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }

        // Second floor (slightly overhanging, one block wider on each side)
        for (let dy = h1 + 1; dy < h1 + h2; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === h1 + 2 && ((dx === 2 || dx === 4) && (dz === 0 || dz === d - 1))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        // Roof
        this._setBlock(chunk, lx, by + h1 + h2, lz, tb.slab);
      }
    }

    // Peaked roof
    for (let dz = 0; dz < d; dz++) {
      this._setBlock(chunk, bx + Math.floor(w / 2) - cwx, by + h1 + h2 + 1, bz + dz - cwz, tb.slab);
      this._setBlock(chunk, bx + Math.floor(w / 2) - 1 - cwx, by + h1 + h2 + 1, bz + dz - cwz, tb.slab);
    }

    // Interior
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 1 - cwz, BlockType.FURNACE);
    this._setBlock(chunk, bx + 4 - cwx, by + 1, bz + 4 - cwz, BlockType.CRAFTING_TABLE);
    this._setBlock(chunk, bx + 1 - cwx, by + 3, bz + 1 - cwz, BlockType.TORCH);
    // Second floor
    this._setBlock(chunk, bx + 1 - cwx, by + h1 + 1, bz + 1 - cwz, BlockType.CHEST);
    this._setBlock(chunk, bx + 4 - cwx, by + h1 + 2, bz + 4 - cwz, BlockType.TORCH);
  }

  _buildStoneHouse(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    const w = 6, d = 6, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.STONE_BRICKS);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 && ((dx === 3 && (dz === 0 || dz === d - 1)) || (dz === 3 && (dx === 0 || dx === w - 1)))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 3 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, BlockType.AIR); // Door opening
              this._setBlock(chunk, lx, by + 2, lz, BlockType.AIR);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        // Flat stone roof
        this._setBlock(chunk, lx, by + h, lz, BlockType.STONE_BRICKS);
      }
    }

    // Chimney
    for (let dy = h + 1; dy <= h + 3; dy++) {
      this._setBlock(chunk, bx + 1 - cwx, by + dy, bz + 1 - cwz, BlockType.BRICKS);
    }

    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 4 - cwz, BlockType.FURNACE);
    this._setBlock(chunk, bx + 4 - cwx, by + 1, bz + 4 - cwz, BlockType.CHEST);
    this._setBlock(chunk, bx + 2 - cwx, by + 3, bz + 3 - cwz, BlockType.TORCH);
  }

  _buildLibrary(chunk, bx, by, bz, tb, cwx, cwz, rot) {
    const w = 7, d = 6, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 || dy === 3) {
              if ((dx === 2 || dx === 4) && (dz === 0 || dz === d - 1)) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
              } else if ((dz === 2 || dz === 4) && (dx === 0 || dx === w - 1)) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
              } else {
                this._setBlock(chunk, lx, by + dy, lz, tb.planks);
              }
            } else if (dy === 1 && dx === 3 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, tb.door_bottom);
              this._setBlock(chunk, lx, by + 2, lz, tb.door_top);
            } else if (!(dy === 2 && dx === 3 && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        this._setBlock(chunk, lx, by + h, lz, tb.slab);
      }
    }

    // Bookshelves lining walls
    for (let dy = 1; dy <= 3; dy++) {
      this._setBlock(chunk, bx + 1 - cwx, by + dy, bz + 4 - cwz, BlockType.BOOKSHELF);
      this._setBlock(chunk, bx + 2 - cwx, by + dy, bz + 4 - cwz, BlockType.BOOKSHELF);
      this._setBlock(chunk, bx + 4 - cwx, by + dy, bz + 4 - cwz, BlockType.BOOKSHELF);
      this._setBlock(chunk, bx + 5 - cwx, by + dy, bz + 4 - cwz, BlockType.BOOKSHELF);
    }
    this._setBlock(chunk, bx + 3 - cwx, by + 1, bz + 3 - cwz, BlockType.ENCHANTING_TABLE);
    this._setBlock(chunk, bx + 2 - cwx, by + 3, bz + 2 - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx + 4 - cwx, by + 3, bz + 2 - cwz, BlockType.LANTERN);
  }

  _buildChurch(chunk, bx, by, bz, tb, cwx, cwz) {
    const w = 7, d = 11, h = 7;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    // Main nave
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.STONE_BRICKS);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else if (isEdgeX || isEdgeZ) {
            if ((dy === 3 || dy === 4) && !isEdgeX && (dz === 0 || dz === d - 1)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if ((dy === 3 || dy === 4) && !isEdgeZ && (dx === 0 || dx === w - 1)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 3 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, BlockType.AIR);
              this._setBlock(chunk, lx, by + 2, lz, BlockType.AIR);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }
      }
    }

    // Roof (tiered)
    for (let layer = 0; layer < 4; layer++) {
      for (let dz = 0; dz < d; dz++) {
        const startX = layer;
        const endX = w - 1 - layer;
        if (startX > endX) break;
        for (let dx = startX; dx <= endX; dx++) {
          this._setBlock(chunk, bx + dx - cwx, by + h + layer, bz + dz - cwz, tb.stairs);
        }
      }
    }

    // Bell tower at back
    const towerX = bx + Math.floor(w / 2);
    const towerZ = bz + d - 2;
    for (let dy = 1; dy <= 12; dy++) {
      this._setBlock(chunk, towerX - cwx, by + dy, towerZ - cwz, BlockType.STONE_BRICKS);
      this._setBlock(chunk, towerX + 1 - cwx, by + dy, towerZ - cwz, BlockType.STONE_BRICKS);
      this._setBlock(chunk, towerX - cwx, by + dy, towerZ + 1 - cwz, BlockType.STONE_BRICKS);
      this._setBlock(chunk, towerX + 1 - cwx, by + dy, towerZ + 1 - cwz, BlockType.STONE_BRICKS);

      // Hollow inside
      if (dy >= h && dy < 10) {
        this._setBlock(chunk, towerX - cwx, by + dy, towerZ - cwz, BlockType.STONE_BRICKS);
        this._setBlock(chunk, towerX + 1 - cwx, by + dy, towerZ - cwz, BlockType.STONE_BRICKS);
      }
    }

    // Bell tower openings
    for (let dy = 10; dy <= 11; dy++) {
      this._setBlock(chunk, towerX - cwx, by + dy, towerZ - cwz, BlockType.AIR);
      this._setBlock(chunk, towerX + 1 - cwx, by + dy, towerZ - cwz, BlockType.AIR);
    }

    // Tower top
    for (let dx = -1; dx <= 2; dx++) {
      for (let dz = -1; dz <= 2; dz++) {
        this._setBlock(chunk, towerX + dx - cwx, by + 13, towerZ + dz - cwz, BlockType.STONE_BRICKS);
      }
    }
    this._setBlock(chunk, towerX - cwx, by + 14, towerZ - cwz, tb.slab);
    this._setBlock(chunk, towerX + 1 - cwx, by + 14, towerZ - cwz, tb.slab);
    this._setBlock(chunk, towerX - cwx, by + 14, towerZ + 1 - cwz, tb.slab);
    this._setBlock(chunk, towerX + 1 - cwx, by + 14, towerZ + 1 - cwz, tb.slab);

    // Interior: note block as bell
    this._setBlock(chunk, towerX - cwx, by + 11, towerZ - cwz, BlockType.NOTE_BLOCK);

    // Interior lighting
    this._setBlock(chunk, bx + 1 - cwx, by + 4, bz + 3 - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx + 5 - cwx, by + 4, bz + 3 - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx + 1 - cwx, by + 4, bz + 7 - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx + 5 - cwx, by + 4, bz + 7 - cwz, BlockType.LANTERN);
  }

  _buildBlacksmith(chunk, bx, by, bz, tb, cwx, cwz) {
    const w = 7, d = 7, h = 4;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    // Main building
    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else if (isEdgeX || isEdgeZ) {
            // Open front (dz === 0, 3 blocks open)
            if (dz === 0 && dx >= 2 && dx <= 4 && dy <= 2) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        this._setBlock(chunk, lx, by + h, lz, BlockType.STONE_BRICKS);
      }
    }

    // Chimney
    for (let dy = h + 1; dy <= h + 4; dy++) {
      this._setBlock(chunk, bx + 5 - cwx, by + dy, bz + 5 - cwz, BlockType.BRICKS);
      this._setBlock(chunk, bx + 6 - cwx, by + dy, bz + 5 - cwz, BlockType.BRICKS);
      this._setBlock(chunk, bx + 5 - cwx, by + dy, bz + 6 - cwz, BlockType.BRICKS);
    }

    // Lava forge
    this._setBlock(chunk, bx + 5 - cwx, by + 1, bz + 5 - cwz, BlockType.LAVA);
    // Anvil
    this._setBlock(chunk, bx + 3 - cwx, by + 1, bz + 3 - cwz, BlockType.ANVIL);
    // Furnaces
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 5 - cwz, BlockType.FURNACE);
    this._setBlock(chunk, bx + 2 - cwx, by + 1, bz + 5 - cwz, BlockType.FURNACE);
    // Chest
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 1 - cwz, BlockType.CHEST);
    // Crafting table
    this._setBlock(chunk, bx + 5 - cwx, by + 1, bz + 1 - cwz, BlockType.CRAFTING_TABLE);
  }

  _buildMarketStall(chunk, bx, by, bz, tb, cwx, cwz) {
    // Open air market: 4x4 with fence legs and wool canopy
    for (let dx = 0; dx < 4; dx++) {
      for (let dz = 0; dz < 4; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        // Counter at edges
        if (dz === 0 || dz === 3) {
          this._setBlock(chunk, lx, by + 1, lz, tb.slab);
        }
      }
    }

    // Corner posts
    for (const [dx, dz] of [[0, 0], [3, 0], [0, 3], [3, 3]]) {
      const lx = bx + dx - cwx;
      const lz = bz + dz - cwz;
      this._setBlock(chunk, lx, by + 1, lz, tb.fence);
      this._setBlock(chunk, lx, by + 2, lz, tb.fence);
      this._setBlock(chunk, lx, by + 3, lz, tb.fence);
    }

    // Wool canopy
    const woolColors = [BlockType.WHITE_WOOL, BlockType.RED_WOOL, BlockType.YELLOW_WOOL, BlockType.BLUE_WOOL];
    const woolColor = woolColors[Math.abs(bx + bz) % woolColors.length];
    for (let dx = 0; dx < 4; dx++) {
      for (let dz = 0; dz < 4; dz++) {
        this._setBlock(chunk, bx + dx - cwx, by + 4, bz + dz - cwz, woolColor);
      }
    }
  }

  _buildFarm(chunk, bx, by, bz, tb, cwx, cwz) {
    // 9x9 farm with fence, water, farmland, crops
    for (let dx = 0; dx < 9; dx++) {
      for (let dz = 0; dz < 9; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        if (dx === 0 || dx === 8 || dz === 0 || dz === 8) {
          // Fence border
          this._setBlock(chunk, lx, by, lz, BlockType.DIRT);
          this._setBlock(chunk, lx, by + 1, lz, tb.fence);
        } else if (dx === 4 && dz === 4) {
          // Water center
          this._setBlock(chunk, lx, by, lz, BlockType.WATER);
        } else {
          // Farmland + crops
          this._setBlock(chunk, lx, by, lz, BlockType.FARMLAND);
          // Alternate crops
          const cropType = ((dx + dz) % 3 === 0) ?
            BlockType.WHEAT_STAGE_7 :
            ((dx + dz) % 3 === 1 ? BlockType.CARROT_STAGE_3 : BlockType.POTATO_STAGE_3);
          this._setBlock(chunk, lx, by + 1, lz, cropType);
        }
      }
    }

    // Gate opening
    this._setBlock(chunk, bx + 4 - cwx, by + 1, bz - cwz, BlockType.AIR);
  }

  _buildWatchtower(chunk, bx, by, bz, tb, cwx, cwz) {
    // 4x4 stone tower, 10 high
    const h = 10;
    for (let dx = 0; dx < 4; dx++) {
      for (let dz = 0; dz < 4; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        for (let dy = 0; dy <= h; dy++) {
          const isEdge = dx === 0 || dx === 3 || dz === 0 || dz === 3;
          if (isEdge) {
            if (dy === 0) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            if (dy === 0) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }
      }
    }

    // Door
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 2 - cwx, by + 1, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 1 - cwx, by + 2, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 2 - cwx, by + 2, bz - cwz, BlockType.AIR);

    // Platform on top (wider)
    for (let dx = -1; dx <= 4; dx++) {
      for (let dz = -1; dz <= 4; dz++) {
        this._setBlock(chunk, bx + dx - cwx, by + h + 1, bz + dz - cwz, BlockType.STONE_BRICKS);
      }
    }

    // Battlements
    for (let dx = -1; dx <= 4; dx++) {
      for (let dz = -1; dz <= 4; dz++) {
        if (dx === -1 || dx === 4 || dz === -1 || dz === 4) {
          if ((dx + dz) % 2 === 0) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 2, bz + dz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
    }

    // Torch on top
    this._setBlock(chunk, bx + 1 - cwx, by + h + 2, bz + 1 - cwz, BlockType.TORCH);
    this._setBlock(chunk, bx + 2 - cwx, by + h + 2, bz + 2 - cwz, BlockType.TORCH);
  }

  _buildWall(chunk, bx, by, bz, rotation, cwx, cwz) {
    const wallHeight = 5;
    const wallLength = 5;
    const isNS = rotation === 1 || rotation === 3;

    for (let i = 0; i < wallLength; i++) {
      const wx = isNS ? bx : bx + i;
      const wz = isNS ? bz + i : bz;
      const lx = wx - cwx;
      const lz = wz - cwz;

      // Wall column
      for (let dy = 0; dy <= wallHeight; dy++) {
        this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
      }
      // Battlements
      if (i % 2 === 0) {
        this._setBlock(chunk, lx, by + wallHeight + 1, lz, BlockType.STONE_BRICKS);
      }
    }

    // Walkway on top (inside)
    for (let i = 0; i < wallLength; i++) {
      const wx = isNS ? bx + 1 : bx + i;
      const wz = isNS ? bz + i : bz + 1;
      const lx = wx - cwx;
      const lz = wz - cwz;
      this._setBlock(chunk, lx, by + wallHeight, lz, BlockType.STONE_BRICKS);
    }
  }

  _buildGate(chunk, bx, by, bz, rotation, cwx, cwz) {
    const gateHeight = 6;
    const gateWidth = 5;
    const isNS = rotation === 1 || rotation === 3;

    for (let i = 0; i < gateWidth; i++) {
      const wx = isNS ? bx : bx + i;
      const wz = isNS ? bz + i : bz;
      const lx = wx - cwx;
      const lz = wz - cwz;

      for (let dy = 0; dy <= gateHeight; dy++) {
        // Gate opening in the middle 3 blocks, 3 high
        if (i >= 1 && i <= 3 && dy >= 1 && dy <= 3) {
          this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
        } else {
          this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
        }
      }

      // Battlements
      if (i % 2 === 0) {
        this._setBlock(chunk, lx, by + gateHeight + 1, lz, BlockType.STONE_BRICKS);
      }
    }

    // Torches at gate entrance
    const midIdx = Math.floor(gateWidth / 2);
    const tx = isNS ? bx : bx + midIdx;
    const tz = isNS ? bz + midIdx : bz;
    this._setBlock(chunk, tx - cwx, by + 4, tz - cwz, BlockType.TORCH);
  }

  _buildCornerTower(chunk, bx, by, bz, cwx, cwz) {
    // 5x5 circular-ish tower at wall corners
    const h = 8;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        // Skip extreme corners for round look
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;

        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;
        const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;

        for (let dy = 0; dy <= h; dy++) {
          if (isEdge) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else {
            if (dy === 0) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }
      }
    }

    // Platform
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue;
        this._setBlock(chunk, bx + dx - cwx, by + h + 1, bz + dz - cwz, BlockType.STONE_BRICKS);
      }
    }

    // Battlements
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue;
        if (Math.abs(dx) >= 2 || Math.abs(dz) >= 2) {
          if ((dx + dz + 10) % 2 === 0) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 2, bz + dz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
    }

    // Cone roof
    for (let layer = 0; layer < 4; layer++) {
      const r = 3 - layer;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) <= r + 1) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 3 + layer, bz + dz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
    }

    // Torch
    this._setBlock(chunk, bx - cwx, by + h + 2, bz - cwz, BlockType.TORCH);
  }

  _buildCastleKeep(chunk, bx, by, bz, tb, cwx, cwz) {
    // Large 13x13 keep with thick walls
    const w = 13, d = 13, h = 12;

    this._buildFoundation(chunk, bx - 6, by, bz - 6, w, d, cwx, cwz);

    for (let dx = -6; dx <= 6; dx++) {
      for (let dz = -6; dz <= 6; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        const isOuterEdge = Math.abs(dx) === 6 || Math.abs(dz) === 6;
        const isInnerEdge = Math.abs(dx) === 5 || Math.abs(dz) === 5;
        const isWall = isOuterEdge || (isInnerEdge && (Math.abs(dx) >= 5 || Math.abs(dz) >= 5));

        this._setBlock(chunk, lx, by, lz, BlockType.STONE_BRICKS);

        for (let dy = 1; dy <= h; dy++) {
          if (isOuterEdge) {
            if (Math.abs(dx) === 6 && Math.abs(dz) === 6) {
              // Corner pillars
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            } else if (dy >= 3 && dy <= 4 && (dx % 3 === 0 || dz % 3 === 0)) {
              // Windows
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy >= 8 && dy <= 9 && (dx % 3 === 0 || dz % 3 === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 0 && dz === -6) {
              // Main door
              this._setBlock(chunk, lx, by + 1, lz, BlockType.AIR);
              this._setBlock(chunk, lx, by + 2, lz, BlockType.AIR);
              this._setBlock(chunk, lx, by + 3, lz, BlockType.AIR);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else if (isInnerEdge) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else {
            if (dy === 6) {
              // Second floor
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }
      }
    }

    // Keep roof with battlements
    for (let dx = -6; dx <= 6; dx++) {
      for (let dz = -6; dz <= 6; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;
        this._setBlock(chunk, lx, by + h + 1, lz, BlockType.STONE_BRICKS);

        if (Math.abs(dx) >= 5 || Math.abs(dz) >= 5) {
          if ((dx + dz + 20) % 2 === 0) {
            this._setBlock(chunk, lx, by + h + 2, lz, BlockType.STONE_BRICKS);
          }
        }
      }
    }

    // 4 corner turrets on the keep
    for (const [cdx, cdz] of [[-6, -6], [6, -6], [6, 6], [-6, 6]]) {
      for (let dy = h + 1; dy <= h + 5; dy++) {
        for (let tdx = -1; tdx <= 1; tdx++) {
          for (let tdz = -1; tdz <= 1; tdz++) {
            if (Math.abs(tdx) === 1 && Math.abs(tdz) === 1) continue;
            this._setBlock(chunk, bx + cdx + tdx - cwx, by + dy, bz + cdz + tdz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
      // Turret cone
      this._setBlock(chunk, bx + cdx - cwx, by + h + 6, bz + cdz - cwz, BlockType.STONE_BRICKS);
      this._setBlock(chunk, bx + cdx - cwx, by + h + 7, bz + cdz - cwz, tb.slab);
    }

    // Interior: throne room (ground floor)
    this._setBlock(chunk, bx - cwx, by + 1, bz + 4 - cwz, BlockType.GOLD_BLOCK); // Throne
    this._setBlock(chunk, bx - 1 - cwx, by + 1, bz + 4 - cwz, BlockType.RED_WOOL);
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 4 - cwz, BlockType.RED_WOOL);

    // Red carpet leading to throne
    for (let dz = -5; dz <= 3; dz++) {
      this._setBlock(chunk, bx - cwx, by + 1, bz + dz - cwz, BlockType.RED_WOOL);
    }

    // Torches/lanterns
    for (let dx = -4; dx <= 4; dx += 4) {
      for (let dz = -4; dz <= 4; dz += 4) {
        this._setBlock(chunk, bx + dx - cwx, by + 4, bz + dz - cwz, BlockType.LANTERN);
        this._setBlock(chunk, bx + dx - cwx, by + 10, bz + dz - cwz, BlockType.LANTERN);
      }
    }

    // Banners (using wool)
    this._setBlock(chunk, bx - 3 - cwx, by + 3, bz + 4 - cwz, BlockType.BLUE_WOOL);
    this._setBlock(chunk, bx + 3 - cwx, by + 3, bz + 4 - cwz, BlockType.BLUE_WOOL);
    this._setBlock(chunk, bx - 3 - cwx, by + 4, bz + 4 - cwz, BlockType.YELLOW_WOOL);
    this._setBlock(chunk, bx + 3 - cwx, by + 4, bz + 4 - cwz, BlockType.YELLOW_WOOL);
  }

  _buildCastleTower(chunk, bx, by, bz, cwx, cwz) {
    // Large 7x7 round tower for castle walls
    const h = 14;
    const r = 3;

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + 1) continue;

        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;
        const isEdge = dx * dx + dz * dz > (r - 1) * (r - 1);

        for (let dy = 0; dy <= h; dy++) {
          if (isEdge) {
            if (dy >= 5 && dy <= 6 && (dx === 0 || dz === 0) && !(dx === 0 && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy >= 10 && dy <= 11 && (dx === 0 || dz === 0) && !(dx === 0 && dz === 0)) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            if (dy === 0 || dy === 7) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }
      }
    }

    // Top platform (wider)
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        if (dx * dx + dz * dz > (r + 1) * (r + 1) + 1) continue;
        this._setBlock(chunk, bx + dx - cwx, by + h + 1, bz + dz - cwz, BlockType.STONE_BRICKS);
      }
    }

    // Battlements
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        const dist = dx * dx + dz * dz;
        if (dist > (r + 1) * (r + 1) + 1) continue;
        if (dist > r * r) {
          if ((dx + dz + 20) % 2 === 0) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 2, bz + dz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
    }

    // Cone roof
    for (let layer = 0; layer < 5; layer++) {
      const cr = r + 1 - layer;
      if (cr < 0) break;
      for (let dx = -cr; dx <= cr; dx++) {
        for (let dz = -cr; dz <= cr; dz++) {
          if (dx * dx + dz * dz <= cr * cr + 1) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 3 + layer, bz + dz - cwz, BlockType.STONE_BRICKS);
          }
        }
      }
    }
    // Tip
    this._setBlock(chunk, bx - cwx, by + h + 8, bz - cwz, BlockType.STONE_BRICKS);

    // Interior torches
    this._setBlock(chunk, bx - cwx, by + 4, bz - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx - cwx, by + 11, bz - cwz, BlockType.LANTERN);
  }

  _buildStable(chunk, bx, by, bz, tb, cwx, cwz) {
    const w = 8, d = 6, h = 4;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.DIRT_PATH);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy <= 2) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR); // Open top for air
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        this._setBlock(chunk, lx, by + h, lz, tb.slab);
      }
    }

    // Dividers (fence stalls)
    for (let s = 0; s < 3; s++) {
      const sx = 2 + s * 2;
      for (let dy = 1; dy <= 2; dy++) {
        this._setBlock(chunk, bx + sx - cwx, by + dy, bz + 1 - cwz, tb.fence);
        this._setBlock(chunk, bx + sx - cwx, by + dy, bz + 2 - cwz, tb.fence);
      }
    }

    // HAY
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 4 - cwz, BlockType.HAY_BALE);
    this._setBlock(chunk, bx + 3 - cwx, by + 1, bz + 4 - cwz, BlockType.HAY_BALE);
    this._setBlock(chunk, bx + 5 - cwx, by + 1, bz + 4 - cwz, BlockType.HAY_BALE);

    // Open front
    this._setBlock(chunk, bx + 3 - cwx, by + 1, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 4 - cwx, by + 1, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 3 - cwx, by + 2, bz - cwz, BlockType.AIR);
    this._setBlock(chunk, bx + 4 - cwx, by + 2, bz - cwz, BlockType.AIR);
  }

  _buildTavern(chunk, bx, by, bz, tb, cwx, cwz) {
    const w = 8, d = 8, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.COBBLESTONE);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, tb.log);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 && ((dx === 2 || dx === 5) && (dz === 0 || dz === d - 1))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 3 && ((dx === 2 || dx === 5) && (dz === 0 || dz === d - 1))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 2 && ((dz === 2 || dz === 5) && (dx === 0 || dx === w - 1))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 4 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, tb.door_bottom);
              this._setBlock(chunk, lx, by + 2, lz, tb.door_top);
            } else if (!(dy === 2 && dx === 4 && dz === 0)) {
              if (dy === 1) {
                this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
              } else {
                this._setBlock(chunk, lx, by + dy, lz, tb.planks);
              }
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        this._setBlock(chunk, lx, by + h, lz, tb.slab);
      }
    }

    // Peaked roof
    for (let dz = -1; dz <= d; dz++) {
      for (let dx = 1; dx < w - 1; dx++) {
        this._setBlock(chunk, bx + dx - cwx, by + h, bz + dz - cwz, tb.slab);
      }
    }
    for (let dz = 0; dz < d; dz++) {
      this._setBlock(chunk, bx + Math.floor(w / 2) - cwx, by + h + 1, bz + dz - cwz, tb.planks);
      this._setBlock(chunk, bx + Math.floor(w / 2) - 1 - cwx, by + h + 1, bz + dz - cwz, tb.planks);
    }

    // Bar counter
    for (let dx = 2; dx <= 5; dx++) {
      this._setBlock(chunk, bx + dx - cwx, by + 1, bz + 3 - cwz, tb.slab);
    }

    // Tables (slabs)
    this._setBlock(chunk, bx + 2 - cwx, by + 1, bz + 1 - cwz, tb.fence);
    this._setBlock(chunk, bx + 2 - cwx, by + 2, bz + 1 - cwz, tb.slab);
    this._setBlock(chunk, bx + 5 - cwx, by + 1, bz + 1 - cwz, tb.fence);
    this._setBlock(chunk, bx + 5 - cwx, by + 2, bz + 1 - cwz, tb.slab);

    // Kegs
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz + 6 - cwz, BlockType.HAY_BALE);
    this._setBlock(chunk, bx + 2 - cwx, by + 1, bz + 6 - cwz, BlockType.HAY_BALE);

    // Lighting
    this._setBlock(chunk, bx + 3 - cwx, by + 3, bz + 2 - cwz, BlockType.LANTERN);
    this._setBlock(chunk, bx + 5 - cwx, by + 3, bz + 5 - cwz, BlockType.LANTERN);

    // Chimney
    for (let dy = h; dy <= h + 3; dy++) {
      this._setBlock(chunk, bx + 1 - cwx, by + dy, bz + 6 - cwz, BlockType.BRICKS);
    }
  }

  _buildWindmill(chunk, bx, by, bz, tb, cwx, cwz) {
    // Cylindrical body 5 block radius, 14 tall
    const h = 14;
    const r = 3;

    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + 1) continue;

        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;
        const isEdge = dx * dx + dz * dz > (r - 1) * (r - 1);

        for (let dy = 0; dy <= h; dy++) {
          if (isEdge) {
            if (dy < 5) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks);
            }
          } else {
            if (dy === 0) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.COBBLESTONE);
            } else if (dy === 7) {
              this._setBlock(chunk, lx, by + dy, lz, tb.planks); // Floor
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
            }
          }
        }
      }
    }

    // Cone roof
    for (let layer = 0; layer < 5; layer++) {
      const cr = r + 1 - layer;
      if (cr < 0) break;
      for (let dx = -cr; dx <= cr; dx++) {
        for (let dz = -cr; dz <= cr; dz++) {
          if (dx * dx + dz * dz <= cr * cr + 1) {
            this._setBlock(chunk, bx + dx - cwx, by + h + 1 + layer, bz + dz - cwz, tb.planks);
          }
        }
      }
    }

    // Door
    this._setBlock(chunk, bx - cwx, by + 1, bz - r - cwz, BlockType.AIR);
    this._setBlock(chunk, bx - cwx, by + 2, bz - r - cwz, BlockType.AIR);

    // Blades (crosses made of planks, extending from top)
    const bladeY = by + h - 2;
    // Blade extending in +X direction
    for (let i = 1; i <= 6; i++) {
      this._setBlock(chunk, bx + r + i - cwx, bladeY, bz - cwz, tb.planks);
      this._setBlock(chunk, bx + r + i - cwx, bladeY + 1, bz - cwz, tb.fence);
      this._setBlock(chunk, bx + r + i - cwx, bladeY - 1, bz - cwz, tb.fence);
    }
    // Blade extending in -X direction
    for (let i = 1; i <= 6; i++) {
      this._setBlock(chunk, bx - r - i - cwx, bladeY, bz - cwz, tb.planks);
      this._setBlock(chunk, bx - r - i - cwx, bladeY + 1, bz - cwz, tb.fence);
      this._setBlock(chunk, bx - r - i - cwx, bladeY - 1, bz - cwz, tb.fence);
    }

    // Interior
    this._setBlock(chunk, bx - cwx, by + 1, bz - cwz, BlockType.HAY_BALE);
    this._setBlock(chunk, bx + 1 - cwx, by + 1, bz - cwz, BlockType.HAY_BALE);
    this._setBlock(chunk, bx - 1 - cwx, by + 1, bz + 1 - cwz, BlockType.CRAFTING_TABLE);
  }

  _buildBarracks(chunk, bx, by, bz, tb, cwx, cwz) {
    const w = 10, d = 7, h = 5;

    this._buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz);

    for (let dx = 0; dx < w; dx++) {
      for (let dz = 0; dz < d; dz++) {
        const lx = bx + dx - cwx;
        const lz = bz + dz - cwz;

        this._setBlock(chunk, lx, by, lz, BlockType.STONE_BRICKS);

        for (let dy = 1; dy < h; dy++) {
          const isEdgeX = dx === 0 || dx === w - 1;
          const isEdgeZ = dz === 0 || dz === d - 1;

          if (isEdgeX && isEdgeZ) {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
          } else if (isEdgeX || isEdgeZ) {
            if (dy === 2 && ((dx === 2 || dx === 5 || dx === 7) && (dz === 0 || dz === d - 1))) {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.GLASS);
            } else if (dy === 1 && dx === 5 && dz === 0) {
              this._setBlock(chunk, lx, by + 1, lz, BlockType.AIR);
              this._setBlock(chunk, lx, by + 2, lz, BlockType.AIR);
            } else {
              this._setBlock(chunk, lx, by + dy, lz, BlockType.STONE_BRICKS);
            }
          } else {
            this._setBlock(chunk, lx, by + dy, lz, BlockType.AIR);
          }
        }

        this._setBlock(chunk, lx, by + h, lz, BlockType.STONE_BRICKS);
      }
    }

    // Interior: beds (using wool)
    for (let bunk = 0; bunk < 4; bunk++) {
      const bedX = 1 + bunk * 2;
      this._setBlock(chunk, bx + bedX - cwx, by + 1, bz + 5 - cwz, BlockType.RED_WOOL);
      this._setBlock(chunk, bx + bedX - cwx, by + 1, bz + 4 - cwz, BlockType.WHITE_WOOL);
    }

    // Weapon rack (using fence + planks)
    for (let dx = 1; dx <= 3; dx++) {
      this._setBlock(chunk, bx + dx - cwx, by + 2, bz + 1 - cwz, tb.fence);
    }

    // Chest
    this._setBlock(chunk, bx + 8 - cwx, by + 1, bz + 5 - cwz, BlockType.CHEST);

    // Torches 
    this._setBlock(chunk, bx + 2 - cwx, by + 3, bz + 3 - cwz, BlockType.TORCH);
    this._setBlock(chunk, bx + 7 - cwx, by + 3, bz + 3 - cwz, BlockType.TORCH);
  }

  _buildFoundation(chunk, bx, by, bz, w, d, cwx, cwz) {
    // Level the ground under the building
    for (let dx = -1; dx <= w; dx++) {
      for (let dz = -1; dz <= d; dz++) {
        const wx = bx + dx;
        const wz = bz + dz;
        const lx = wx - cwx;
        const lz = wz - cwz;
        if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) continue;

        const localHeight = this.world.getHeight(wx, wz);

        // Fill up to building level
        for (let y = localHeight; y < by; y++) {
          this._setBlock(chunk, lx, y, lz, BlockType.COBBLESTONE);
        }

        // Clear above building level
        for (let y = by; y < by + 2; y++) {
          const idx = lx + chunk.size * (y + chunk.height * lz);
          if (idx >= 0 && idx < chunk.data.length) {
            const current = chunk.data[idx];
            if (current === BlockType.GRASS || current === BlockType.DIRT || current === BlockType.TALL_GRASS) {
              chunk.data[idx] = BlockType.AIR;
            }
          }
        }
      }
    }
  }
}
