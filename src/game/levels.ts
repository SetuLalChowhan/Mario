import { DIFFICULTY_CONFIGS } from './storage';
import {
  CheckpointMarker,
  CoinCollectible,
  Difficulty,
  Enemy,
  EnemyType,
  FireBarHazard,
  InteractiveBlock,
  MovingPlatform,
  SecretRelic,
  TileType,
  WindZone,
  WorldTheme,
} from './types';

export const TILE_SIZE = 32;
export const LEVEL_ROWS = 16;

export interface WorldMetadata {
  worldNumber: number; // 1..5
  title: string;
  subtitle: string;
  theme: WorldTheme;
  accentColor: string;
  description: string;
}

export const WORLDS_METADATA: WorldMetadata[] = [
  {
    worldNumber: 1,
    title: 'Verdant Hollow',
    subtitle: 'Ancient Luminescent Forest',
    theme: 'VERDANT_HOLLOW',
    accentColor: '#4ADE80',
    description:
      'Sun-dappled moss sanctuaries, hollow briar trunks, and introductory rune shrines.',
  },
  {
    worldNumber: 2,
    title: 'Crystal Caverns',
    subtitle: 'Subterranean Quartz Depths',
    theme: 'CRYSTAL_CAVERNS',
    accentColor: '#38BDF8',
    description:
      'Echoing geode chambers, levitating quartz elevators, and spell-proof Ironback Beetles.',
  },
  {
    worldNumber: 3,
    title: 'Emberfall Peaks',
    subtitle: 'Volcanic Basalt Ridges',
    theme: 'EMBERFALL_PEAKS',
    accentColor: '#FB923C',
    description:
      'Molten fissures, leaping Magma Wisps, rotating Ember Pendulums, and crushing Cragwardens.',
  },
  {
    worldNumber: 4,
    title: 'Skyroot Citadel',
    subtitle: 'Windborne Aether Ruins',
    theme: 'SKYROOT_CITADEL',
    accentColor: '#A78BFA',
    description:
      'High-altitude sanctuaries where gale updrafts and sky-lifts carry you across the clouds.',
  },
  {
    worldNumber: 5,
    title: 'The Runeheart Keep',
    subtitle: 'Sanctum of the Rune Tyrant',
    theme: 'RUNEHEART_KEEP',
    accentColor: '#F43F5E',
    description:
      'Malakor’s obsidian fortress combining every hazard in the realm before the final throne.',
  },
];

export interface CampaignLevelBlueprint {
  levelId: number; // 1..20
  worldNumber: number; // 1..5
  stageNumber: number; // 1..4
  worldLabel: string; // e.g. '1-1'
  title: string;
  theme: WorldTheme;
  cols: number;
  hasCeiling: boolean;
  isBossStage: boolean;
  bossName: string;
  bossBaseHp: number;
  seed: number;
  pitCols: Array<[number, number]>;
  platformDefs: Array<{
    col: number;
    row: number;
    spanCols: number;
    dxCols: number;
    dyRows: number;
    speed: number;
  }>;
  windDefs: Array<{
    col: number;
    row: number;
    widthCols: number;
    heightRows: number;
    forceX: number;
    forceY: number;
  }>;
  pendulumCols: Array<{ col: number; row: number; speed: number; segments: number }>;
  enemyMix: EnemyType[];
}

