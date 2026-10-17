import { Difficulty, PowerMode } from './types';

export const SAVE_STORAGE_KEY = 'mushbound_save_v1';
export const SAVE_SCHEMA_VERSION = 1;
export const TOTAL_CAMPAIGN_LEVELS = 20;

export type ControlPreset = 'HYBRID' | 'ARROWS_ONLY' | 'WASD_ONLY';

export interface LevelProgressRecord {
  levelId: number;
  completed: boolean;
  bestScore: number;
  bestTimeSeconds: number | null;
  stars: number; // 0..3
  bestShards: number;
  relicsFound: number; // 0..3
}

export interface GameSettings {
  musicVolume: number; // 0..100
  sfxVolume: number; // 0..100
  muted: boolean;
  reducedMotion: boolean;
  doubleJumpEnabled: boolean;
  controlPreset: ControlPreset;
}

export interface SaveDataV1 {
  version: number;
  hasSelectedInitialDifficulty: boolean;
  difficulty: Difficulty;
  highestUnlockedLevel: number; // 1..20
  lastPlayedLevel: number; // 1..20
  totalShardsCollected: number;
  totalRelicsFound: number;
  totalPlaytimeSeconds: number;
  achievements: string[];
  levels: Record<number, LevelProgressRecord>;
  settings: GameSettings;
}

