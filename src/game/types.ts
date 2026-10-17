export type GameState =
  | 'TITLE_MENU'
  | 'DIFFICULTY_SELECT'
  | 'WORLD_MAP'
  | 'HOW_TO_PLAY'
  | 'SETTINGS'
  | 'ACHIEVEMENTS'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'VICTORY'
  | 'GAME_OVER';

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export type PowerMode = 'SMALL' | 'SUPER' | 'FIRE';

export type WorldTheme =
  | 'VERDANT_HOLLOW'
  | 'CRYSTAL_CAVERNS'
  | 'EMBERFALL_PEAKS'
  | 'SKYROOT_CITADEL'
  | 'RUNEHEART_KEEP';

export type TileType =
  | 'EMPTY'
  | 'GROUND'
  | 'BRICK'
  | 'QUESTION_COIN'
  | 'QUESTION_POWERUP'
  | 'QUESTION_STAR'
  | 'QUESTION_1UP'
  | 'HIDDEN_1UP'
  | 'USED_BLOCK'
  | 'HARD_BLOCK'
  | 'PIPE_TOP_L'
  | 'PIPE_TOP_R'
  | 'PIPE_BODY_L'
  | 'PIPE_BODY_R'
  | 'BRIDGE'
  | 'LAVA_TOP'
  | 'LAVA_BODY'
  | 'AXE';

export interface InteractiveBlock {
  col: number;
  row: number;
  type: TileType;
  originalType: TileType;
  bumpOffset: number;
  bumpVelocity: number;
  coinsLeft: number;
  scaleX: number;
  scaleY: number;
}

export interface CheckpointMarker {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  activated: boolean;
}

export interface SecretRelic {
  id: number;
  index: number; // 0, 1, 2
  x: number;
  y: number;
  collected: boolean;
}

export interface WindZone {
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  powerMode: PowerMode;
  onGround: boolean;
  crouching: boolean;
  skidding: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpHeld: boolean;
  jumpsLeft: number;
  maxJumps: number;
  spinJumpTimer: number;
  invincibleTimer: number;
  starTimer: number;
  animFrame: number;
  animTimer: number;
  scaleX: number;
  scaleY: number;
  hitFlashTimer: number;
  fireCooldown: number;
  dead: boolean;
  deathTimer: number;
  flagSlide: boolean;
  flagReachBottom: boolean;
  comboCount: number;
}

export type ItemType = 'MUSHROOM' | 'FIRE_FLOWER' | 'STAR' | 'ONE_UP';

export interface PowerUpItem {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  emerging: boolean;
  emergeStartY: number;
  emergeTargetY: number;
  active: boolean;
}

export interface CoinCollectible {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  bobOffset: number;
}

export type EnemyType =
  | 'GOOMBA'
  | 'KOOPA'
  | 'PIRANHA'
  | 'BUZZY'
  | 'HAMMER_BRO'
  | 'THWOMP'
  | 'PODOBOO'
  | 'BOWSER';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  state:
    | 'WALKING'
    | 'SQUISHED'
    | 'SHELL_IDLE'
    | 'SHELL_MOVING'
    | ' KNOCKED_OUT'
    | 'PIRANHA_HIDDEN'
    | 'PIRANHA_WARN'
    | 'PIRANHA_UP'
    | 'THWOMP_IDLE'
    | 'THWOMP_WARN'
    | 'THWOMP_FALL'
    | 'THWOMP_GROUND'
    | 'THWOMP_RISE';
  stateTimer: number;
  windupTimer: number;
  homeX: number;
  homeY: number;
  animTimer: number;
  scaleX: number;
  scaleY: number;
  hitFlashTimer: number;
  hp: number;
  maxHp: number;
  active: boolean;
  onGround: boolean;
}

export interface FireBarHazard {
  x: number;
  y: number;
  angle: number;
  speed: number;
  segments: number;
}

export interface MovingPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Projectile {
  id: number;
  type: 'PLAYER_FIREBALL' | 'ENEMY_HAMMER' | 'BOWSER_FIRE';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  bounces: number;
  rotation: number;
  active: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  rotation: number;
  vRot: number;
  shape: 'SQUARE' | 'CIRCLE' | 'STAR' | 'BRICK';
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface StageClearSummary {
  levelId: number;
  worldLabel: string;
  levelTitle: string;
  score: number;
  shardsCollected: number;
  totalShardsInLevel: number;
  relicsFound: number;
  timeTaken: number;
  timeLeft: number;
  starsEarned: number;
  isNewBestScore: boolean;
  isNewBestTime: boolean;
  newlyUnlockedAchievements: string[];
}

export interface HudTelemetry {
  levelId: number;
  score: number;
  highScore: number;
  coins: number;
  totalCoinsInLevel: number;
  relicsFound: number;
  lives: number;
  worldIndex: number;
  worldLabel: string;
  worldTitle: string;
  timeLeft: number;
  powerMode: PowerMode;
  starActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  checkpointReached: boolean;
  difficulty: Difficulty;
}
