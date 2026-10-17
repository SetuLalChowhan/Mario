import React, { useEffect, useRef } from 'react';
import {
  buildLevel,
  LevelData,
  TILE_SIZE,
} from './levels';
import { renderGameWorld } from './renderer';
import { sound } from './sound';
import {
  ControlPreset,
  DIFFICULTY_CONFIGS,
  GameSettings,
  TOTAL_CAMPAIGN_LEVELS,
} from './storage';
import {
  Difficulty,
  FloatingText,
  GameState,
  HudTelemetry,
  Particle,
  Player,
  PowerMode,
  PowerUpItem,
  Projectile,
  TileType,
} from './types';

export interface StageFinishPayload {
  levelId: number;
  worldLabel: string;
  levelTitle: string;
  score: number;
  shardsCollected: number;
  totalShardsInLevel: number;
  relicsFound: number;
  timeTakenSeconds: number;
  timeLeftSeconds: number;
  isFinalCampaignStage: boolean;
}

export interface GameControllerRef {
  startStage: (levelId: number, difficultyOverride?: Difficulty) => void;
  resumeGame: () => void;
  togglePause: () => void;
  nextStage: () => void;
  triggerTouchInput: (
    action: 'left' | 'right' | 'jump' | 'fire',
    pressed: boolean
  ) => void;
}

interface GameCanvasProps {
  gameState: GameState;
  difficulty: Difficulty;
  settings: GameSettings;
  onStateChange: (newState: GameState) => void;
  onHudUpdate: (hud: HudTelemetry) => void;
  onStageComplete: (payload: StageFinishPayload) => void;
  controllerRef: React.MutableRefObject<GameControllerRef | null>;
}