export const CAMPAIGN_BLUEPRINTS: CampaignLevelBlueprint[] = [
  // ================= WORLD 1: VERDANT HOLLOW =================
  {
    levelId: 1,
    worldNumber: 1,
    stageNumber: 1,
    worldLabel: '1-1',
    title: 'Whispering Glade',
    theme: 'VERDANT_HOLLOW',
    cols: 145,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 101,
    pitCols: [
      [48, 49],
      [88, 89],
    ],
    platformDefs: [],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['GOOMBA', 'GOOMBA', 'KOOPA'],
  },
  {
    levelId: 2,
    worldNumber: 1,
    stageNumber: 2,
    worldLabel: '1-2',
    title: 'Mossroot Crossing',
    theme: 'VERDANT_HOLLOW',
    cols: 150,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 102,
    pitCols: [
      [42, 44],
      [78, 80],
      [112, 114],
    ],
    platformDefs: [
      { col: 78, row: 11, spanCols: 3, dxCols: 3, dyRows: 0, speed: 65 },
    ],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['GOOMBA', 'KOOPA', 'PIRANHA'],
  },
  {
    levelId: 3,
    worldNumber: 1,
    stageNumber: 3,
    worldLabel: '1-3',
    title: 'Canopy Ascent',
    theme: 'VERDANT_HOLLOW',
    cols: 155,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 103,
    pitCols: [
      [36, 39],
      [72, 76],
      [106, 109],
    ],
    platformDefs: [
      { col: 36, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 75 },
      { col: 73, row: 11, spanCols: 3, dxCols: 0, dyRows: 4, speed: 65 },
      { col: 106, row: 10, spanCols: 3, dxCols: 4, dyRows: 0, speed: 80 },
    ],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['KOOPA', 'GOOMBA', 'PIRANHA', 'HAMMER_BRO'],
  },
  {
    levelId: 4,
    worldNumber: 1,
    stageNumber: 4,
    worldLabel: '1-4',
    title: 'Warden of the Hollow',
    theme: 'VERDANT_HOLLOW',
    cols: 148,
    hasCeiling: true,
    isBossStage: true,
    bossName: 'Thornback, Hollow Warden',
    bossBaseHp: 5,
    seed: 104,
    pitCols: [
      [28, 30],
      [60, 62],
      [90, 92],
    ],
    platformDefs: [
      { col: 60, row: 11, spanCols: 3, dxCols: 3, dyRows: 0, speed: 70 },
    ],
    windDefs: [],
    pendulumCols: [{ col: 46, row: 9, speed: 1.8, segments: 4 }],
    enemyMix: ['KOOPA', 'PIRANHA', 'THWOMP'],
  },

  // ================= WORLD 2: CRYSTAL CAVERNS =================
  {
    levelId: 5,
    worldNumber: 2,
    stageNumber: 1,
    worldLabel: '2-1',
    title: 'Glimmerstone Delve',
    theme: 'CRYSTAL_CAVERNS',
    cols: 152,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 201,
    pitCols: [
      [40, 42],
      [82, 84],
    ],
    platformDefs: [
      { col: 82, row: 11, spanCols: 3, dxCols: 3, dyRows: 0, speed: 75 },
    ],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['BUZZY', 'KOOPA', 'GOOMBA'],
  },
  {
    levelId: 6,
    worldNumber: 2,
    stageNumber: 2,
    worldLabel: '2-2',
    title: 'Quartz Elevators',
    theme: 'CRYSTAL_CAVERNS',
    cols: 156,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 202,
    pitCols: [
      [34, 38],
      [68, 72],
      [104, 108],
    ],
    platformDefs: [
      { col: 35, row: 11, spanCols: 3, dxCols: 0, dyRows: 4, speed: 70 },
      { col: 69, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 105, row: 11, spanCols: 3, dxCols: 0, dyRows: 4, speed: 75 },
    ],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['BUZZY', 'PIRANHA', 'KOOPA'],
  },
  {
    levelId: 7,
    worldNumber: 2,
    stageNumber: 3,
    worldLabel: '2-3',
    title: 'Echoing Chasm',
    theme: 'CRYSTAL_CAVERNS',
    cols: 160,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 203,
    pitCols: [
      [38, 41],
      [74, 78],
      [110, 113],
    ],
    platformDefs: [
      { col: 38, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 80 },
      { col: 75, row: 10, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 110, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
    ],
    windDefs: [],
    pendulumCols: [],
    enemyMix: ['BUZZY', 'HAMMER_BRO', 'THWOMP', 'KOOPA'],
  },
  {
    levelId: 8,
    worldNumber: 2,
    stageNumber: 4,
    worldLabel: '2-4',
    title: 'The Deep Geode',
    theme: 'CRYSTAL_CAVERNS',
    cols: 150,
    hasCeiling: true,
    isBossStage: true,
    bossName: 'Crystallis, Geode Sentinel',
    bossBaseHp: 6,
    seed: 204,
    pitCols: [
      [26, 28],
      [58, 61],
      [88, 90],
    ],
    platformDefs: [
      { col: 58, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 80 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 42, row: 9, speed: 2.0, segments: 4 },
      { col: 76, row: 9, speed: -2.1, segments: 4 },
    ],
    enemyMix: ['BUZZY', 'THWOMP', 'HAMMER_BRO'],
  },

  // ================= WORLD 3: EMBERFALL PEAKS =================
  {
    levelId: 9,
    worldNumber: 3,
    stageNumber: 1,
    worldLabel: '3-1',
    title: 'Cinder Ridge',
    theme: 'EMBERFALL_PEAKS',
    cols: 155,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 301,
    pitCols: [
      [32, 34],
      [66, 68],
      [100, 102],
    ],
    platformDefs: [],
    windDefs: [],
    pendulumCols: [{ col: 50, row: 9, speed: 2.0, segments: 4 }],
    enemyMix: ['PODOBOO', 'BUZZY', 'KOOPA'],
  },
  {
    levelId: 10,
    worldNumber: 3,
    stageNumber: 2,
    worldLabel: '3-2',
    title: 'Magma Conduits',
    theme: 'EMBERFALL_PEAKS',
    cols: 160,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 302,
    pitCols: [
      [34, 38],
      [70, 74],
      [106, 110],
    ],
    platformDefs: [
      { col: 34, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 80 },
      { col: 70, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 106, row: 10, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 52, row: 9, speed: 2.2, segments: 5 },
      { col: 88, row: 9, speed: -2.2, segments: 5 },
    ],
    enemyMix: ['PODOBOO', 'BUZZY', 'PIRANHA', 'HAMMER_BRO'],
  },
  {
    levelId: 11,
    worldNumber: 3,
    stageNumber: 3,
    worldLabel: '3-3',
    title: 'Obsidian Spire',
    theme: 'EMBERFALL_PEAKS',
    cols: 162,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 303,
    pitCols: [
      [36, 39],
      [72, 75],
      [108, 111],
    ],
    platformDefs: [
      { col: 36, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 72, row: 10, spanCols: 3, dxCols: 0, dyRows: 4, speed: 75 },
      { col: 108, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 54, row: 9, speed: 2.4, segments: 5 },
      { col: 92, row: 9, speed: -2.4, segments: 5 },
    ],
    enemyMix: ['THWOMP', 'PODOBOO', 'HAMMER_BRO', 'BUZZY'],
  },
  {
    levelId: 12,
    worldNumber: 3,
    stageNumber: 4,
    worldLabel: '3-4',
    title: 'Caldera Sentinel',
    theme: 'EMBERFALL_PEAKS',
    cols: 152,
    hasCeiling: true,
    isBossStage: true,
    bossName: 'Pyroth, Caldera Wyrm',
    bossBaseHp: 7,
    seed: 304,
    pitCols: [
      [24, 26],
      [56, 59],
      [86, 89],
    ],
    platformDefs: [
      { col: 56, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 86, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 40, row: 9, speed: 2.3, segments: 5 },
      { col: 74, row: 9, speed: -2.4, segments: 5 },
    ],
    enemyMix: ['PODOBOO', 'THWOMP', 'HAMMER_BRO'],
  },

  // ================= WORLD 4: SKYROOT CITADEL =================
  {
    levelId: 13,
    worldNumber: 4,
    stageNumber: 1,
    worldLabel: '4-1',
    title: 'Cloudbough Terrace',
    theme: 'SKYROOT_CITADEL',
    cols: 158,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 401,
    pitCols: [
      [34, 38],
      [70, 74],
      [104, 108],
    ],
    platformDefs: [],
    windDefs: [
      { col: 33, row: 6, widthCols: 6, heightRows: 8, forceX: 60, forceY: -260 },
      { col: 69, row: 6, widthCols: 6, heightRows: 8, forceX: 60, forceY: -260 },
      { col: 103, row: 6, widthCols: 6, heightRows: 8, forceX: 60, forceY: -260 },
    ],
    pendulumCols: [],
    enemyMix: ['KOOPA', 'GOOMBA', 'HAMMER_BRO'],
  },
  {
    levelId: 14,
    worldNumber: 4,
    stageNumber: 2,
    worldLabel: '4-2',
    title: 'Gale Platforms',
    theme: 'SKYROOT_CITADEL',
    cols: 162,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 402,
    pitCols: [
      [32, 37],
      [68, 73],
      [104, 109],
    ],
    platformDefs: [
      { col: 33, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 85 },
      { col: 69, row: 10, spanCols: 3, dxCols: 0, dyRows: 4, speed: 80 },
      { col: 105, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
    ],
    windDefs: [
      { col: 50, row: 5, widthCols: 8, heightRows: 8, forceX: 95, forceY: -180 },
      { col: 86, row: 5, widthCols: 8, heightRows: 8, forceX: 95, forceY: -180 },
    ],
    pendulumCols: [],
    enemyMix: ['KOOPA', 'PIRANHA', 'HAMMER_BRO'],
  },
  {
    levelId: 15,
    worldNumber: 4,
    stageNumber: 3,
    worldLabel: '4-3',
    title: 'Aether Causeway',
    theme: 'SKYROOT_CITADEL',
    cols: 165,
    hasCeiling: false,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 403,
    pitCols: [
      [36, 41],
      [74, 79],
      [110, 115],
    ],
    platformDefs: [
      { col: 37, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
      { col: 75, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
      { col: 111, row: 10, spanCols: 3, dxCols: 4, dyRows: 0, speed: 95 },
    ],
    windDefs: [
      { col: 36, row: 6, widthCols: 6, heightRows: 8, forceX: 70, forceY: -240 },
      { col: 74, row: 6, widthCols: 6, heightRows: 8, forceX: 70, forceY: -240 },
      { col: 110, row: 6, widthCols: 6, heightRows: 8, forceX: 70, forceY: -240 },
    ],
    pendulumCols: [{ col: 58, row: 9, speed: 2.2, segments: 4 }],
    enemyMix: ['KOOPA', 'HAMMER_BRO', 'THWOMP', 'BUZZY'],
  },
  {
    levelId: 16,
    worldNumber: 4,
    stageNumber: 4,
    worldLabel: '4-4',
    title: 'Sovereign of the Winds',
    theme: 'SKYROOT_CITADEL',
    cols: 154,
    hasCeiling: true,
    isBossStage: true,
    bossName: 'Zephyros, Storm Archon',
    bossBaseHp: 8,
    seed: 404,
    pitCols: [
      [26, 30],
      [60, 64],
      [90, 94],
    ],
    platformDefs: [
      { col: 61, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
    ],
    windDefs: [
      { col: 25, row: 6, widthCols: 6, heightRows: 8, forceX: 65, forceY: -260 },
      { col: 89, row: 6, widthCols: 6, heightRows: 8, forceX: 65, forceY: -260 },
    ],
    pendulumCols: [
      { col: 44, row: 9, speed: 2.4, segments: 5 },
      { col: 78, row: 9, speed: -2.4, segments: 5 },
    ],
    enemyMix: ['HAMMER_BRO', 'THWOMP', 'KOOPA'],
  },

  // ================= WORLD 5: THE RUNEHEART KEEP =================
  {
    levelId: 17,
    worldNumber: 5,
    stageNumber: 1,
    worldLabel: '5-1',
    title: 'Outer Bastion',
    theme: 'RUNEHEART_KEEP',
    cols: 162,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 501,
    pitCols: [
      [32, 35],
      [68, 71],
      [104, 107],
    ],
    platformDefs: [
      { col: 68, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 48, row: 9, speed: 2.4, segments: 5 },
      { col: 88, row: 9, speed: -2.5, segments: 5 },
    ],
    enemyMix: ['BUZZY', 'PODOBOO', 'THWOMP', 'HAMMER_BRO'],
  },
  {
    levelId: 18,
    worldNumber: 5,
    stageNumber: 2,
    worldLabel: '5-2',
    title: 'Hall of Pendulums',
    theme: 'RUNEHEART_KEEP',
    cols: 165,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 502,
    pitCols: [
      [34, 38],
      [72, 76],
      [108, 112],
    ],
    platformDefs: [
      { col: 34, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
      { col: 72, row: 10, spanCols: 3, dxCols: 0, dyRows: 4, speed: 85 },
      { col: 108, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 95 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 24, row: 9, speed: 2.5, segments: 5 },
      { col: 54, row: 9, speed: -2.6, segments: 5 },
      { col: 92, row: 9, speed: 2.6, segments: 5 },
    ],
    enemyMix: ['PODOBOO', 'THWOMP', 'BUZZY', 'HAMMER_BRO'],
  },
  {
    levelId: 19,
    worldNumber: 5,
    stageNumber: 3,
    worldLabel: '5-3',
    title: 'Sanctum Gauntlet',
    theme: 'RUNEHEART_KEEP',
    cols: 168,
    hasCeiling: true,
    isBossStage: false,
    bossName: '',
    bossBaseHp: 0,
    seed: 503,
    pitCols: [
      [36, 40],
      [74, 79],
      [112, 116],
    ],
    platformDefs: [
      { col: 36, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 95 },
      { col: 75, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 95 },
      { col: 112, row: 10, spanCols: 3, dxCols: 4, dyRows: 0, speed: 95 },
    ],
    windDefs: [
      { col: 74, row: 6, widthCols: 6, heightRows: 8, forceX: 60, forceY: -240 },
    ],
    pendulumCols: [
      { col: 56, row: 9, speed: 2.6, segments: 5 },
      { col: 96, row: 9, speed: -2.7, segments: 5 },
    ],
    enemyMix: ['THWOMP', 'HAMMER_BRO', 'PODOBOO', 'BUZZY'],
  },
  {
    levelId: 20,
    worldNumber: 5,
    stageNumber: 4,
    worldLabel: '5-4',
    title: 'The Runeheart Throne',
    theme: 'RUNEHEART_KEEP',
    cols: 158,
    hasCeiling: true,
    isBossStage: true,
    bossName: 'Malakor, Runeheart Tyrant',
    bossBaseHp: 10,
    seed: 504,
    pitCols: [
      [26, 29],
      [58, 62],
      [90, 94],
    ],
    platformDefs: [
      { col: 58, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
      { col: 90, row: 11, spanCols: 3, dxCols: 4, dyRows: 0, speed: 90 },
    ],
    windDefs: [],
    pendulumCols: [
      { col: 42, row: 9, speed: 2.6, segments: 5 },
      { col: 76, row: 9, speed: -2.7, segments: 5 },
    ],
    enemyMix: ['THWOMP', 'PODOBOO', 'HAMMER_BRO', 'BUZZY'],
  },
];

export interface LevelData {
  levelId: number;
  worldIndex: number;
  worldLabel: string;
  worldTitle: string;
  theme: WorldTheme;
  cols: number;
  rows: number;
  grid: TileType[][];
  blocks: Map<string, InteractiveBlock>;
  enemies: Enemy[];
  coins: CoinCollectible[];
  relics: SecretRelic[];
  checkpoint: CheckpointMarker;
  winds: WindZone[];
  platforms: MovingPlatform[];
  fireBars: FireBarHazard[];
  flagCol: number;
  castleCol: number;
  axeCol: number;
  bridgeCols: number[];
  bossName: string;
}

function createEmptyGrid(rows: number, cols: number): TileType[][] {
  const grid: TileType[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array<TileType>(cols).fill('EMPTY'));
  }
  return grid;
}

function setBlock(
  grid: TileType[][],
  blocks: Map<string, InteractiveBlock>,
  col: number,
  row: number,
  type: TileType,
  coinsLeft: number = 1
): void {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return;
  grid[row][col] = type;
  blocks.set(`${col},${row}`, {
    col,
    row,
    type,
    originalType: type,
    bumpOffset: 0,
    bumpVelocity: 0,
    coinsLeft,
    scaleX: 1,
    scaleY: 1,
  });
}

function addConduitTrunk(
  grid: TileType[][],
  col: number,
  topRow: number,
  bottomRow: number
): void {
  grid[topRow][col] = 'PIPE_TOP_L';
  grid[topRow][col + 1] = 'PIPE_TOP_R';
  for (let r = topRow + 1; r <= bottomRow; r++) {
    grid[r][col] = 'PIPE_BODY_L';
    grid[r][col + 1] = 'PIPE_BODY_R';
  }
}

function addStairs(
  grid: TileType[][],
  startCol: number,
  height: number,
  ascending: boolean,
  groundRow: number = 13
): void {
  for (let i = 0; i < height; i++) {
    const col = startCol + i;
    const h = ascending ? i + 1 : height - i;
    for (let r = groundRow; r > groundRow - h; r--) {
      if (col >= 0 && col < grid[0].length) {
        grid[r][col] = 'HARD_BLOCK';
      }
    }
  }
}

export function getBlueprintById(levelId: number): CampaignLevelBlueprint {
  const clamped = Math.max(1, Math.min(CAMPAIGN_BLUEPRINTS.length, levelId));
  return CAMPAIGN_BLUEPRINTS[clamped - 1];
}

export function buildLevel(
  levelId: number,
  difficulty: Difficulty = 'NORMAL'
): LevelData {
  const bp = getBlueprintById(levelId);
  const diffCfg = DIFFICULTY_CONFIGS[difficulty];
  const cols = bp.cols;
  const rows = LEVEL_ROWS;
  const grid = createEmptyGrid(rows, cols);
  const blocks = new Map<string, InteractiveBlock>();
  const enemies: Enemy[] = [];
  const coins: CoinCollectible[] = [];
  const relics: SecretRelic[] = [];
  const platforms: MovingPlatform[] = [];
  const fireBars: FireBarHazard[] = [];
  const winds: WindZone[] = [];

  let nextId = levelId * 1000;

  // Ceiling for cavern / fortress stages
  if (bp.hasCeiling) {
    for (let c = 2; c < cols - 16; c++) {
      grid[1][c] = bp.isBossStage ? 'HARD_BLOCK' : 'BRICK';
    }
  }

  // Pit / Hazard set
  const pitSet = new Set<number>();
  for (const [startC, endC] of bp.pitCols) {
    for (let c = startC; c <= endC; c++) {
      pitSet.add(c);
    }
  }

  // Boss Bridge pit columns if Boss Stage
  const bridgeStartCol = cols - 34;
  const bridgeEndCol = cols - 20;
  if (bp.isBossStage) {
    for (let c = bridgeStartCol; c <= bridgeEndCol; c++) {
      pitSet.add(c);
    }
  }

  const useMoltenFloor =
    bp.theme === 'EMBERFALL_PEAKS' ||
    bp.theme === 'RUNEHEART_KEEP' ||
    bp.isBossStage;

  for (let c = 0; c < cols; c++) {
    if (pitSet.has(c)) {
      if (useMoltenFloor) {
        grid[14][c] = 'LAVA_TOP';
        grid[15][c] = 'LAVA_BODY';
      }
    } else {
      grid[14][c] = 'GROUND';
      grid[15][c] = 'GROUND';
    }
  }

  // Opening Rune Shrine cluster (guaranteed early power-up & shards)
  setBlock(grid, blocks, 11, 10, 'QUESTION_COIN', 1);
  setBlock(grid, blocks, 14, 10, 'BRICK', 1);
  setBlock(grid, blocks, 15, 10, 'QUESTION_POWERUP', 1);
  setBlock(grid, blocks, 16, 10, 'BRICK', 1);
  setBlock(grid, blocks, 17, 10, 'QUESTION_COIN', 2);
  setBlock(grid, blocks, 15, 6, 'QUESTION_COIN', 3);

  for (let c = 14; c <= 18; c++) {
    coins.push({
      id: nextId++,
      x: c * TILE_SIZE + 8,
      y: 8 * TILE_SIZE + 6,
      collected: false,
      bobOffset: c * 0.5,
    });
  }

  // Structured progression segments across the level
  const safeEndCol = bp.isBossStage ? bridgeStartCol - 8 : cols - 28;
  const checkpointCol = Math.floor(cols * 0.48);
  // Ensure checkpoint column has solid ground
  for (let c = checkpointCol - 2; c <= checkpointCol + 2; c++) {
    pitSet.delete(c);
    grid[14][c] = 'GROUND';
    grid[15][c] = 'GROUND';
  }

  const checkpoint: CheckpointMarker = {
    id: nextId++,
    col: checkpointCol,
    row: 13,
    x: checkpointCol * TILE_SIZE,
    y: 12 * TILE_SIZE,
    activated: false,
  };

  // Mid-level supply shrine right after checkpoint
  setBlock(grid, blocks, checkpointCol + 3, 10, 'QUESTION_POWERUP', 1);
  setBlock(grid, blocks, checkpointCol + 4, 10, 'QUESTION_COIN', 2);

  // Place 3 Secret Relics in elevated / exploration spots across the stage
  const relicCols = [
    Math.floor(cols * 0.24),
    Math.floor(cols * 0.55),
    Math.floor(cols * 0.76),
  ];

  relicCols.forEach((rc, idx) => {
    // High sanctuary ledge for each Secret Relic
    for (let c = rc - 2; c <= rc + 2; c++) {
      setBlock(grid, blocks, c, 6, 'BRICK', 1);
    }
    // Stepping stone to reach the high ledge
    setBlock(grid, blocks, rc - 4, 9, 'HARD_BLOCK', 1);
    setBlock(grid, blocks, rc - 3, 9, 'QUESTION_COIN', 1);

    relics.push({
      id: nextId++,
      index: idx,
      x: rc * TILE_SIZE + 4,
      y: 4 * TILE_SIZE + 4,
      collected: false,
    });
  });

  // Populate rhythmic platforming formations & conduits between col 22 and safeEndCol
  for (let c = 22; c < safeEndCol; c += 16) {
    if (Math.abs(c - checkpointCol) < 5) continue;
    if (pitSet.has(c) || pitSet.has(c + 1) || pitSet.has(c + 2)) continue;

    const pattern = (c + bp.seed) % 4;
    if (pattern === 0) {
      // Conduit Trunk with optional Briarmaw
      addConduitTrunk(grid, c, 11, 13);
      if (bp.enemyMix.includes('PIRANHA')) {
        enemies.push(
          makeEnemy(
            nextId++,
            'PIRANHA',
            c * TILE_SIZE + 16,
            11 * TILE_SIZE,
            diffCfg.enemySpeedMultiplier
          )
        );
      }
      for (let sc = c + 4; sc <= c + 7; sc++) {
        if (!pitSet.has(sc)) {
          coins.push({
            id: nextId++,
            x: sc * TILE_SIZE + 8,
            y: 10 * TILE_SIZE + 6,
            collected: false,
            bobOffset: sc * 0.4,
          });
        }
      }
    } else if (pattern === 1) {
      // Rune Shrine triad + Aether Star or Extra Ward block
      setBlock(grid, blocks, c, 10, 'BRICK', 1);
      setBlock(
        grid,
        blocks,
        c + 1,
        10,
        c > cols * 0.6 ? 'QUESTION_STAR' : 'QUESTION_COIN',
        1
      );
      setBlock(grid, blocks, c + 2, 10, 'BRICK', 1);
      if (c % 32 === 6) {
        setBlock(grid, blocks, c + 1, 6, 'QUESTION_1UP', 1);
      }
    } else if (pattern === 2) {
      // Stepped stone terrace with Shard arc
      addStairs(grid, c, 3, true, 13);
      for (let sc = c; sc <= c + 3; sc++) {
        coins.push({
          id: nextId++,
          x: sc * TILE_SIZE + 8,
          y: 8 * TILE_SIZE + 6,
          collected: false,
          bobOffset: sc * 0.5,
        });
      }
    } else {
      // Elevated dual-tier rune platform
      for (let sc = c; sc <= c + 4; sc++) {
        setBlock(
          grid,
          blocks,
          sc,
          9,
          sc === c + 2 ? 'QUESTION_POWERUP' : 'BRICK',
          1
        );
        coins.push({
          id: nextId++,
          x: sc * TILE_SIZE + 8,
          y: 7 * TILE_SIZE + 6,
          collected: false,
          bobOffset: sc * 0.3,
        });
      }
    }
  }

  // Moving Platforms from Blueprint
  for (const pd of bp.platformDefs) {
    const startX = pd.col * TILE_SIZE;
    const startY = pd.row * TILE_SIZE;
    platforms.push({
      x: startX,
      y: startY,
      width: pd.spanCols * TILE_SIZE,
      height: 16,
      vx: pd.dxCols > 0 ? pd.speed : 0,
      vy: pd.dyRows > 0 ? -pd.speed : 0,
      minX: startX - TILE_SIZE * 0.5,
      maxX: startX + pd.dxCols * TILE_SIZE,
      minY: startY - pd.dyRows * TILE_SIZE,
      maxY: startY + TILE_SIZE * 0.5,
    });
  }

  // Wind Updraft Zones (World 4 & 5)
  for (const wd of bp.windDefs) {
    winds.push({
      x: wd.col * TILE_SIZE,
      y: wd.row * TILE_SIZE,
      width: wd.widthCols * TILE_SIZE,
      height: wd.heightRows * TILE_SIZE,
      forceX: wd.forceX,
      forceY: wd.forceY,
    });
  }

  // Rotating Ember Pendulums
  for (const pend of bp.pendulumCols) {
    grid[pend.row][pend.col] = 'USED_BLOCK';
    fireBars.push({
      x: pend.col * TILE_SIZE + 16,
      y: pend.row * TILE_SIZE + 16,
      angle: 0,
      speed: pend.speed * diffCfg.enemySpeedMultiplier,
      segments: pend.segments,
    });
  }

  // Spawn Patrol & Hazard Enemies along the stage
  const enemyStep = difficulty === 'HARD' ? 11 : difficulty === 'EASY' ? 16 : 13;
  let mixIdx = 0;
  for (let c = 20; c < safeEndCol - 6; c += enemyStep) {
    if (Math.abs(c - checkpointCol) < 5) continue;
    const eType = bp.enemyMix[mixIdx % bp.enemyMix.length];
    mixIdx++;

    if (eType === 'PIRANHA') continue; // Already placed on Conduit Trunks

    if (eType === 'PODOBOO') {
      // Place in nearest molten pit
      const pitPair = bp.pitCols[(mixIdx - 1) % Math.max(1, bp.pitCols.length)];
      if (pitPair) {
        const midPitCol = (pitPair[0] + pitPair[1]) / 2;
        enemies.push(
          makeEnemy(
            nextId++,
            'PODOBOO',
            midPitCol * TILE_SIZE,
            14 * TILE_SIZE,
            diffCfg.enemySpeedMultiplier
          )
        );
      }
      continue;
    }

    if (eType === 'THWOMP') {
      if (!pitSet.has(c)) {
        enemies.push(
          makeEnemy(
            nextId++,
            'THWOMP',
            c * TILE_SIZE,
            3 * TILE_SIZE,
            diffCfg.enemySpeedMultiplier
          )
        );
      }
      continue;
    }

    if (!pitSet.has(c) && !pitSet.has(c + 1)) {
      enemies.push(
        makeEnemy(
          nextId++,
          eType,
          c * TILE_SIZE,
          13 * TILE_SIZE,
          diffCfg.enemySpeedMultiplier
        )
      );
    }
  }

  // Finale Section: Either Boss Bridge + Shatter Sigil OR Ascent Stairs + Rune Gate Obelisk
  const bridgeCols: number[] = [];
  let flagCol = -1;
  let axeCol = -1;
  const castleCol = cols - 10;

  if (bp.isBossStage) {
    // Upper tactical dodge blocks above boss bridge
    for (let c = bridgeStartCol + 2; c <= bridgeEndCol - 2; c += 2) {
      setBlock(grid, blocks, c, 7, 'BRICK', 1);
    }
    for (let c = bridgeStartCol; c <= bridgeEndCol; c++) {
      grid[12][c] = 'BRIDGE';
      bridgeCols.push(c);
    }
    axeCol = bridgeEndCol + 1;
    grid[12][axeCol] = 'HARD_BLOCK';
    grid[11][axeCol] = 'AXE';

    const bossHp =
      difficulty === 'HARD'
        ? bp.bossBaseHp + 2
        : difficulty === 'EASY'
        ? Math.max(3, bp.bossBaseHp - 2)
        : bp.bossBaseHp;

    const boss = makeEnemy(
      nextId++,
      'BOWSER',
      (bridgeEndCol - 5) * TILE_SIZE,
      10 * TILE_SIZE,
      diffCfg.enemySpeedMultiplier
    );
    boss.hp = bossHp;
    boss.maxHp = bossHp;
    enemies.push(boss);
  } else {
    // Final Ascent Staircase & Portal Obelisk
    const stairsCol = cols - 25;
    addStairs(grid, stairsCol, 7, true, 13);
    for (let r = 13; r > 13 - 7; r--) {
      grid[r][stairsCol + 7] = 'HARD_BLOCK';
    }
    flagCol = cols - 14;
    grid[13][flagCol] = 'HARD_BLOCK';
  }

  return {
    levelId: bp.levelId,
    worldIndex: bp.worldNumber,
    worldLabel: bp.worldLabel,
    worldTitle: bp.title,
    theme: bp.theme,
    cols,
    rows,
    grid,
    blocks,
    enemies,
    coins,
    relics,
    checkpoint,
    winds,
    platforms,
    fireBars,
    flagCol,
    castleCol,
    axeCol,
    bridgeCols,
    bossName: bp.bossName,
  };
}

function makeEnemy(
  id: number,
  type: Enemy['type'],
  x: number,
  y: number,
  speedMult: number
): Enemy {
  if (type === 'PIRANHA') {
    return {
      id,
      type,
      x: x - 14,
      y: y + 4,
      vx: 0,
      vy: 0,
      width: 28,
      height: 34,
      facing: -1,
      state: 'PIRANHA_HIDDEN',
      stateTimer: 1.0,
      windupTimer: 0,
      homeX: x - 14,
      homeY: y,
      animTimer: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      hp: 1,
      maxHp: 1,
      active: true,
      onGround: false,
    };
  }

  if (type === 'THWOMP') {
    return {
      id,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      width: 44,
      height: 52,
      facing: -1,
      state: 'THWOMP_IDLE',
      stateTimer: 0,
      windupTimer: 0,
      homeX: x,
      homeY: y,
      animTimer: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      hp: 99,
      maxHp: 99,
      active: true,
      onGround: false,
    };
  }

  if (type === 'PODOBOO') {
    return {
      id,
      type,
      x,
      y,
      vx: 0,
      vy: -520,
      width: 24,
      height: 28,
      facing: -1,
      state: 'WALKING',
      stateTimer: 0.85,
      windupTimer: 0,
      homeX: x,
      homeY: y,
      animTimer: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      hp: 99,
      maxHp: 99,
      active: true,
      onGround: false,
    };
  }

  if (type === 'BOWSER') {
    return {
      id,
      type,
      x,
      y: y - 28,
      vx: -48 * speedMult,
      vy: 0,
      width: 56,
      height: 60,
      facing: -1,
      state: 'WALKING',
      stateTimer: 1.8,
      windupTimer: 0,
      homeX: x,
      homeY: y - 28,
      animTimer: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      hp: 8,
      maxHp: 8,
      active: true,
      onGround: false,
    };
  }

  if (type === 'HAMMER_BRO') {
    return {
      id,
      type,
      x,
      y: y - 10,
      vx: -40 * speedMult,
      vy: 0,
      width: 28,
      height: 40,
      facing: -1,
      state: 'WALKING',
      stateTimer: 1.5,
      windupTimer: 0,
      homeX: x,
      homeY: y - 10,
      animTimer: 0,
      scaleX: 1,
      scaleY: 1,
      hitFlashTimer: 0,
      hp: 2,
      maxHp: 2,
      active: true,
      onGround: false,
    };
  }

  return {
    id,
    type,
    x,
    y,
    vx: -58 * speedMult,
    vy: 0,
    width: 28,
    height: type === 'KOOPA' ? 36 : 28,
    facing: -1,
    state: 'WALKING',
    stateTimer: 0,
    windupTimer: 0,
    homeX: x,
    homeY: y,
    animTimer: 0,
    scaleX: 1,
    scaleY: 1,
    hitFlashTimer: 0,
    hp: 1,
    maxHp: 1,
    active: true,
    onGround: false,
  };
}