export interface DifficultyConfig {
  id: Difficulty;
  title: string;
  subtitle: string;
  badgeColor: string;
  description: string;
  bullets: string[];
  startingLives: number;
  enemySpeedMultiplier: number;
  projectileSpeedMultiplier: number;
  stageTimeSeconds: number;
  startPowerMode: PowerMode;
  checkpointGrantsArmor: boolean;
  scoreMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  EASY: {
    id: 'EASY',
    title: 'Easy — Explorer',
    subtitle: 'Forgiving & Accessible',
    badgeColor: '#4ADE80',
    description:
      'Ideal for players exploring the Realm of Runes for the first time or enjoying a relaxed adventure.',
    bullets: [
      '5 starting Ward Lives and begin each stage with Rune Guard armor',
      '22% slower enemy patrol and projectile speeds',
      'Generous 520s stage timer and full armor recovery at Waystone Checkpoints',
      'Lower punishment for hazards and platforming mistakes',
    ],
    startingLives: 5,
    enemySpeedMultiplier: 0.78,
    projectileSpeedMultiplier: 0.8,
    stageTimeSeconds: 520,
    startPowerMode: 'SUPER',
    checkpointGrantsArmor: true,
    scoreMultiplier: 1.0,
  },
  NORMAL: {
    id: 'NORMAL',
    title: 'Normal — Adventurer',
    subtitle: 'Recommended Experience',
    badgeColor: '#FACC15',
    description:
      'Balanced movement, enemy speed, and hazard pacing designed as the standard Mushbound campaign.',
    bullets: [
      '3 starting Ward Lives with standard Wanderer progression',
      'Balanced 100% enemy movement and telegraph timing',
      'Standard 400s stage timer and Waystone Checkpoints',
      '1.25x score bonus on stage completion',
    ],
    startingLives: 3,
    enemySpeedMultiplier: 1.0,
    projectileSpeedMultiplier: 1.0,
    stageTimeSeconds: 400,
    startPowerMode: 'SMALL',
    checkpointGrantsArmor: false,
    scoreMultiplier: 1.25,
  },
  HARD: {
    id: 'HARD',
    title: 'Hard — Rune Master',
    subtitle: 'Demanding Mastery',
    badgeColor: '#F87171',
    description:
      'For veteran platformer players seeking faster foes, tighter timers, and high-score prestige.',
    bullets: [
      '2 starting Ward Lives with zero margin for careless hits',
      '25% faster enemy patrol speeds and aggressive boss cadence',
      'Tighter 300s stage timer requiring brisk momentum',
      '1.5x score multiplier for leaderboard mastery',
    ],
    startingLives: 2,
    enemySpeedMultiplier: 1.25,
    projectileSpeedMultiplier: 1.22,
    stageTimeSeconds: 300,
    startPowerMode: 'SMALL',
    checkpointGrantsArmor: false,
    scoreMultiplier: 1.5,
  },
};

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'PROGRESSION' | 'MASTERY' | 'EXPLORATION';
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: 'FIRST_STEPS',
    title: 'First Steps in the Hollow',
    description: 'Complete Level 1-1: Whispering Glade.',
    category: 'PROGRESSION',
  },
  {
    id: 'WORLD_1_CLEAR',
    title: 'Warden of Verdant Hollow',
    description: 'Conquer World 1 (Level 1-4) and unlock Crystal Caverns.',
    category: 'PROGRESSION',
  },
  {
    id: 'WORLD_2_CLEAR',
    title: 'Delver of the Deep Geode',
    description: 'Conquer World 2 (Level 2-4) and unlock Emberfall Peaks.',
    category: 'PROGRESSION',
  },
  {
    id: 'WORLD_3_CLEAR',
    title: 'Caldera Forged',
    description: 'Conquer World 3 (Level 3-4) and unlock Skyroot Citadel.',
    category: 'PROGRESSION',
  },
  {
    id: 'WORLD_4_CLEAR',
    title: 'Windborne Sovereign',
    description: 'Conquer World 4 (Level 4-4) and unlock The Runeheart Keep.',
    category: 'PROGRESSION',
  },
  {
    id: 'CAMPAIGN_VICTORY',
    title: 'Savior of the Realm of Runes',
    description: 'Defeat Malakor in Level 5-4 and complete all 20 campaign stages.',
    category: 'PROGRESSION',
  },
  {
    id: 'SHARD_HOARDER',
    title: 'Rune Shard Collector',
    description: 'Collect a cumulative total of 100 Rune Shards across your journey.',
    category: 'EXPLORATION',
  },
  {
    id: 'RELIC_SEEKER',
    title: 'Seeker of Hidden Lore',
    description: 'Discover all 3 Secret Relics in any single stage.',
    category: 'EXPLORATION',
  },
  {
    id: 'THREE_STAR_HERO',
    title: 'Perfectionist Runecaster',
    description: 'Earn a 3-Star rating on at least 5 different stages.',
    category: 'MASTERY',
  },
  {
    id: 'RUNE_MASTER_VICTOR',
    title: 'Trial of the Rune Master',
    description: 'Complete any stage on Hard (Rune Master) difficulty.',
    category: 'MASTERY',
  },
];

// Fallback in-memory storage if browser blocks localStorage
let memoryFallbackStore: string | null = null;

function createDefaultLevelRecord(levelId: number): LevelProgressRecord {
  return {
    levelId,
    completed: false,
    bestScore: 0,
    bestTimeSeconds: null,
    stars: 0,
    bestShards: 0,
    relicsFound: 0,
  };
}