const SOLID_TILES = new Set<TileType>([
  'GROUND',
  'BRICK',
  'QUESTION_COIN',
  'QUESTION_POWERUP',
  'QUESTION_STAR',
  'QUESTION_1UP',
  'USED_BLOCK',
  'HARD_BLOCK',
  'PIPE_TOP_L',
  'PIPE_TOP_R',
  'PIPE_BODY_L',
  'PIPE_BODY_R',
  'BRIDGE',
]);

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  difficulty,
  settings,
  onStateChange,
  onHudUpdate,
  onStageComplete,
  controllerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const difficultyRef = useRef<Difficulty>(difficulty);
  const settingsRef = useRef<GameSettings>(settings);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Input State (Separated Held vs Edge-Triggered JustPressed)
    const held = {
      left: false,
      right: false,
      down: false,
      jump: false,
      sprint: false,
    };
    const justPressed = {
      jump: false,
      fire: false,
      pause: false,
    };

    let prevGamepadJump = false;
    let prevGamepadFire = false;
    let prevGamepadPause = false;

    const clearKeys = () => {
      held.left = false;
      held.right = false;
      held.down = false;
      held.jump = false;
      held.sprint = false;
      justPressed.jump = false;
      justPressed.fire = false;
      justPressed.pause = false;
    };

    const isKeyAllowedByPreset = (
      code: string,
      preset: ControlPreset
    ): boolean => {
      if (preset === 'ARROWS_ONLY') {
        return !['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code);
      }
      if (preset === 'WASD_ONLY') {
        return !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
          code
        );
      }
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }
      if (e.repeat) return;

      const preset = settingsRef.current.controlPreset;
      if (!isKeyAllowedByPreset(code, preset)) return;

      if (code === 'ArrowLeft' || code === 'KeyA') held.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') held.right = true;
      if (code === 'ArrowDown' || code === 'KeyS') held.down = true;
      if (
        code === 'ArrowUp' ||
        code === 'Space' ||
        code === 'KeyW' ||
        code === 'KeyK'
      ) {
        held.jump = true;
        justPressed.jump = true;
      }
      if (
        code === 'ShiftLeft' ||
        code === 'ShiftRight' ||
        code === 'KeyZ' ||
        code === 'KeyJ' ||
        code === 'KeyX'
      ) {
        held.sprint = true;
        justPressed.fire = true;
      }
      if (code === 'Escape' || code === 'KeyP') {
        justPressed.pause = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') held.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') held.right = false;
      if (code === 'ArrowDown' || code === 'KeyS') held.down = false;
      if (
        code === 'ArrowUp' ||
        code === 'Space' ||
        code === 'KeyW' ||
        code === 'KeyK'
      ) {
        held.jump = false;
      }
      if (
        code === 'ShiftLeft' ||
        code === 'ShiftRight' ||
        code === 'KeyZ' ||
        code === 'KeyJ' ||
        code === 'KeyX'
      ) {
        held.sprint = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearKeys();
        if (gameStateRef.current === 'PLAYING') {
          onStateChange('PAUSED');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Pooled Particles & Floating Texts
    const PARTICLE_POOL_SIZE = 180;
    const particles: Particle[] = Array.from(
      { length: PARTICLE_POOL_SIZE },
      () => ({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 6,
        color: '#FFFFFF',
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        gravity: 600,
        rotation: 0,
        vRot: 0,
        shape: 'SQUARE',
      })
    );

    const TEXT_POOL_SIZE = 32;
    const floatingTexts: FloatingText[] = Array.from(
      { length: TEXT_POOL_SIZE },
      () => ({
        active: false,
        x: 0,
        y: 0,
        vy: -50,
        text: '',
        color: '#FFFFFF',
        life: 0,
        maxLife: 0.8,
      })
    );

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      color: string,
      shape: Particle['shape'] = 'SQUARE',
      speed: number = 180,
      size: number = 6,
      gravity: number = 700
    ) => {
      const effectiveCount = settingsRef.current.reducedMotion
        ? Math.ceil(count * 0.4)
        : count;
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < effectiveCount; i++) {
        const p = particles[i];
        if (!p.active) {
          const angle = Math.random() * Math.PI * 2;
          const mag = (0.35 + Math.random() * 0.65) * speed;
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(angle) * mag;
          p.vy = Math.sin(angle) * mag - 90;
          p.size = size;
          p.color = color;
          p.alpha = 1;
          p.maxLife = 0.35 + Math.random() * 0.3;
          p.life = p.maxLife;
          p.gravity = gravity;
          p.rotation = Math.random() * Math.PI;
          p.vRot = (Math.random() - 0.5) * 12;
          p.shape = shape;
          spawned++;
        }
      }
    };

    const spawnFloatingText = (
      x: number,
      y: number,
      text: string,
      color: string = '#FEF08A'
    ) => {
      for (const ft of floatingTexts) {
        if (!ft.active) {
          ft.active = true;
          ft.x = x;
          ft.y = y;
          ft.vy = -65;
          ft.text = text;
          ft.color = color;
          ft.maxLife = 0.85;
          ft.life = ft.maxLife;
          break;
        }
      }
    };

    // Mutable Simulation State
    let currentLevelId = 1;
    let activeDifficulty: Difficulty = difficultyRef.current;
    let level: LevelData = buildLevel(1, activeDifficulty);
    let score = 0;
    let highScore = 0;
    let shardsCount = 0;
    let relicsCount = 0;
    let lives = DIFFICULTY_CONFIGS[activeDifficulty].startingLives;
    let stageStartTime = DIFFICULTY_CONFIGS[activeDifficulty].stageTimeSeconds;
    let timeLeft = stageStartTime;
    let stageElapsedSeconds = 0;
    let cameraX = 0;
    let shakeIntensity = 0;
    let hitstopTimer = 0;
    let elapsed = 0;
    let flagY = 3 * TILE_SIZE + 8;
    let bridgeCollapsing = false;
    let bridgeCollapseTimer = 0;
    let stageFinishedLock = false;
    let nextEntityId = 1000;
    let hudSyncTimer = 0;

    const items: PowerUpItem[] = [];
    const projectiles: Projectile[] = [];

    const createPlayer = (
      spawnX: number,
      spawnY: number,
      mode: PowerMode
    ): Player => {
      const isBig = mode !== 'SMALL';
      const maxJumps = settingsRef.current.doubleJumpEnabled ? 2 : 1;
      return {
        x: spawnX,
        y: spawnY - (isBig ? 44 : 30),
        vx: 0,
        vy: 0,
        width: 24,
        height: isBig ? 44 : 30,
        facing: 1,
        powerMode: mode,
        onGround: false,
        crouching: false,
        skidding: false,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        jumpHeld: false,
        jumpsLeft: maxJumps,
        maxJumps,
        spinJumpTimer: 0,
        invincibleTimer: 0,
        starTimer: 0,
        animFrame: 0,
        animTimer: 0,
        scaleX: 1,
        scaleY: 1,
        hitFlashTimer: 0,
        fireCooldown: 0,
        dead: false,
        deathTimer: 0,
        flagSlide: false,
        flagReachBottom: false,
        comboCount: 0,
      };
    };

    let player: Player = createPlayer(
      3.5 * TILE_SIZE,
      14 * TILE_SIZE,
      DIFFICULTY_CONFIGS[activeDifficulty].startPowerMode
    );

    const syncHud = () => {
      if (score > highScore) highScore = score;
      const boss = level.enemies.find((e) => e.active && e.type === 'BOWSER');
      onHudUpdate({
        levelId: currentLevelId,
        score,
        highScore,
        coins: shardsCount,
        totalCoinsInLevel: level.coins.length,
        relicsFound: relicsCount,
        lives,
        worldIndex: level.worldIndex,
        worldLabel: level.worldLabel,
        worldTitle: level.worldTitle,
        timeLeft: Math.max(0, Math.ceil(timeLeft)),
        powerMode: player.powerMode,
        starActive: player.starTimer > 0,
        bossHp: boss ? boss.hp : 0,
        bossMaxHp: boss ? boss.maxHp : 0,
        bossName: level.bossName,
        checkpointReached: level.checkpoint.activated,
        difficulty: activeDifficulty,
      });
    };

    const loadStage = (
      levelId: number,
      preservePower: boolean,
      respawnAtCheckpoint: boolean = false
    ) => {
      clearKeys();
      currentLevelId = Math.max(1, Math.min(TOTAL_CAMPAIGN_LEVELS, levelId));
      activeDifficulty = difficultyRef.current;
      const diffCfg = DIFFICULTY_CONFIGS[activeDifficulty];

      if (!respawnAtCheckpoint) {
        level = buildLevel(currentLevelId, activeDifficulty);
        shardsCount = 0;
        relicsCount = 0;
        stageElapsedSeconds = 0;
      }

      items.length = 0;
      projectiles.length = 0;
      for (const p of particles) p.active = false;
      for (const ft of floatingTexts) ft.active = false;

      const desiredPower: PowerMode = preservePower
        ? player.powerMode
        : respawnAtCheckpoint && diffCfg.checkpointGrantsArmor
        ? 'SUPER'
        : diffCfg.startPowerMode;

      const spawnX =
        respawnAtCheckpoint && level.checkpoint.activated
          ? level.checkpoint.x
          : 3.5 * TILE_SIZE;
      const spawnY = 14 * TILE_SIZE;

      player = createPlayer(spawnX, spawnY, desiredPower);
      cameraX = Math.max(0, spawnX - 180);
      stageStartTime = diffCfg.stageTimeSeconds;
      timeLeft = stageStartTime;
      flagY = 3 * TILE_SIZE + 8;
      bridgeCollapsing = false;
      bridgeCollapseTimer = 0;
      stageFinishedLock = false;
      shakeIntensity = 0;
      hitstopTimer = 0;
      syncHud();
    };

    const completeCurrentStage = () => {
      if (stageFinishedLock) return;
      stageFinishedLock = true;
      const diffCfg = DIFFICULTY_CONFIGS[activeDifficulty];
      const timeBonus = Math.round(timeLeft * 10 * diffCfg.scoreMultiplier);
      score += timeBonus;
      syncHud();

      const payload: StageFinishPayload = {
        levelId: currentLevelId,
        worldLabel: level.worldLabel,
        levelTitle: level.worldTitle,
        score,
        shardsCollected: shardsCount,
        totalShardsInLevel: Math.max(1, level.coins.length),
        relicsFound: relicsCount,
        timeTakenSeconds: Math.max(1, stageElapsedSeconds),
        timeLeftSeconds: Math.max(0, Math.ceil(timeLeft)),
        isFinalCampaignStage: currentLevelId >= TOTAL_CAMPAIGN_LEVELS,
      };
      onStageComplete(payload);
    };

    controllerRef.current = {
      startStage: (levelId: number, difficultyOverride?: Difficulty) => {
        clearKeys();
        if (difficultyOverride) {
          difficultyRef.current = difficultyOverride;
        }
        activeDifficulty = difficultyRef.current;
        const diffCfg = DIFFICULTY_CONFIGS[activeDifficulty];
        score = 0;
        lives = diffCfg.startingLives;
        player.powerMode = diffCfg.startPowerMode;
        loadStage(levelId, false, false);
        sound.startMusic(level.theme);
        onStateChange('PLAYING');
      },
      resumeGame: () => {
        clearKeys();
        onStateChange('PLAYING');
      },
      togglePause: () => {
        if (gameStateRef.current === 'PLAYING') {
          onStateChange('PAUSED');
        } else if (gameStateRef.current === 'PAUSED') {
          onStateChange('PLAYING');
        }
      },
      nextStage: () => {
        if (currentLevelId < TOTAL_CAMPAIGN_LEVELS) {
          loadStage(currentLevelId + 1, true, false);
          sound.startMusic(level.theme);
          onStateChange('PLAYING');
        } else {
          onStateChange('VICTORY');
        }
      },
      triggerTouchInput: (action, pressed) => {
        if (action === 'left') held.left = pressed;
        if (action === 'right') held.right = pressed;
        if (action === 'jump') {
          held.jump = pressed;
          if (pressed) justPressed.jump = true;
        }
        if (action === 'fire') {
          held.sprint = pressed;
          if (pressed) justPressed.fire = true;
        }
      },
    };

    const addShard = (x: number, y: number) => {
      shardsCount++;
      score += 200;
      sound.playCoin();
      spawnParticles(x, y, 8, '#38BDF8', 'CIRCLE', 150, 5, 500);
      if (shardsCount % 50 === 0) {
        lives++;
        sound.playOneUp();
        spawnFloatingText(player.x + 12, player.y - 10, '+1 WARD', '#34D399');
      }
    };

    const applyPowerMode = (newMode: PowerMode) => {
      const oldHeight = player.height;
      player.powerMode = newMode;
      player.height = newMode === 'SMALL' ? 30 : 44;
      player.y -= player.height - oldHeight;
      player.scaleX = 1.3;
      player.scaleY = 0.75;
      player.hitFlashTimer = 0.18;
    };

    const triggerCameraShake = (amount: number) => {
      if (settingsRef.current.reducedMotion) return;
      shakeIntensity = amount;
    };

    const damagePlayer = () => {
      if (player.invincibleTimer > 0 || player.starTimer > 0 || player.dead) {
        return;
      }

      if (player.powerMode === 'FIRE') {
        sound.playPowerDown();
        applyPowerMode('SUPER');
        player.invincibleTimer = 2.0;
        hitstopTimer = 0.06;
        triggerCameraShake(5);
      } else if (player.powerMode === 'SUPER') {
        sound.playPowerDown();
        applyPowerMode('SMALL');
        player.invincibleTimer = 2.0;
        hitstopTimer = 0.06;
        triggerCameraShake(5);
      } else {
        killPlayer();
      }
    };

    const killPlayer = () => {
      if (player.dead) return;
      if (gameStateRef.current !== 'PLAYING') return;

      player.dead = true;
      player.deathTimer = 1.85;
      player.vy = -480;
      player.vx = 0;
      hitstopTimer = 0.08;
      triggerCameraShake(8);
      sound.stopMusic();
      sound.playGameOver();
    };

    const triggerBlockHit = (col: number, row: number) => {
      const tile = level.grid[row]?.[col];
      if (!tile || tile === 'EMPTY') return;

      const key = `${col},${row}`;
      let block = level.blocks.get(key);
      if (!block) {
        block = {
          col,
          row,
          type: tile,
          originalType: tile,
          bumpOffset: 0,
          bumpVelocity: 0,
          coinsLeft: 1,
          scaleX: 1,
          scaleY: 1,
        };
        level.blocks.set(key, block);
      }

      const worldX = col * TILE_SIZE + TILE_SIZE / 2;
      const worldY = row * TILE_SIZE;

      for (const enemy of level.enemies) {
        if (
          !enemy.active ||
          enemy.type === 'PIRANHA' ||
          enemy.type === 'THWOMP'
        )
          continue;
        const eCenter = enemy.x + enemy.width / 2;
        const eBottom = enemy.y + enemy.height;
        if (
          Math.abs(eCenter - worldX) < TILE_SIZE * 0.85 &&
          Math.abs(eBottom - worldY) < 12
        ) {
          enemy.state = ' KNOCKED_OUT';
          enemy.vy = -360;
          enemy.vx = player.facing * 90;
          score += 200;
          sound.playKick();
          spawnFloatingText(enemy.x, enemy.y, '200', '#FEF08A');
        }
      }

      if (tile === 'USED_BLOCK' || tile === 'HARD_BLOCK') {
        sound.playBump();
        block.bumpOffset = -4;
        block.bumpVelocity = 60;
        return;
      }

      block.bumpOffset = -10;
      block.bumpVelocity = 120;
      block.scaleX = 1.18;
      block.scaleY = 0.84;

      if (tile === 'BRICK') {
        if (player.powerMode !== 'SMALL') {
          level.grid[row][col] = 'EMPTY';
          level.blocks.delete(key);
          sound.playBrickSmash();
          score += 50;
          hitstopTimer = 0.035;
          triggerCameraShake(4);
          spawnParticles(
            worldX,
            worldY + 16,
            10,
            '#38BDF8',
            'BRICK',
            260,
            10,
            850
          );
        } else {
          sound.playBump();
        }
      } else if (tile === 'QUESTION_COIN') {
        addShard(worldX, worldY - 8);
        spawnFloatingText(worldX, worldY - 14, '+200', '#38BDF8');
        block.coinsLeft--;
        if (block.coinsLeft <= 0) {
          level.grid[row][col] = 'USED_BLOCK';
          block.type = 'USED_BLOCK';
        }
      } else if (
        tile === 'QUESTION_POWERUP' ||
        tile === 'QUESTION_STAR' ||
        tile === 'QUESTION_1UP' ||
        tile === 'HIDDEN_1UP'
      ) {
        level.grid[row][col] = 'USED_BLOCK';
        block.type = 'USED_BLOCK';
        sound.playPowerUpAppear();

        const itemType =
          tile === 'QUESTION_STAR'
            ? 'STAR'
            : tile === 'QUESTION_1UP' || tile === 'HIDDEN_1UP'
            ? 'ONE_UP'
            : player.powerMode === 'SMALL'
            ? 'MUSHROOM'
            : 'FIRE_FLOWER';

        items.push({
          id: nextEntityId++,
          type: itemType,
          x: col * TILE_SIZE + 4,
          y: row * TILE_SIZE + 4,
          vx: itemType === 'FIRE_FLOWER' ? 0 : 75,
          vy: 0,
          width: 24,
          height: 24,
          emerging: true,
          emergeStartY: row * TILE_SIZE + 4,
          emergeTargetY: (row - 1) * TILE_SIZE + 8,
          active: true,
        });
      }
    };

    const isSolidAt = (col: number, row: number): boolean => {
      if (row < 0) return false;
      if (row >= level.rows || col < 0 || col >= level.cols) return false;
      return SOLID_TILES.has(level.grid[row][col]);
    };

    const pollGamepad = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const pad = pads?.[0];
      if (!pad) return;

      const axisX = pad.axes[0] || 0;
      const dpadLeft = pad.buttons[14]?.pressed;
      const dpadRight = pad.buttons[15]?.pressed;
      const btnJump = pad.buttons[0]?.pressed || pad.buttons[1]?.pressed;
      const btnFire = pad.buttons[2]?.pressed || pad.buttons[3]?.pressed;
      const btnPause = pad.buttons[9]?.pressed;

      if (axisX < -0.35 || dpadLeft) held.left = true;
      else if (axisX > 0.35 || dpadRight) held.right = true;

      if (btnJump && !prevGamepadJump) {
        held.jump = true;
        justPressed.jump = true;
      } else if (!btnJump && prevGamepadJump) {
        held.jump = false;
      }
      prevGamepadJump = Boolean(btnJump);

      if (btnFire && !prevGamepadFire) {
        held.sprint = true;
        justPressed.fire = true;
      } else if (!btnFire && prevGamepadFire) {
        held.sprint = false;
      }
      prevGamepadFire = Boolean(btnFire);

      if (btnPause && !prevGamepadPause) {
        justPressed.pause = true;
      }
      prevGamepadPause = Boolean(btnPause);
    };

    const updateSimulation = (dt: number) => {
      elapsed += dt;
      pollGamepad();

      if (justPressed.pause) {
        justPressed.pause = false;
        if (gameStateRef.current === 'PLAYING') {
          onStateChange('PAUSED');
          return;
        } else if (gameStateRef.current === 'PAUSED') {
          onStateChange('PLAYING');
          return;
        }
      }

      if (gameStateRef.current !== 'PLAYING') {
        return;
      }

      if (shakeIntensity > 0) {
        shakeIntensity = Math.max(0, shakeIntensity - dt * 28);
      }

      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
        return;
      }

      stageElapsedSeconds += dt;
      timeLeft -= dt * 1.25;
      if (timeLeft <= 0 && !player.dead) {
        timeLeft = 0;
        killPlayer();
      }

      // Update bumped blocks
      for (const block of level.blocks.values()) {
        if (block.bumpOffset < 0 || block.bumpVelocity !== 0) {
          block.bumpOffset += block.bumpVelocity * dt;
          if (block.bumpOffset >= 0) {
            block.bumpOffset = 0;
            block.bumpVelocity = 0;
          }
        }
        block.scaleX += (1 - block.scaleX) * Math.min(1, dt * 14);
        block.scaleY += (1 - block.scaleY) * Math.min(1, dt * 14);
      }

      // Handle Boss Bridge Collapse Sequence
      if (bridgeCollapsing) {
        bridgeCollapseTimer += dt;
        if (bridgeCollapseTimer >= 0.05) {
          bridgeCollapseTimer = 0;
          const colToDrop = level.bridgeCols.pop();
          if (colToDrop !== undefined) {
            level.grid[12][colToDrop] = 'EMPTY';
            sound.playBump();
            triggerCameraShake(3.5);
            spawnParticles(
              colToDrop * TILE_SIZE + 16,
              12 * TILE_SIZE + 8,
              6,
              '#38BDF8',
              'BRICK',
              140,
              8,
              600
            );
          } else {
            bridgeCollapsing = false;
            for (const e of level.enemies) {
              if (e.active && e.type === 'BOWSER') {
                e.state = ' KNOCKED_OUT';
                e.vy = 180;
              }
            }
            sound.playStageClear();
            setTimeout(() => {
              completeCurrentStage();
            }, 950);
          }
        }
        return;
      }

      // Handle Rune Obelisk Slide Sequence
      if (player.flagSlide) {
        const bottomTargetY = 12 * TILE_SIZE - player.height;
        if (player.y < bottomTargetY) {
          player.y = Math.min(bottomTargetY, player.y + 220 * dt);
        }
        if (flagY < 11.5 * TILE_SIZE) {
          flagY = Math.min(11.5 * TILE_SIZE, flagY + 240 * dt);
        }
        if (player.y >= bottomTargetY && flagY >= 11.5 * TILE_SIZE) {
          if (!player.flagReachBottom) {
            player.flagReachBottom = true;
            setTimeout(() => {
              completeCurrentStage();
            }, 600);
          }
          const gateDoorX = (level.castleCol + 2.2) * TILE_SIZE;
          if (player.x < gateDoorX) {
            player.x += 120 * dt;
            player.facing = 1;
            player.onGround = true;
          }
        }
        return;
      }

      // Handle Player Death & Checkpoint Respawn
      if (player.dead) {
        player.vy += 1100 * dt;
        player.y += player.vy * dt;
        player.deathTimer -= dt;
        if (player.deathTimer <= 0) {
          lives--;
          if (lives <= 0) {
            onStateChange('GAME_OVER');
          } else {
            // Respawn at Waystone Checkpoint if activated!
            loadStage(currentLevelId, false, level.checkpoint.activated);
            sound.startMusic(level.theme);
          }
        }
        return;
      }

      // Player Timers
      if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
      if (player.starTimer > 0) player.starTimer -= dt;
      if (player.hitFlashTimer > 0) player.hitFlashTimer -= dt;
      if (player.fireCooldown > 0) player.fireCooldown -= dt;
      if (player.spinJumpTimer > 0) {
        player.spinJumpTimer = Math.max(0, player.spinJumpTimer - dt);
      }

      player.scaleX += (1 - player.scaleX) * Math.min(1, dt * 15);
      player.scaleY += (1 - player.scaleY) * Math.min(1, dt * 15);

      player.maxJumps = settingsRef.current.doubleJumpEnabled ? 2 : 1;

      if (player.onGround) {
        player.coyoteTimer = 0.1;
        player.jumpsLeft = player.maxJumps;
        player.spinJumpTimer = 0;
        player.comboCount = 0;
      } else {
        player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
      }

      if (justPressed.jump) {
        player.jumpBufferTimer = 0.15;
        justPressed.jump = false;
      } else {
        player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
      }

      // Arcane Bolt Casting
      if (justPressed.fire) {
        justPressed.fire = false;
        if (player.powerMode === 'FIRE' && player.fireCooldown <= 0) {
          const activeBolts = projectiles.filter(
            (p) => p.active && p.type === 'PLAYER_FIREBALL'
          ).length;
          if (activeBolts < 2) {
            player.fireCooldown = 0.22;
            sound.playFireball();
            projectiles.push({
              id: nextEntityId++,
              type: 'PLAYER_FIREBALL',
              x:
                player.facing === 1
                  ? player.x + player.width + 2
                  : player.x - 12,
              y: player.y + player.height * 0.38,
              vx: player.facing * 390,
              vy: 140,
              width: 12,
              height: 12,
              bounces: 0,
              rotation: 0,
              active: true,
            });
          }
        }
      }

      // Horizontal Movement
      const maxSpeed = held.sprint ? 275 : 195;
      const accel = player.onGround ? (held.sprint ? 980 : 760) : 520;
      const friction = player.onGround ? 820 : 220;

      player.skidding = false;
      if (held.left && !held.right) {
        if (player.vx > 40 && player.onGround) {
          player.skidding = true;
          player.vx -= 1350 * dt;
        } else {
          player.vx = Math.max(-maxSpeed, player.vx - accel * dt);
        }
        player.facing = -1;
      } else if (held.right && !held.left) {
        if (player.vx < -40 && player.onGround) {
          player.skidding = true;
          player.vx += 1350 * dt;
        } else {
          player.vx = Math.min(maxSpeed, player.vx + accel * dt);
        }
        player.facing = 1;
      } else {
        if (player.vx > 0) {
          player.vx = Math.max(0, player.vx - friction * dt);
        } else if (player.vx < 0) {
          player.vx = Math.min(0, player.vx + friction * dt);
        }
      }

      // 1st Press (Ground Jump) & 2nd Press (Double Jump)
      if (player.jumpBufferTimer > 0) {
        if (player.coyoteTimer > 0) {
          const speedBonus = Math.abs(player.vx) > 210 ? 45 : 0;
          player.vy = -520 - speedBonus;
          player.onGround = false;
          player.coyoteTimer = 0;
          player.jumpBufferTimer = 0;
          player.jumpsLeft = player.maxJumps - 1;
          player.jumpHeld = true;
          player.scaleX = 0.8;
          player.scaleY = 1.24;
          sound.playJump(player.powerMode !== 'SMALL');
          spawnParticles(
            player.x + player.width / 2,
            player.y + player.height,
            5,
            '#BAE6FD',
            'CIRCLE',
            80,
            5,
            200
          );
        } else if (player.jumpsLeft > 0) {
          const speedBonus = Math.abs(player.vx) > 210 ? 35 : 0;
          player.vy = -525 - speedBonus;
          player.jumpsLeft = 0;
          player.jumpBufferTimer = 0;
          player.jumpHeld = true;
          player.spinJumpTimer = 0.36;
          player.scaleX = 0.75;
          player.scaleY = 1.3;
          sound.playDoubleJump();
          spawnParticles(
            player.x + player.width / 2,
            player.y + player.height,
            12,
            '#38BDF8',
            'CIRCLE',
            160,
            6,
            150
          );
          spawnFloatingText(
            player.x + player.width / 2,
            player.y - 6,
            'DOUBLE JUMP!',
            '#38BDF8'
          );
        }
      }

      // Wind Updraft Zones (World 4 Skyroot Citadel & World 5)
      for (const wind of level.winds) {
        if (
          player.x + player.width > wind.x &&
          player.x < wind.x + wind.width &&
          player.y + player.height > wind.y &&
          player.y < wind.y + wind.height
        ) {
          player.vy += wind.forceY * dt;
          player.vx = Math.min(maxSpeed + 60, player.vx + wind.forceX * dt);
        }
      }

      // Gravity
      const gravity = player.vy < 0 && held.jump ? 1150 : 1380;
      player.vy = Math.min(720, player.vy + gravity * dt);

      // Update Moving Platforms
      for (const plat of level.platforms) {
        plat.x += plat.vx * dt;
        plat.y += plat.vy * dt;
        if (plat.vx !== 0 && (plat.x <= plat.minX || plat.x >= plat.maxX)) {
          plat.vx *= -1;
        }
        if (plat.vy !== 0 && (plat.y <= plat.minY || plat.y >= plat.maxY)) {
          plat.vy *= -1;
        }
      }

      // Move Player X & Resolve Collisions
      player.x += player.vx * dt;
      if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
      }

      const leftCol = Math.floor(player.x / TILE_SIZE);
      const rightCol = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);
      const topRowX = Math.floor((player.y + 2) / TILE_SIZE);
      const bottomRowX = Math.floor(
        (player.y + player.height - 2) / TILE_SIZE
      );

      for (let r = topRowX; r <= bottomRowX; r++) {
        if (player.vx > 0 && isSolidAt(rightCol, r)) {
          player.x = rightCol * TILE_SIZE - player.width;
          player.vx = 0;
          break;
        } else if (player.vx < 0 && isSolidAt(leftCol, r)) {
          player.x = (leftCol + 1) * TILE_SIZE;
          player.vx = 0;
          break;
        }
      }

      // Move Player Y & Resolve Collisions
      const wasOnGround = player.onGround;
      player.y += player.vy * dt;
      player.onGround = false;

      const pLeftCol = Math.floor((player.x + 3) / TILE_SIZE);
      const pRightCol = Math.floor((player.x + player.width - 3) / TILE_SIZE);
      const pTopRow = Math.floor(player.y / TILE_SIZE);
      const pBottomRow = Math.floor(
        (player.y + player.height - 0.01) / TILE_SIZE
      );

      if (player.vy < 0) {
        const centerCol = Math.floor(
          (player.x + player.width / 2) / TILE_SIZE
        );
        const candidates = [centerCol, pLeftCol, pRightCol];
        for (const c of candidates) {
          const tileAbove = level.grid[pTopRow]?.[c];
          if (
            tileAbove &&
            (SOLID_TILES.has(tileAbove) || tileAbove === 'HIDDEN_1UP')
          ) {
            player.y = (pTopRow + 1) * TILE_SIZE;
            player.vy = 20;
            triggerBlockHit(c, pTopRow);
            break;
          }
        }
      } else if (player.vy >= 0) {
        for (let c = pLeftCol; c <= pRightCol; c++) {
          if (isSolidAt(c, pBottomRow)) {
            player.y = pBottomRow * TILE_SIZE - player.height;
            player.vy = 0;
            player.onGround = true;
            if (!wasOnGround) {
              player.scaleX = 1.18;
              player.scaleY = 0.84;
            }
            break;
          }
        }

        if (!player.onGround) {
          for (const plat of level.platforms) {
            if (
              player.x + player.width > plat.x + 4 &&
              player.x < plat.x + plat.width - 4 &&
              player.y + player.height >= plat.y &&
              player.y + player.height <= plat.y + 18
            ) {
              player.y = plat.y - player.height;
              player.vy = 0;
              player.onGround = true;
              player.x += plat.vx * dt;
              break;
            }
          }
        }
      }

      // Check Waystone Checkpoint Activation
      if (
        !level.checkpoint.activated &&
        Math.abs(player.x - level.checkpoint.x) < 28 &&
        player.y + player.height >= 10 * TILE_SIZE
      ) {
        level.checkpoint.activated = true;
        score += 500;
        sound.playCheckpoint();
        if (
          DIFFICULTY_CONFIGS[activeDifficulty].checkpointGrantsArmor &&
          player.powerMode === 'SMALL'
        ) {
          applyPowerMode('SUPER');
        }
        spawnParticles(
          level.checkpoint.x + 16,
          12 * TILE_SIZE,
          16,
          '#34D399',
          'CIRCLE',
          190,
          6,
          350
        );
        spawnFloatingText(
          level.checkpoint.x + 16,
          11 * TILE_SIZE,
          'CHECKPOINT!',
          '#34D399'
        );
        syncHud();
      }

      // Check Molten Pit or Bottomless Pit
      const centerCol = Math.floor((player.x + player.width / 2) / TILE_SIZE);
      const footRow = Math.floor((player.y + player.height) / TILE_SIZE);
      if (
        level.grid[footRow]?.[centerCol] === 'LAVA_TOP' ||
        level.grid[footRow]?.[centerCol] === 'LAVA_BODY' ||
        player.y > level.rows * TILE_SIZE + 32
      ) {
        killPlayer();
        return;
      }

      // Check Shatter Sigil in Boss Stages
      if (
        level.axeCol > 0 &&
        Math.abs(
          player.x + player.width / 2 - (level.axeCol * TILE_SIZE + 16)
        ) < 24 &&
        Math.abs(player.y + player.height / 2 - (11 * TILE_SIZE + 16)) < 36
      ) {
        level.grid[11][level.axeCol] = 'EMPTY';
        bridgeCollapsing = true;
        bridgeCollapseTimer = 0;
        hitstopTimer = 0.08;
        triggerCameraShake(7);
        score += 3000;
        sound.stopMusic();
        sound.playBrickSmash();
        spawnFloatingText(
          level.axeCol * TILE_SIZE,
          10 * TILE_SIZE,
          '+3000 SIGIL',
          '#38BDF8'
        );
        syncHud();
        return;
      }

      // Check Portal Obelisk Goal
      if (
        level.flagCol > 0 &&
        player.x + player.width >= level.flagCol * TILE_SIZE + 10 &&
        player.x <= level.flagCol * TILE_SIZE + 28 &&
        player.y + player.height >= 3 * TILE_SIZE
      ) {
        player.flagSlide = true;
        player.vx = 0;
        player.vy = 0;
        player.x = level.flagCol * TILE_SIZE - 4;
        const heightBonus = Math.max(
          200,
          Math.round((13 * TILE_SIZE - player.y) / 10) * 100
        );
        score += heightBonus;
        sound.stopMusic();
        sound.playStageClear();
        spawnFloatingText(player.x, player.y, `+${heightBonus}`, '#34D399');
        syncHud();
        return;
      }

      // Collect Rune Shards (guarded against duplicate collection)
      for (const coin of level.coins) {
        if (
          !coin.collected &&
          player.x + player.width > coin.x &&
          player.x < coin.x + 16 &&
          player.y + player.height > coin.y &&
          player.y < coin.y + 20
        ) {
          coin.collected = true;
          addShard(coin.x + 8, coin.y + 10);
        }
      }

      // Collect Secret Relics (3 per stage)
      for (const relic of level.relics) {
        if (
          !relic.collected &&
          player.x + player.width > relic.x &&
          player.x < relic.x + 24 &&
          player.y + player.height > relic.y &&
          player.y < relic.y + 24
        ) {
          relic.collected = true;
          relicsCount++;
          score += 1000;
          sound.playRelicCollect();
          spawnParticles(
            relic.x + 12,
            relic.y + 12,
            16,
            '#A855F7',
            'CIRCLE',
            180,
            6,
            300
          );
          spawnFloatingText(
            relic.x + 12,
            relic.y - 6,
            `RELIC ${relicsCount}/3!`,
            '#FACC15'
          );
          syncHud();
        }
      }

      // Update & Collect PowerUp Items
      for (const item of items) {
        if (!item.active) continue;

        if (item.emerging) {
          item.y -= 48 * dt;
          if (item.y <= item.emergeTargetY) {
            item.y = item.emergeTargetY;
            item.emerging = false;
          }
        } else {
          if (item.type !== 'FIRE_FLOWER') {
            item.vy = Math.min(500, item.vy + 1100 * dt);
            item.x += item.vx * dt;

            const icLeft = Math.floor(item.x / TILE_SIZE);
            const icRight = Math.floor((item.x + item.width) / TILE_SIZE);
            const irMid = Math.floor((item.y + item.height / 2) / TILE_SIZE);

            if (item.vx > 0 && isSolidAt(icRight, irMid)) {
              item.x = icRight * TILE_SIZE - item.width;
              item.vx *= -1;
            } else if (item.vx < 0 && isSolidAt(icLeft, irMid)) {
              item.x = (icLeft + 1) * TILE_SIZE;
              item.vx *= -1;
            }

            item.y += item.vy * dt;
            const irBot = Math.floor((item.y + item.height) / TILE_SIZE);
            const icMid = Math.floor((item.x + item.width / 2) / TILE_SIZE);
            if (item.vy >= 0 && isSolidAt(icMid, irBot)) {
              item.y = irBot * TILE_SIZE - item.height;
              item.vy = item.type === 'STAR' ? -360 : 0;
            }
          }
        }

        if (
          player.x + player.width > item.x &&
          player.x < item.x + item.width &&
          player.y + player.height > item.y &&
          player.y < item.y + item.height
        ) {
          item.active = false;
          hitstopTimer = 0.045;
          spawnParticles(
            item.x + 12,
            item.y + 12,
            14,
            '#38BDF8',
            'CIRCLE',
            200,
            6,
            400
          );

          if (item.type === 'ONE_UP') {
            lives++;
            score += 1000;
            sound.playOneUp();
            spawnFloatingText(item.x, item.y, '+1 WARD', '#34D399');
          } else if (item.type === 'STAR') {
            player.starTimer = 10.0;
            score += 1000;
            sound.playPowerUpCollect();
            spawnFloatingText(item.x, item.y, 'AETHER WARD!', '#FACC15');
          } else if (item.type === 'MUSHROOM') {
            if (player.powerMode === 'SMALL') {
              applyPowerMode('SUPER');
            }
            score += 1000;
            sound.playPowerUpCollect();
            spawnFloatingText(item.x, item.y, 'RUNE GUARD!', '#38BDF8');
          } else if (item.type === 'FIRE_FLOWER') {
            applyPowerMode('FIRE');
            score += 1000;
            sound.playPowerUpCollect();
            spawnFloatingText(item.x, item.y, 'FLAME WEAVER!', '#FB923C');
          }
        }
      }

      // Update Rotating Ember Pendulums
      for (const bar of level.fireBars) {
        bar.angle += bar.speed * dt;
        for (let i = 1; i < bar.segments; i++) {
          const dist = i * 16;
          const fx = bar.x + Math.cos(bar.angle) * dist;
          const fy = bar.y + Math.sin(bar.angle) * dist;
          if (
            player.x + player.width > fx - 5 &&
            player.x < fx + 5 &&
            player.y + player.height > fy - 5 &&
            player.y < fy + 5
          ) {
            damagePlayer();
          }
        }
      }

      // Update Projectiles
      for (const proj of projectiles) {
        if (!proj.active) continue;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.rotation += dt * 14;

        if (proj.type === 'PLAYER_FIREBALL') {
          proj.vy += 1200 * dt;
          const pCol = Math.floor((proj.x + proj.width / 2) / TILE_SIZE);
          const pRow = Math.floor((proj.y + proj.height) / TILE_SIZE);

          if (isSolidAt(pCol, pRow)) {
            proj.y = pRow * TILE_SIZE - proj.height;
            proj.vy = -260;
            proj.bounces++;
          }

          const wallCol = Math.floor(
            (proj.x + (proj.vx > 0 ? proj.width : 0)) / TILE_SIZE
          );
          const midRow = Math.floor((proj.y + proj.height / 2) / TILE_SIZE);
          if (isSolidAt(wallCol, midRow) || proj.bounces > 4) {
            proj.active = false;
            spawnParticles(proj.x, proj.y, 6, '#38BDF8', 'CIRCLE', 120, 5, 300);
            continue;
          }

          for (const enemy of level.enemies) {
            if (
              !enemy.active ||
              enemy.state === 'SQUISHED' ||
              enemy.state === ' KNOCKED_OUT' ||
              enemy.type === 'THWOMP' ||
              enemy.type === 'PODOBOO'
            )
              continue;

            if (
              proj.x + proj.width > enemy.x &&
              proj.x < enemy.x + enemy.width &&
              proj.y + proj.height > enemy.y &&
              proj.y < enemy.y + enemy.height
            ) {
              proj.active = false;
              if (enemy.type === 'BUZZY') {
                sound.playBump();
                spawnParticles(
                  proj.x,
                  proj.y,
                  5,
                  '#93C5FD',
                  'CIRCLE',
                  100,
                  4,
                  200
                );
                break;
              }

              enemy.hp--;
              enemy.hitFlashTimer = 0.14;
              spawnParticles(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                8,
                '#38BDF8',
                'CIRCLE',
                160,
                6,
                400
              );

              if (enemy.hp <= 0) {
                enemy.state = ' KNOCKED_OUT';
                enemy.vy = -340;
                enemy.vx = proj.vx > 0 ? 90 : -90;
                const pts = enemy.type === 'BOWSER' ? 5000 : 200;
                score += pts;
                sound.playKick();
                spawnFloatingText(enemy.x, enemy.y, String(pts), '#FEF08A');

                if (enemy.type === 'BOWSER') {
                  hitstopTimer = 0.08;
                  triggerCameraShake(8);
                  sound.stopMusic();
                  sound.playStageClear();
                  setTimeout(() => {
                    completeCurrentStage();
                  }, 1000);
                }
              } else {
                sound.playStomp();
              }
              break;
            }
          }
        } else {
          if (proj.type === 'ENEMY_HAMMER') {
            proj.vy += 900 * dt;
          }
          if (
            proj.x + proj.width > player.x + 4 &&
            proj.x < player.x + player.width - 4 &&
            proj.y + proj.height > player.y + 4 &&
            proj.y < player.y + player.height - 4
          ) {
            proj.active = false;
            damagePlayer();
          }
        }

        if (
          proj.x < cameraX - 64 ||
          proj.x > cameraX + 1200 ||
          proj.y > level.rows * TILE_SIZE + 64
        ) {
          proj.active = false;
        }
      }

      // Update Enemies
      const projSpeedMult =
        DIFFICULTY_CONFIGS[activeDifficulty].projectileSpeedMultiplier;

      for (const enemy of level.enemies) {
        if (!enemy.active) continue;
        if (Math.abs(enemy.x - player.x) > 850 && enemy.state !== 'SHELL_MOVING')
          continue;

        if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;
        enemy.scaleX += (1 - enemy.scaleX) * Math.min(1, dt * 12);
        enemy.scaleY += (1 - enemy.scaleY) * Math.min(1, dt * 12);

        if (enemy.state === 'SQUISHED') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) enemy.active = false;
          continue;
        }

        if (enemy.state === ' KNOCKED_OUT') {
          enemy.vy += 1100 * dt;
          enemy.x += enemy.vx * dt;
          enemy.y += enemy.vy * dt;
          if (enemy.y > level.rows * TILE_SIZE + 80) enemy.active = false;
          continue;
        }

        if (enemy.type === 'PIRANHA') {
          enemy.stateTimer -= dt;
          const playerNearPipe = Math.abs(player.x - enemy.x) < 42;
          if (enemy.state === 'PIRANHA_HIDDEN') {
            enemy.y = enemy.homeY + 4;
            if (enemy.stateTimer <= 0 && !playerNearPipe) {
              enemy.state = 'PIRANHA_WARN';
              enemy.stateTimer = 0.45;
            }
          } else if (enemy.state === 'PIRANHA_WARN') {
            if (enemy.stateTimer <= 0) {
              enemy.state = 'PIRANHA_UP';
              enemy.stateTimer = 2.0;
            }
          } else if (enemy.state === 'PIRANHA_UP') {
            const targetY = enemy.homeY - 30;
            enemy.y += (targetY - enemy.y) * Math.min(1, dt * 10);
            if (enemy.stateTimer <= 0) {
              enemy.state = 'PIRANHA_HIDDEN';
              enemy.stateTimer = 1.6;
            }
          }
        } else if (enemy.type === 'THWOMP') {
          if (enemy.state === 'THWOMP_IDLE') {
            if (Math.abs(player.x - enemy.x) < 92) {
              enemy.state = 'THWOMP_WARN';
              enemy.stateTimer = 0.42;
            }
          } else if (enemy.state === 'THWOMP_WARN') {
            enemy.stateTimer -= dt;
            if (enemy.stateTimer <= 0) {
              enemy.state = 'THWOMP_FALL';
              enemy.vy = 60;
            }
          } else if (enemy.state === 'THWOMP_FALL') {
            enemy.vy = Math.min(760, enemy.vy + 2200 * dt);
            enemy.y += enemy.vy * dt;
            const botRow = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
            const midCol = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
            if (isSolidAt(midCol, botRow)) {
              enemy.y = botRow * TILE_SIZE - enemy.height;
              enemy.vy = 0;
              enemy.state = 'THWOMP_GROUND';
              enemy.stateTimer = 0.9;
              triggerCameraShake(5.5);
              sound.playThwompSlam();
              spawnParticles(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height,
                10,
                '#94A3B8',
                'SQUARE',
                150,
                6,
                500
              );
            }
          } else if (enemy.state === 'THWOMP_GROUND') {
            enemy.stateTimer -= dt;
            if (enemy.stateTimer <= 0) {
              enemy.state = 'THWOMP_RISE';
            }
          } else if (enemy.state === 'THWOMP_RISE') {
            enemy.y -= 95 * dt;
            if (enemy.y <= enemy.homeY) {
              enemy.y = enemy.homeY;
              enemy.state = 'THWOMP_IDLE';
            }
          }
        } else if (enemy.type === 'PODOBOO') {
          enemy.vy += 880 * dt;
          enemy.y += enemy.vy * dt;
          if (enemy.y >= enemy.homeY + 16) {
            enemy.y = enemy.homeY + 16;
            enemy.stateTimer -= dt;
            if (enemy.stateTimer <= 0) {
              enemy.vy = -540;
              enemy.stateTimer = 0.85;
              spawnParticles(
                enemy.x + 12,
                enemy.homeY,
                5,
                '#F43F5E',
                'CIRCLE',
                110,
                5,
                400
              );
            }
          }
        } else {
          if (enemy.type === 'HAMMER_BRO') {
            enemy.facing = player.x < enemy.x ? -1 : 1;
            enemy.stateTimer -= dt;
            if (enemy.x < enemy.homeX - 36) enemy.vx = 38;
            if (enemy.x > enemy.homeX + 36) enemy.vx = -38;

            if (enemy.stateTimer <= 0.45 && enemy.stateTimer > 0) {
              enemy.windupTimer = enemy.stateTimer;
            } else if (enemy.stateTimer <= 0) {
              enemy.windupTimer = 0;
              enemy.stateTimer = 1.9;
              projectiles.push({
                id: nextEntityId++,
                type: 'ENEMY_HAMMER',
                x: enemy.x + 8,
                y: enemy.y - 8,
                vx: enemy.facing * 175 * projSpeedMult,
                vy: -380,
                width: 14,
                height: 16,
                bounces: 0,
                rotation: 0,
                active: true,
              });
            }
          } else if (enemy.type === 'BOWSER') {
            enemy.facing = player.x < enemy.x ? -1 : 1;
            enemy.stateTimer -= dt;
            const minBridgeX = (level.cols - 33) * TILE_SIZE;
            const maxBridgeX = (level.cols - 22) * TILE_SIZE;
            if (enemy.x < minBridgeX) enemy.vx = 48;
            if (enemy.x > maxBridgeX) enemy.vx = -48;

            if (enemy.stateTimer <= 0.5 && enemy.stateTimer > 0) {
              enemy.windupTimer = enemy.stateTimer;
            } else if (enemy.stateTimer <= 0) {
              enemy.windupTimer = 0;
              enemy.stateTimer = activeDifficulty === 'HARD' ? 1.65 : 2.1;
              if (enemy.onGround && Math.random() < 0.45) {
                enemy.vy = -410;
              }
              sound.playFireball();
              projectiles.push({
                id: nextEntityId++,
                type: 'BOWSER_FIRE',
                x: enemy.facing === -1 ? enemy.x - 20 : enemy.x + enemy.width,
                y: enemy.y + 18,
                vx: enemy.facing * 230 * projSpeedMult,
                vy: 0,
                width: 32,
                height: 14,
                bounces: 0,
                rotation: 0,
                active: true,
              });
            }
          }

          enemy.vy = Math.min(600, enemy.vy + 1300 * dt);
          enemy.x += enemy.vx * dt;

          const eLeft = Math.floor(enemy.x / TILE_SIZE);
          const eRight = Math.floor((enemy.x + enemy.width) / TILE_SIZE);
          const eMidY = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);

          if (enemy.vx > 0 && isSolidAt(eRight, eMidY)) {
            enemy.x = eRight * TILE_SIZE - enemy.width;
            enemy.vx *= -1;
            enemy.facing = -1;
            if (enemy.state === 'SHELL_MOVING') sound.playBump();
          } else if (enemy.vx < 0 && isSolidAt(eLeft, eMidY)) {
            enemy.x = (eLeft + 1) * TILE_SIZE;
            enemy.vx *= -1;
            enemy.facing = 1;
            if (enemy.state === 'SHELL_MOVING') sound.playBump();
          }

          enemy.y += enemy.vy * dt;
          enemy.onGround = false;
          const eBot = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
          const eCenterCol = Math.floor(
            (enemy.x + enemy.width / 2) / TILE_SIZE
          );
          if (enemy.vy >= 0 && isSolidAt(eCenterCol, eBot)) {
            enemy.y = eBot * TILE_SIZE - enemy.height;
            enemy.vy = 0;
            enemy.onGround = true;
          }

          if (enemy.state === 'SHELL_MOVING') {
            for (const other of level.enemies) {
              if (
                other.id !== enemy.id &&
                other.active &&
                other.state !== ' KNOCKED_OUT' &&
                other.state !== 'SQUISHED' &&
                enemy.x + enemy.width > other.x &&
                enemy.x < other.x + other.width &&
                enemy.y + enemy.height > other.y &&
                enemy.y < other.y + other.height
              ) {
                other.state = ' KNOCKED_OUT';
                other.vy = -340;
                other.vx = enemy.vx > 0 ? 110 : -110;
                score += 500;
                sound.playKick();
                spawnFloatingText(other.x, other.y, '500', '#34D399');
              }
            }
          }
        }

        // Player <-> Enemy Collision
        const pOverlap =
          player.x + player.width - 4 > enemy.x + 2 &&
          player.x + 4 < enemy.x + enemy.width - 2 &&
          player.y + player.height > enemy.y + 2 &&
          player.y < enemy.y + enemy.height - 2;

        if (pOverlap) {
          if (player.starTimer > 0 && enemy.type !== 'BOWSER') {
            enemy.state = ' KNOCKED_OUT';
            enemy.vy = -360;
            enemy.vx = player.facing * 120;
            score += 200;
            sound.playKick();
            spawnFloatingText(enemy.x, enemy.y, '200', '#FACC15');
            continue;
          }

          const canStomp =
            enemy.type !== 'PIRANHA' &&
            enemy.type !== 'THWOMP' &&
            enemy.type !== 'PODOBOO' &&
            enemy.type !== 'BOWSER';

          const isFallingOnto =
            player.vy > 0 &&
            player.y + player.height - player.vy * dt <= enemy.y + 18;

          if (canStomp && isFallingOnto) {
            player.vy = held.jump ? -460 : -340;
            player.jumpsLeft = Math.max(1, player.maxJumps - 1);
            player.spinJumpTimer = 0;
            player.scaleX = 1.25;
            player.scaleY = 0.78;
            player.comboCount++;
            const stompScore = Math.min(1000, player.comboCount * 200);
            score += stompScore;
            hitstopTimer = 0.04;
            triggerCameraShake(3);
            sound.playStomp();
            spawnParticles(
              enemy.x + enemy.width / 2,
              enemy.y,
              8,
              '#38BDF8',
              'CIRCLE',
              150,
              5,
              300
            );
            spawnFloatingText(
              enemy.x,
              enemy.y - 6,
              String(stompScore),
              '#FEF08A'
            );

            if (enemy.type === 'GOOMBA') {
              enemy.state = 'SQUISHED';
              enemy.stateTimer = 0.45;
              enemy.vx = 0;
            } else if (enemy.type === 'KOOPA' || enemy.type === 'BUZZY') {
              if (enemy.state === 'WALKING' || enemy.state === 'SHELL_MOVING') {
                enemy.state = 'SHELL_IDLE';
                enemy.vx = 0;
                enemy.height = 24;
              } else if (enemy.state === 'SHELL_IDLE') {
                enemy.state = 'SHELL_MOVING';
                enemy.vx = player.x < enemy.x ? 340 : -340;
                sound.playKick();
              }
            } else if (enemy.type === 'HAMMER_BRO') {
              enemy.state = ' KNOCKED_OUT';
              enemy.vy = -300;
            }
          } else if (enemy.state === 'SHELL_IDLE') {
            enemy.state = 'SHELL_MOVING';
            enemy.vx = player.x < enemy.x ? 340 : -340;
            player.x += player.x < enemy.x ? -6 : 6;
            score += 400;
            sound.playKick();
            spawnFloatingText(enemy.x, enemy.y, '400', '#FEF08A');
          } else {
            damagePlayer();
          }
        }
      }

      // Update Pooled Particles
      for (const p of particles) {
        if (!p.active) continue;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.vRot * dt;
        p.life -= dt;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) p.active = false;
      }

      // Update Pooled Floating Texts
      for (const ft of floatingTexts) {
        if (!ft.active) continue;
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) ft.active = false;
      }

      // Smooth Bidirectional Camera Tracking
      const worldHeight = level.rows * TILE_SIZE;
      const scale = canvas.height / worldHeight;
      const viewWidth = canvas.width / scale;
      const maxCamX = Math.max(0, level.cols * TILE_SIZE - viewWidth);
      const targetCamX = Math.max(
        0,
        Math.min(maxCamX, player.x - viewWidth * 0.36)
      );
      cameraX += (targetCamX - cameraX) * Math.min(1, dt * 10);

      hudSyncTimer += dt;
      if (hudSyncTimer >= 0.12) {
        hudSyncTimer = 0;
        syncHud();
      }
    };

    let lastTime = performance.now();
    let animId = 0;

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      updateSimulation(dt);

      const shakeX =
        shakeIntensity > 0 ? (Math.random() * 2 - 1) * shakeIntensity : 0;
      const shakeY =
        shakeIntensity > 0 ? (Math.random() * 2 - 1) * shakeIntensity : 0;

      renderGameWorld(ctx, canvas.width, canvas.height, {
        level,
        player,
        items,
        projectiles,
        particles,
        floatingTexts,
        cameraX,
        shakeX,
        shakeY,
        time: elapsed,
        flagY,
      });

      animId = requestAnimationFrame(frame);
    };

    syncHud();
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sound.stopMusic();
    };
  }, [controllerRef, onHudUpdate, onStageComplete, onStateChange]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#090d16]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