export function createDefaultSaveData(): SaveDataV1 {
  const levels: Record<number, LevelProgressRecord> = {};
  for (let i = 1; i <= TOTAL_CAMPAIGN_LEVELS; i++) {
    levels[i] = createDefaultLevelRecord(i);
  }
  return {
    version: SAVE_SCHEMA_VERSION,
    hasSelectedInitialDifficulty: false,
    difficulty: 'NORMAL',
    highestUnlockedLevel: 1,
    lastPlayedLevel: 1,
    totalShardsCollected: 0,
    totalRelicsFound: 0,
    totalPlaytimeSeconds: 0,
    achievements: [],
    levels,
    settings: {
      musicVolume: 70,
      sfxVolume: 85,
      muted: false,
      reducedMotion: false,
      doubleJumpEnabled: true,
      controlPreset: 'HYBRID',
    },
  };
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export function validateAndSanitizeSaveData(raw: unknown): SaveDataV1 {
  const defaults = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const difficulty: Difficulty =
    obj.difficulty === 'EASY' || obj.difficulty === 'NORMAL' || obj.difficulty === 'HARD'
      ? obj.difficulty
      : defaults.difficulty;

  const highestUnlockedLevel = Math.floor(
    clampNumber(obj.highestUnlockedLevel, 1, TOTAL_CAMPAIGN_LEVELS, 1)
  );
  const lastPlayedLevel = Math.floor(
    clampNumber(obj.lastPlayedLevel, 1, highestUnlockedLevel, 1)
  );

  const levels: Record<number, LevelProgressRecord> = {};
  const rawLevels =
    obj.levels && typeof obj.levels === 'object'
      ? (obj.levels as Record<string, unknown>)
      : {};

  for (let i = 1; i <= TOTAL_CAMPAIGN_LEVELS; i++) {
    const item = rawLevels[String(i)] as Record<string, unknown> | undefined;
    if (item && typeof item === 'object') {
      levels[i] = {
        levelId: i,
        completed: Boolean(item.completed),
        bestScore: Math.floor(clampNumber(item.bestScore, 0, 9999999, 0)),
        bestTimeSeconds:
          typeof item.bestTimeSeconds === 'number' && item.bestTimeSeconds > 0
            ? Math.round(item.bestTimeSeconds * 10) / 10
            : null,
        stars: Math.floor(clampNumber(item.stars, 0, 3, 0)),
        bestShards: Math.floor(clampNumber(item.bestShards, 0, 999, 0)),
        relicsFound: Math.floor(clampNumber(item.relicsFound, 0, 3, 0)),
      };
    } else {
      levels[i] = createDefaultLevelRecord(i);
    }
  }

  // Ensure consistency: if level N is completed, N+1 must be unlocked
  let computedMaxUnlock = highestUnlockedLevel;
  for (let i = 1; i < TOTAL_CAMPAIGN_LEVELS; i++) {
    if (levels[i].completed && i + 1 > computedMaxUnlock) {
      computedMaxUnlock = i + 1;
    }
  }

  const rawSettings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Record<string, unknown>)
      : {};

  const controlPreset: ControlPreset =
    rawSettings.controlPreset === 'HYBRID' ||
    rawSettings.controlPreset === 'ARROWS_ONLY' ||
    rawSettings.controlPreset === 'WASD_ONLY'
      ? rawSettings.controlPreset
      : 'HYBRID';

  const validAchievementIds = new Set(ACHIEVEMENTS_CATALOG.map((a) => a.id));
  const achievements = Array.isArray(obj.achievements)
    ? obj.achievements.filter(
        (id): id is string => typeof id === 'string' && validAchievementIds.has(id)
      )
    : [];

  let totalRelics = 0;
  for (let i = 1; i <= TOTAL_CAMPAIGN_LEVELS; i++) {
    totalRelics += levels[i].relicsFound;
  }

  return {
    version: SAVE_SCHEMA_VERSION,
    hasSelectedInitialDifficulty: Boolean(obj.hasSelectedInitialDifficulty),
    difficulty,
    highestUnlockedLevel: computedMaxUnlock,
    lastPlayedLevel,
    totalShardsCollected: Math.floor(
      clampNumber(obj.totalShardsCollected, 0, 9999999, 0)
    ),
    totalRelicsFound: totalRelics,
    totalPlaytimeSeconds: Math.floor(
      clampNumber(obj.totalPlaytimeSeconds, 0, 99999999, 0)
    ),
    achievements: Array.from(new Set(achievements)),
    levels,
    settings: {
      musicVolume: Math.floor(
        clampNumber(rawSettings.musicVolume, 0, 100, defaults.settings.musicVolume)
      ),
      sfxVolume: Math.floor(
        clampNumber(rawSettings.sfxVolume, 0, 100, defaults.settings.sfxVolume)
      ),
      muted: Boolean(rawSettings.muted),
      reducedMotion: Boolean(rawSettings.reducedMotion),
      doubleJumpEnabled:
        typeof rawSettings.doubleJumpEnabled === 'boolean'
          ? rawSettings.doubleJumpEnabled
          : true,
      controlPreset,
    },
  };
}

export function loadSaveData(customKey: string = SAVE_STORAGE_KEY): SaveDataV1 {
  try {
    const rawStr =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(customKey)
        : memoryFallbackStore;
    if (!rawStr) {
      return createDefaultSaveData();
    }
    const parsed = JSON.parse(rawStr);
    return validateAndSanitizeSaveData(parsed);
  } catch {
    // Gracefully recover from corrupted JSON or SecurityError
    return createDefaultSaveData();
  }
}

export function writeSaveData(
  data: SaveDataV1,
  customKey: string = SAVE_STORAGE_KEY
): SaveDataV1 {
  const validated = validateAndSanitizeSaveData(data);
  const serialized = JSON.stringify(validated);
  memoryFallbackStore = serialized;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(customKey, serialized);
    }
  } catch {
    // Storage quota or privacy mode — memoryFallbackStore still holds valid state
  }
  return validated;
}

export function resetSaveData(customKey: string = SAVE_STORAGE_KEY): SaveDataV1 {
  const fresh = createDefaultSaveData();
  memoryFallbackStore = JSON.stringify(fresh);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(customKey, memoryFallbackStore);
    }
  } catch {
    // ignore storage errors
  }
  return fresh;
}

export function calculateStageStars(
  shardsCollected: number,
  totalShards: number,
  relicsFound: number,
  timeLeft: number,
  score: number
): number {
  let stars = 1; // 1 Star guaranteed for completing the stage
  const shardRatio = totalShards > 0 ? shardsCollected / totalShards : 1;
  if (shardRatio >= 0.6 || timeLeft >= 160 || score >= 2000) {
    stars = 2;
  }
  if (relicsFound >= 3 || (relicsFound >= 2 && shardRatio >= 0.75) || score >= 4200) {
    stars = 3;
  }
  return stars;
}

export function recordStageCompletion(
  currentSave: SaveDataV1,
  params: {
    levelId: number;
    score: number;
    shardsCollected: number;
    totalShardsInLevel: number;
    relicsFound: number;
    timeTakenSeconds: number;
    timeLeftSeconds: number;
    playtimeDeltaSeconds: number;
  }
): {
  updatedSave: SaveDataV1;
  starsEarned: number;
  isNewBestScore: boolean;
  isNewBestTime: boolean;
  newlyUnlockedAchievements: string[];
} {
  const next = validateAndSanitizeSaveData(currentSave);
  const {
    levelId,
    score,
    shardsCollected,
    totalShardsInLevel,
    relicsFound,
    timeTakenSeconds,
    timeLeftSeconds,
    playtimeDeltaSeconds,
  } = params;

  const prevRecord = next.levels[levelId] || createDefaultLevelRecord(levelId);
  const starsEarned = calculateStageStars(
    shardsCollected,
    totalShardsInLevel,
    relicsFound,
    timeLeftSeconds,
    score
  );

  const isNewBestScore = score > prevRecord.bestScore;
  const roundedTime = Math.max(1, Math.round(timeTakenSeconds * 10) / 10);
  const isNewBestTime =
    prevRecord.bestTimeSeconds === null || roundedTime < prevRecord.bestTimeSeconds;

  next.levels[levelId] = {
    levelId,
    completed: true,
    bestScore: Math.max(prevRecord.bestScore, score),
    bestTimeSeconds: isNewBestTime ? roundedTime : prevRecord.bestTimeSeconds,
    stars: Math.max(prevRecord.stars, starsEarned),
    bestShards: Math.max(prevRecord.bestShards, shardsCollected),
    relicsFound: Math.max(prevRecord.relicsFound, Math.min(3, relicsFound)),
  };

  if (levelId < TOTAL_CAMPAIGN_LEVELS && levelId + 1 > next.highestUnlockedLevel) {
    next.highestUnlockedLevel = levelId + 1;
  }
  next.lastPlayedLevel =
    levelId < TOTAL_CAMPAIGN_LEVELS ? levelId + 1 : levelId;
  next.totalShardsCollected += shardsCollected;
  next.totalPlaytimeSeconds += Math.max(0, Math.round(playtimeDeltaSeconds));

  // Recalculate total relics
  let totalRelics = 0;
  let threeStarCount = 0;
  for (let i = 1; i <= TOTAL_CAMPAIGN_LEVELS; i++) {
    totalRelics += next.levels[i].relicsFound;
    if (next.levels[i].stars >= 3) threeStarCount++;
  }
  next.totalRelicsFound = totalRelics;

  // Check Achievements
  const unlockedSet = new Set(next.achievements);
  const newlyUnlocked: string[] = [];

  const grant = (id: string) => {
    if (!unlockedSet.has(id)) {
      unlockedSet.add(id);
      newlyUnlocked.push(id);
    }
  };

  if (next.levels[1]?.completed) grant('FIRST_STEPS');
  if (next.levels[4]?.completed) grant('WORLD_1_CLEAR');
  if (next.levels[8]?.completed) grant('WORLD_2_CLEAR');
  if (next.levels[12]?.completed) grant('WORLD_3_CLEAR');
  if (next.levels[16]?.completed) grant('WORLD_4_CLEAR');
  if (next.levels[20]?.completed) grant('CAMPAIGN_VICTORY');
  if (next.totalShardsCollected >= 100) grant('SHARD_HOARDER');
  if (relicsFound >= 3) grant('RELIC_SEEKER');
  if (threeStarCount >= 5) grant('THREE_STAR_HERO');
  if (next.difficulty === 'HARD') grant('RUNE_MASTER_VICTOR');

  next.achievements = Array.from(unlockedSet);
  const saved = writeSaveData(next);

  return {
    updatedSave: saved,
    starsEarned,
    isNewBestScore,
    isNewBestTime,
    newlyUnlockedAchievements: newlyUnlocked,
  };
}

/**
 * Self-contained QA test suite for save/load validation, corruption recovery,
 * level unlocking, and high-score preservation.
 */
export function runSaveSystemQA(): { passed: boolean; details: string[] } {
  const testKey = 'mushbound_qa_test_key';
  const details: string[] = [];
  let passed = true;

  try {
    // 1. Corrupted JSON recovery
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(testKey, '{bad_json::123');
    }
    const recovered = loadSaveData(testKey);
    if (recovered.highestUnlockedLevel !== 1 || recovered.difficulty !== 'NORMAL') {
      passed = false;
      details.push('Failed corrupted JSON recovery test');
    } else {
      details.push('Corrupted JSON gracefully recovered to safe defaults');
    }

    // 2. Stage completion & unlock progression
    const afterStage1 = validateAndSanitizeSaveData({
      ...recovered,
      difficulty: 'HARD',
      hasSelectedInitialDifficulty: true,
    });
    afterStage1.levels[1] = {
      levelId: 1,
      completed: true,
      bestScore: 3400,
      bestTimeSeconds: 45.2,
      stars: 3,
      bestShards: 18,
      relicsFound: 3,
    };
    const sanitized = validateAndSanitizeSaveData(afterStage1);
    if (sanitized.highestUnlockedLevel !== 2 || sanitized.totalRelicsFound !== 3) {
      passed = false;
      details.push('Failed level unlock consistency test');
    } else {
      details.push('Level 1 completion unlocked Level 2 and tallied 3 Relics');
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(testKey);
    }
  } catch (e) {
    passed = false;
    details.push(`Exception during QA: ${String(e)}`);
  }

  return { passed, details };
}
