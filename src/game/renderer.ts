import { LevelData, TILE_SIZE } from './levels';
import {
  CheckpointMarker,
  CoinCollectible,
  Enemy,
  FireBarHazard,
  FloatingText,
  MovingPlatform,
  Particle,
  Player,
  PowerUpItem,
  Projectile,
  SecretRelic,
  TileType,
  WindZone,
} from './types';

export interface RenderContextState {
  level: LevelData;
  player: Player;
  items: PowerUpItem[];
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  cameraX: number;
  shakeX: number;
  shakeY: number;
  time: number;
  flagY: number;
}

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: RenderContextState
): void {
  const {
    level,
    player,
    items,
    projectiles,
    particles,
    floatingTexts,
    cameraX,
    shakeX,
    shakeY,
    time,
    flagY,
  } = state;

  ctx.save();

  const worldHeight = level.rows * TILE_SIZE; // 512
  const scale = height / worldHeight;
  ctx.scale(scale, scale);
  const viewWidth = width / scale;

  ctx.translate(shakeX, shakeY);

  // 1. World Theme Parallax Backdrop
  drawBackground(ctx, viewWidth, worldHeight, cameraX, level, time);

  ctx.save();
  ctx.translate(-Math.floor(cameraX), 0);

  // 2. Wind Updraft Zones (World 4 & 5)
  for (const wind of level.winds) {
    drawWindZone(ctx, wind, time);
  }

  // 3. Waystone Checkpoint Obelisk
  drawCheckpoint(ctx, level.checkpoint, time);

  // 4. End-of-Level Rune Portal Obelisk & Sanctuary Gate
  if (level.flagCol > 0) {
    drawRunePortalObelisk(ctx, level.flagCol * TILE_SIZE, flagY, time);
  }
  if (level.castleCol > 0) {
    drawSanctuaryGate(
      ctx,
      level.castleCol * TILE_SIZE,
      8 * TILE_SIZE,
      level.theme
    );
  }

  // 5. Emerging PowerUp Relics (drawn behind shrine blocks while sprouting)
  for (const item of items) {
    if (item.active && item.emerging) {
      drawPowerUpItem(ctx, item, time);
    }
  }

  // 6. Briarmaws (drawn behind hollow conduit trunks)
  for (const enemy of level.enemies) {
    if (enemy.active && enemy.type === 'PIRANHA') {
      drawEnemy(ctx, enemy, time);
    }
  }

  // 7. Level Tile Grid & Interactive Rune Shrines
  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 2);
  const endCol = Math.min(
    level.cols - 1,
    Math.ceil((cameraX + viewWidth) / TILE_SIZE) + 2
  );

  for (let r = 0; r < level.rows; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tile = level.grid[r][c];
      if (tile === 'EMPTY' || tile === 'HIDDEN_1UP') continue;

      const blockState = level.blocks.get(`${c},${r}`);
      const bumpY = blockState ? blockState.bumpOffset : 0;
      const sx = blockState ? blockState.scaleX : 1;
      const sy = blockState ? blockState.scaleY : 1;

      drawTile(
        ctx,
        tile,
        c * TILE_SIZE,
        r * TILE_SIZE + bumpY,
        sx,
        sy,
        level.theme,
        time
      );
    }
  }

  // 8. Moving Platforms
  for (const plat of level.platforms) {
    drawMovingPlatform(ctx, plat);
  }

  // 9. Collectible Rune Shards
  for (const coin of level.coins) {
    if (!coin.collected) {
      drawRuneShard(ctx, coin, time);
    }
  }

  // 10. Collectible Secret Relics (3 per stage)
  for (const relic of level.relics) {
    if (!relic.collected) {
      drawSecretRelic(ctx, relic, time);
    }
  }

  // 11. Fully emerged Power-Ups
  for (const item of items) {
    if (item.active && !item.emerging) {
      drawPowerUpItem(ctx, item, time);
    }
  }

  // 12. Enemies & Bosses
  for (const enemy of level.enemies) {
    if (enemy.active && enemy.type !== 'PIRANHA') {
      drawEnemy(ctx, enemy, time);
    }
  }

  // 13. Rotating Ember Pendulums
  for (const bar of level.fireBars) {
    drawFireBar(ctx, bar, time);
  }

  // 14. Projectiles (Arcane Bolts, Rune Axes, Tyrant Flame)
  for (const proj of projectiles) {
    if (proj.active) {
      drawProjectile(ctx, proj, time);
    }
  }

  // 15. Playable Adventurer (Kaelen the Runewarden)
  drawPlayer(ctx, player, time);

  // 16. Pooled Particles
  for (const p of particles) {
    if (p.active) {
      drawParticle(ctx, p);
    }
  }

  // 17. Floating Score & Status Popups
  for (const ft of floatingTexts) {
    if (ft.active) {
      drawFloatingText(ctx, ft);
    }
  }

  ctx.restore();
  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  viewWidth: number,
  worldHeight: number,
  cameraX: number,
  level: LevelData,
  time: number
): void {
  const theme = level.theme;

  if (theme === 'VERDANT_HOLLOW') {
    const grad = ctx.createLinearGradient(0, 0, 0, worldHeight);
    grad.addColorStop(0, '#0D2B24');
    grad.addColorStop(0.55, '#134E4A');
    grad.addColorStop(1, '#34D399');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewWidth, worldHeight);

    // Distant luminescent canopy clouds (0.25x parallax)
    const cloudOffset = -(cameraX * 0.25) % 900;
    for (let i = -1; i < 4; i++) {
      const baseX = cloudOffset + i * 320;
      drawCloud(ctx, baseX + 50, 68, 84, 34, 'rgba(167, 243, 208, 0.28)');
      drawCloud(ctx, baseX + 200, 112, 110, 40, 'rgba(167, 243, 208, 0.22)');
    }

    // Giant Mushbound Spore Hills (0.45x parallax)
    const hillOffset = -(cameraX * 0.45) % 800;
    for (let i = -1; i < 4; i++) {
      const hx = hillOffset + i * 400;
      drawHill(ctx, hx + 40, 14 * TILE_SIZE, 170, 96, '#065F46', '#047857');
      drawHill(ctx, hx + 230, 14 * TILE_SIZE, 115, 60, '#064E3B', '#065F46');
    }

    // Foreground glowing fern thickets (0.75x parallax)
    const bushOffset = -(cameraX * 0.75) % 600;
    for (let i = -1; i < 5; i++) {
      const bx = bushOffset + i * 300;
      drawBush(ctx, bx + 80, 14 * TILE_SIZE, 78, 26);
      drawBush(ctx, bx + 220, 14 * TILE_SIZE, 54, 22);
    }
  } else if (theme === 'CRYSTAL_CAVERNS') {
    const grad = ctx.createLinearGradient(0, 0, 0, worldHeight);
    grad.addColorStop(0, '#090D16');
    grad.addColorStop(0.6, '#0F172A');
    grad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewWidth, worldHeight);

    const pillarOffset = -(cameraX * 0.35) % 280;
    for (let i = -1; i < 7; i++) {
      const px = pillarOffset + i * 280;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.fillRect(px + 40, 48, 48, worldHeight - 104);

      // Glowing crystal vein
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.moveTo(px + 64, 80);
      ctx.lineTo(px + 76, 150);
      ctx.lineTo(px + 52, 150);
      ctx.closePath();
      ctx.fill();
    }
  } else if (theme === 'EMBERFALL_PEAKS') {
    const grad = ctx.createLinearGradient(0, 0, 0, worldHeight);
    grad.addColorStop(0, '#1C0D0A');
    grad.addColorStop(0.6, '#431407');
    grad.addColorStop(1, '#9A3412');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewWidth, worldHeight);

    const peakOffset = -(cameraX * 0.35) % 420;
    for (let i = -1; i < 5; i++) {
      const vx = peakOffset + i * 420;
      drawHill(ctx, vx + 30, 14 * TILE_SIZE, 200, 130, '#27272A', '#3F3F46');
      drawHill(ctx, vx + 240, 14 * TILE_SIZE, 140, 85, '#18181B', '#27272A');
    }
  } else if (theme === 'SKYROOT_CITADEL') {
    const grad = ctx.createLinearGradient(0, 0, 0, worldHeight);
    grad.addColorStop(0, '#1E1B4B');
    grad.addColorStop(0.55, '#3B0764');
    grad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewWidth, worldHeight);

    const cloudOffset = -(cameraX * 0.3) % 900;
    for (let i = -1; i < 4; i++) {
      const baseX = cloudOffset + i * 300;
      drawCloud(ctx, baseX + 40, 74, 96, 36, 'rgba(254, 243, 199, 0.45)');
      drawCloud(ctx, baseX + 180, 140, 120, 42, 'rgba(233, 213, 255, 0.35)');
    }
  } else {
    // RUNEHEART_KEEP
    const grad = ctx.createLinearGradient(0, 0, 0, worldHeight);
    grad.addColorStop(0, '#09070D');
    grad.addColorStop(0.65, '#1F122B');
    grad.addColorStop(1, '#4C0519');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewWidth, worldHeight);

    const archOffset = -(cameraX * 0.3) % 320;
    for (let i = -1; i < 6; i++) {
      const ax = archOffset + i * 320;
      ctx.fillStyle = 'rgba(39, 39, 42, 0.55)';
      ctx.fillRect(ax + 60, 48, 64, worldHeight - 112);
      const flicker = Math.sin(time * 12 + i) * 3;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.beginPath();
      ctx.arc(ax + 92, 160, 24 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FB7185';
      ctx.fillRect(ax + 88, 156, 8, 14);
    }
  }
}

function drawWindZone(
  ctx: CanvasRenderingContext2D,
  wind: WindZone,
  time: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(167, 139, 250, 0.12)';
  ctx.strokeStyle = 'rgba(196, 181, 253, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(wind.x, wind.y, wind.width, wind.height);
  ctx.strokeRect(wind.x, wind.y, wind.width, wind.height);

  // Rising wind stream lines
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const lx = wind.x + ((i + 0.5) * wind.width) / 5;
    const offset = ((time * 140 + i * 45) % wind.height);
    const ly = wind.y + wind.height - offset;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 4, Math.max(wind.y, ly - 24));
    ctx.stroke();
  }
  ctx.restore();
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  cp: CheckpointMarker,
  time: number
): void {
  ctx.save();
  const cx = cp.x + 16;
  const baseY = 14 * TILE_SIZE;

  // Carved Stone Pedestal & Obelisk
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, baseY);
  ctx.lineTo(cx - 8, baseY - 52);
  ctx.lineTo(cx, baseY - 64);
  ctx.lineTo(cx + 8, baseY - 52);
  ctx.lineTo(cx + 12, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rune Core Gem
  const activeColor = cp.activated ? '#34D399' : '#64748B';
  if (cp.activated) {
    const pulse = Math.sin(time * 8) * 4;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.beginPath();
    ctx.arc(cx, baseY - 38, 18 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = activeColor;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 48);
  ctx.lineTo(cx + 6, baseY - 38);
  ctx.lineTo(cx, baseY - 28);
  ctx.lineTo(cx - 6, baseY - 38);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSecretRelic(
  ctx: CanvasRenderingContext2D,
  relic: SecretRelic,
  time: number
): void {
  const bob = Math.sin(time * 4 + relic.index) * 4;
  const cx = relic.x + 12;
  const cy = relic.y + 12 + bob;

  ctx.save();
  // Outer arcane halo
  ctx.fillStyle = 'rgba(168, 85, 247, 0.26)';
  ctx.beginPath();
  ctx.arc(cx, cy, 16 + Math.sin(time * 7) * 2, 0, Math.PI * 2);
  ctx.fill();

  // Ornate Hexagonal Rune Tablet
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#7E22CE';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 10, cy - 5);
  ctx.lineTo(cx + 10, cy + 5);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 10, cy + 5);
  ctx.lineTo(cx - 10, cy - 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner Violet Gem
  ctx.fillStyle = '#A855F7';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.arc(x + w * 0.32, y, h * 0.45, 0, Math.PI * 2);
  ctx.arc(x + w * 0.65, y + 2, h * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHill(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
  strokeColor: string,
  fillColor: string
): void {
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + w / 2, baseY - h * 1.4, x + w, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Rune Carvings on hill
  ctx.fillStyle = 'rgba(110, 231, 183, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.46, baseY - h * 0.45, 7, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.6, baseY - h * 0.28, 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.fillStyle = '#10B981';
  ctx.strokeStyle = '#065F46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, baseY - h, w, h, h / 2);
  ctx.arc(x + w * 0.3, baseY - h * 0.85, h * 0.48, 0, Math.PI * 2);
  ctx.arc(x + w * 0.52, baseY - h * 0.95, h * 0.55, 0, Math.PI * 2);
  ctx.arc(x + w * 0.72, baseY - h * 0.85, h * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  theme: LevelData['theme'],
  time: number
): void {
  ctx.save();
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-(x + TILE_SIZE / 2), -(y + TILE_SIZE / 2));
  }

  switch (tile) {
    case 'GROUND': {
      const mainColor =
        theme === 'CRYSTAL_CAVERNS'
          ? '#1E3A8A'
          : theme === 'EMBERFALL_PEAKS'
          ? '#451A03'
          : theme === 'SKYROOT_CITADEL'
          ? '#4C1D95'
          : theme === 'RUNEHEART_KEEP'
          ? '#27272A'
          : '#3F2E21';
      const topHighlight =
        theme === 'CRYSTAL_CAVERNS'
          ? '#38BDF8'
          : theme === 'EMBERFALL_PEAKS'
          ? '#F97316'
          : theme === 'SKYROOT_CITADEL'
          ? '#FDE047'
          : theme === 'RUNEHEART_KEEP'
          ? '#F43F5E'
          : '#10B981';
      const borderDark = '#090D16';

      ctx.fillStyle = mainColor;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.fillStyle = topHighlight;
      ctx.fillRect(x, y, TILE_SIZE, 5);

      ctx.strokeStyle = borderDark;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x + TILE_SIZE, y + 16);
      ctx.moveTo(x + 16, y + 5);
      ctx.lineTo(x + 16, y + 16);
      ctx.stroke();
      break;
    }

    case 'BRICK': {
      const brickFill =
        theme === 'CRYSTAL_CAVERNS'
          ? '#2563EB'
          : theme === 'EMBERFALL_PEAKS'
          ? '#9A3412'
          : theme === 'SKYROOT_CITADEL'
          ? '#6D28D9'
          : theme === 'RUNEHEART_KEEP'
          ? '#52525B'
          : '#78350F';
      const mortar =
        theme === 'CRYSTAL_CAVERNS'
          ? '#0F172A'
          : theme === 'SKYROOT_CITADEL'
          ? '#DDD6FE'
          : '#FDE68A';

      ctx.fillStyle = brickFill;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = mortar;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x + TILE_SIZE, y + 10);
      ctx.moveTo(x, y + 21);
      ctx.lineTo(x + TILE_SIZE, y + 21);
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + 16, y + 10);
      ctx.moveTo(x + 8, y + 10);
      ctx.lineTo(x + 8, y + 21);
      ctx.moveTo(x + 24, y + 10);
      ctx.lineTo(x + 24, y + 21);
      ctx.stroke();
      break;
    }

    case 'QUESTION_COIN':
    case 'QUESTION_POWERUP':
    case 'QUESTION_STAR':
    case 'QUESTION_1UP': {
      // Glowing Rune Shrine Block
      const pulse = Math.sin(time * 6) * 0.5 + 0.5;
      ctx.fillStyle = pulse > 0.5 ? '#0284C7' : '#0369A1';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#082F49';
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Carved Rune Diamond Sigil
      const cx = x + TILE_SIZE / 2;
      const cy = y + TILE_SIZE / 2;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'USED_BLOCK': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      break;
    }

    case 'HARD_BLOCK': {
      ctx.fillStyle = '#64748B';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 3);
      ctx.fillRect(x + 2, y + 2, 3, TILE_SIZE - 4);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      break;
    }

    case 'PIPE_TOP_L':
    case 'PIPE_TOP_R':
    case 'PIPE_BODY_L':
    case 'PIPE_BODY_R': {
      // Hollow Rune Conduit / Ancient Trunk
      const isLeft = tile === 'PIPE_TOP_L' || tile === 'PIPE_BODY_L';
      const isTop = tile === 'PIPE_TOP_L' || tile === 'PIPE_TOP_R';

      ctx.fillStyle = '#0D9488';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      ctx.fillStyle = '#2DD4BF';
      if (isLeft) {
        ctx.fillRect(x + 6, y, 8, TILE_SIZE);
      } else {
        ctx.fillRect(x + 2, y, 4, TILE_SIZE);
        ctx.fillStyle = '#115E59';
        ctx.fillRect(x + 16, y, 12, TILE_SIZE);
      }

      ctx.strokeStyle = '#042F2E';
      ctx.lineWidth = 2;
      if (isTop) {
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      } else {
        ctx.beginPath();
        if (isLeft) {
          ctx.moveTo(x + 3, y);
          ctx.lineTo(x + 3, y + TILE_SIZE);
        } else {
          ctx.moveTo(x + TILE_SIZE - 3, y);
          ctx.lineTo(x + TILE_SIZE - 3, y + TILE_SIZE);
        }
        ctx.stroke();
      }
      break;
    }

    case 'BRIDGE': {
      ctx.fillStyle = '#B45309';
      ctx.fillRect(x, y, TILE_SIZE, 14);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, 12);
      ctx.strokeStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(x + 8, y - 6, 4, 0, Math.PI * 2);
      ctx.arc(x + 24, y - 6, 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'LAVA_TOP': {
      ctx.fillStyle = '#E11D48';
      ctx.fillRect(x, y + 6, TILE_SIZE, TILE_SIZE - 6);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      const wave = Math.sin(time * 5 + x * 0.08) * 3;
      ctx.moveTo(x, y + TILE_SIZE);
      ctx.lineTo(x, y + 6 + wave);
      ctx.quadraticCurveTo(
        x + TILE_SIZE / 2,
        y + 2 - wave,
        x + TILE_SIZE,
        y + 6 + wave
      );
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FB7185';
      ctx.fillRect(x, y + 12, TILE_SIZE, TILE_SIZE - 12);
      break;
    }

    case 'LAVA_BODY': {
      ctx.fillStyle = '#E11D48';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      break;
    }

    case 'AXE': {
      // Shatter Sigil Crystal at end of Boss Bridge
      const glow = Math.sin(time * 8) * 3;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 18 + glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 2);
      ctx.lineTo(x + 28, y + 16);
      ctx.lineTo(x + 16, y + 30);
      ctx.lineTo(x + 4, y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

function drawMovingPlatform(
  ctx: CanvasRenderingContext2D,
  plat: MovingPlatform
): void {
  ctx.save();
  ctx.fillStyle = '#0284C7';
  ctx.strokeStyle = '#BAE6FD';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  for (let rx = plat.x + 12; rx < plat.x + plat.width - 8; rx += 18) {
    ctx.fillRect(rx, plat.y + 5, 6, 6);
  }
  ctx.restore();
}

function drawRuneShard(
  ctx: CanvasRenderingContext2D,
  coin: CoinCollectible,
  time: number
): void {
  const bob = Math.sin(time * 5 + coin.bobOffset) * 3;
  const spinScale = Math.max(
    0.3,
    Math.abs(Math.cos(time * 4 + coin.bobOffset))
  );
  const cx = coin.x + 8;
  const cy = coin.y + 10 + bob;

  ctx.save();
  ctx.fillStyle = '#38BDF8';
  ctx.strokeStyle = '#BAE6FD';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 8 * spinScale, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 8 * spinScale, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPowerUpItem(
  ctx: CanvasRenderingContext2D,
  item: PowerUpItem,
  time: number
): void {
  ctx.save();
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;

  if (item.type === 'MUSHROOM' || item.type === 'ONE_UP') {
    // Luminescent Vitality Spore Cap
    const capColor = item.type === 'ONE_UP' ? '#10B981' : '#38BDF8';
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 7, cy + 1, 14, 11, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 3.5, 0, Math.PI * 2);
    ctx.arc(cx - 6, cy - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'FIRE_FLOWER') {
    // Sunfire Bloom
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 2);
    ctx.lineTo(cx, cy + 13);
    ctx.stroke();

    const pulse = Math.floor(time * 12) % 2 === 0;
    ctx.fillStyle = pulse ? '#F97316' : '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.type === 'STAR') {
    // Aether Star Crest
    ctx.translate(cx, cy);
    ctx.rotate(time * 3);
    ctx.fillStyle = Math.floor(time * 15) % 2 === 0 ? '#FACC15' : '#38BDF8';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    drawStarPolygon(ctx, 0, 0, 5, 13, 6);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius
    );
    rot += step;
    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius
    );
    rot += step;
  }
  ctx.closePath();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number
): void {
  if (
    player.invincibleTimer > 0 &&
    Math.floor(player.invincibleTimer * 20) % 2 === 0
  ) {
    return;
  }

  ctx.save();
  const cx = player.x + player.width / 2;
  const bottomY = player.y + player.height;

  ctx.translate(cx, bottomY);

  // Mid-air Double Jump 360-degree Rune Somersault
  if (player.spinJumpTimer > 0) {
    const progress = 1 - player.spinJumpTimer / 0.36;
    const angle = progress * Math.PI * 2 * player.facing;
    ctx.translate(0, -player.height / 2);
    ctx.rotate(angle);
    ctx.translate(0, player.height / 2);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -player.height / 2, player.height * 0.58, 0, Math.PI * 1.5);
    ctx.stroke();
  }

  ctx.scale(player.facing * player.scaleX, player.scaleY);

  const starColors = ['#38BDF8', '#FACC15', '#A855F7', '#34D399', '#F43F5E'];
  const isStar = player.starTimer > 0;
  const starColor = starColors[Math.floor(time * 24) % starColors.length];

  if (isStar) {
    ctx.fillStyle = `${starColor}44`;
    ctx.beginPath();
    ctx.arc(0, -player.height / 2, player.height * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kaelen the Runewarden (Original Hooded Ranger & Spore-Knight design)
  const isFlame = player.powerMode === 'FIRE';
  const isGuard = player.powerMode === 'SUPER';

  const cloakColor = isStar
    ? starColor
    : player.hitFlashTimer > 0
    ? '#FFFFFF'
    : isFlame
    ? '#F97316'
    : isGuard
    ? '#0284C7'
    : '#059669';

  const tunicColor = isStar
    ? '#FACC15'
    : player.hitFlashTimer > 0
    ? '#FFFFFF'
    : isFlame
    ? '#7C2D12'
    : isGuard
    ? '#1E293B'
    : '#1E293B';

  const h = player.height;
  const runSwing =
    player.onGround && Math.abs(player.vx) > 10
      ? Math.sin(time * 22) * 5
      : !player.onGround
      ? 5
      : 0;

  // Flowing Ranger Cape
  const capeWave = Math.sin(time * 16) * 3;
  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.moveTo(-6, -h + 14);
  ctx.lineTo(-16 - capeWave, -10);
  ctx.lineTo(-4, -10);
  ctx.closePath();
  ctx.fill();

  // Boots
  ctx.fillStyle = '#451A03';
  ctx.beginPath();
  ctx.roundRect(-10 + runSwing, -8, 9, 8, 3);
  ctx.roundRect(1 - runSwing, -8, 9, 8, 3);
  ctx.fill();

  // Tunic & Rune Breastplate
  const bodyH = h * 0.46;
  const bodyY = -8 - bodyH;
  ctx.fillStyle = tunicColor;
  ctx.beginPath();
  ctx.roundRect(-10, bodyY, 20, bodyH, 5);
  ctx.fill();

  // Glowing Rune Crest on Chest
  ctx.fillStyle = isFlame ? '#FACC15' : '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(2, bodyY + 5);
  ctx.lineTo(7, bodyY + 10);
  ctx.lineTo(2, bodyY + 15);
  ctx.lineTo(-3, bodyY + 10);
  ctx.closePath();
  ctx.fill();

  // Head & Pointed Ranger Hood
  const headY = bodyY - 14;
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.arc(1, headY + 6, 9, 0, Math.PI * 2);
  ctx.fill();

  // Expressive Eyes
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(4, headY + 3, 3, 5);

  // Pointed Hood & Visor Rim
  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.moveTo(-12, headY + 6);
  ctx.lineTo(-4, headY - 7);
  ctx.lineTo(12, headY + 3);
  ctx.closePath();
  ctx.fill();

  // Gauntlet Hand
  ctx.fillStyle = '#FACC15';
  const armY = !player.onGround ? headY - 1 : bodyY + 8;
  ctx.beginPath();
  ctx.arc(8 - runSwing * 0.6, armY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number
): void {
  ctx.save();
  const cx = enemy.x + enemy.width / 2;
  const bottomY = enemy.y + enemy.height;

  ctx.translate(cx, bottomY);
  ctx.scale(enemy.scaleX, enemy.scaleY);

  if (enemy.state === ' KNOCKED_OUT') {
    ctx.translate(0, -enemy.height / 2);
    ctx.scale(1, -1);
    ctx.translate(0, enemy.height / 2);
  }

  const waddle = Math.sin(time * 12 + enemy.id) * 3;

  switch (enemy.type) {
    case 'GOOMBA': {
      // Sporecrawler (Bioluminescent Purple-Cap Fungus Foe)
      if (enemy.state === 'SQUISHED') {
        ctx.fillStyle = '#6B21A8';
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 10, 4);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.fillStyle = '#1E1B4B';
      ctx.beginPath();
      ctx.ellipse(-6 + waddle, -4, 5, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(6 - waddle, -4, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E9D5FF';
      ctx.beginPath();
      ctx.roundRect(-8, -13, 16, 10, 3);
      ctx.fill();

      ctx.fillStyle = enemy.hitFlashTimer > 0 ? '#FFFFFF' : '#7E22CE';
      ctx.strokeStyle = '#3B0764';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.quadraticCurveTo(0, -34, 14, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Spore Spots
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(-5, -21, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -20, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-6, -15, 3, 4);
      ctx.fillRect(3, -15, 3, 4);
      break;
    }

    case 'KOOPA':
    case 'BUZZY': {
      // Carapace Strider & Ironback Beetle
      const isBuzzy = enemy.type === 'BUZZY';
      const shellColor = isBuzzy ? '#312E81' : '#0D9488';
      const rimColor = isBuzzy ? '#38BDF8' : '#FACC15';

      if (enemy.state === 'SHELL_IDLE' || enemy.state === 'SHELL_MOVING') {
        ctx.fillStyle = shellColor;
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -12, 13, Math.PI, 0);
        ctx.lineTo(13, -4);
        ctx.lineTo(-13, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.scale(enemy.facing, 1);

      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-9 + waddle, -6, 7, 6);
      ctx.fillRect(2 - waddle, -6, 7, 6);

      ctx.fillStyle = shellColor;
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-2, -16, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (!isBuzzy) {
        ctx.fillStyle = '#5EEAD4';
        ctx.beginPath();
        ctx.arc(9, -26, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(10, -28, 2.5, 4);
      } else {
        ctx.fillStyle = '#F43F5E';
        ctx.fillRect(5, -14, 3, 4);
      }
      break;
    }

    case 'PIRANHA': {
      // Briarmaw (Thorn-Vine Conduit Snapper)
      if (enemy.state === 'PIRANHA_WARN') {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.beginPath();
        ctx.arc(0, -4, 10 + Math.sin(time * 30) * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#10B981';
      ctx.fillRect(-5, -16, 10, 16);

      ctx.fillStyle = '#BE123C';
      ctx.strokeStyle = '#4C0519';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -24, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const mouthOpen = Math.abs(Math.sin(time * 9)) * 0.45 + 0.1;
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.arc(
        0,
        -24,
        13,
        -Math.PI / 2 - mouthOpen,
        -Math.PI / 2 + mouthOpen
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'HAMMER_BRO': {
      // Runecaster Acolyte
      ctx.scale(enemy.facing, 1);

      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-9 + waddle, -6, 7, 6);
      ctx.fillRect(2 - waddle, -6, 7, 6);

      ctx.fillStyle = '#4C1D95';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-11, -28, 22, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#DDD6FE';
      ctx.beginPath();
      ctx.arc(2, -33, 8, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.windupTimer > 0) {
        const flash = Math.floor(time * 20) % 2 === 0 ? '#38BDF8' : '#FACC15';
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(-6, -44, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'THWOMP': {
      // Cragwarden Monolith
      const shake =
        enemy.state === 'THWOMP_WARN' ? Math.sin(time * 60) * 3.5 : 0;
      ctx.translate(shake, 0);

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-22, -52, 44, 52, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-16, -46, 32, 40);

      const isAlert =
        enemy.state === 'THWOMP_WARN' || enemy.state === 'THWOMP_FALL';
      ctx.fillStyle = isAlert ? '#F43F5E' : '#38BDF8';
      ctx.fillRect(-12, -36, 9, 7);
      ctx.fillRect(3, -36, 9, 7);

      // Glowing Rune Sigil Mouth
      ctx.fillStyle = isAlert ? '#FACC15' : '#94A3B8';
      ctx.fillRect(-10, -18, 20, 6);
      break;
    }

    case 'PODOBOO': {
      // Magma Wisp
      ctx.translate(0, -14);
      if (enemy.vy > 0) {
        ctx.scale(1, -1);
      }
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, 2, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'BOWSER': {
      // Realm Warden / Malakor the Runeheart Tyrant
      ctx.scale(enemy.facing, 1);

      if (enemy.windupTimer > 0) {
        const r = 10 + Math.sin(time * 30) * 4;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.beginPath();
        ctx.arc(24, -38, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Obsidian Rune Carapace
      ctx.fillStyle = enemy.hitFlashTimer > 0 ? '#FFFFFF' : '#31102F';
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(-6, -30, 22, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Rune Core Chest
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.ellipse(6, -28, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crowned Tyrant Head
      ctx.fillStyle = '#4C0519';
      ctx.beginPath();
      ctx.roundRect(0, -54, 24, 18, 6);
      ctx.fill();

      // Twin Arcane Horns
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(4, -54);
      ctx.lineTo(0, -68);
      ctx.lineTo(10, -54);
      ctx.fill();

      ctx.fillStyle = '#FACC15';
      ctx.fillRect(14, -50, 5, 5);
      break;
    }
  }

  ctx.restore();
}

function drawFireBar(
  ctx: CanvasRenderingContext2D,
  bar: FireBarHazard,
  time: number
): void {
  ctx.save();
  for (let i = 0; i < bar.segments; i++) {
    const dist = i * 16;
    const fx = bar.x + Math.cos(bar.angle) * dist;
    const fy = bar.y + Math.sin(bar.angle) * dist;

    ctx.fillStyle =
      (i + Math.floor(time * 15)) % 2 === 0 ? '#F43F5E' : '#FACC15';
    ctx.beginPath();
    ctx.arc(fx, fy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  proj: Projectile,
  time: number
): void {
  ctx.save();
  const cx = proj.x + proj.width / 2;
  const cy = proj.y + proj.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(proj.rotation);

  if (proj.type === 'PLAYER_FIREBALL') {
    ctx.fillStyle = Math.floor(time * 24) % 2 === 0 ? '#38BDF8' : '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (proj.type === 'ENEMY_HAMMER') {
    ctx.fillStyle = '#7E22CE';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeRect(-7, -7, 14, 14);
  } else if (proj.type === 'BOWSER_FIRE') {
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.alpha);
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = p.color;

  if (p.shape === 'CIRCLE') {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'BRICK') {
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
  } else {
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
  }

  ctx.restore();
}

function drawFloatingText(
  ctx: CanvasRenderingContext2D,
  ft: FloatingText
): void {
  ctx.save();
  ctx.globalAlpha = Math.min(1, ft.life / (ft.maxLife * 0.4));
  ctx.font = '800 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#090D16';
  ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
  ctx.fillStyle = ft.color;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

function drawRunePortalObelisk(
  ctx: CanvasRenderingContext2D,
  x: number,
  flagY: number,
  time: number
): void {
  ctx.save();
  const poleX = x + TILE_SIZE / 2;
  const topY = 3 * TILE_SIZE;
  const bottomY = 13 * TILE_SIZE;

  // Crystalline Pillar Shaft
  ctx.fillStyle = '#BAE6FD';
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 2;
  ctx.fillRect(poleX - 3, topY, 6, bottomY - topY);
  ctx.strokeRect(poleX - 3, topY, 6, bottomY - topY);

  // Floating Crown Rune Orb
  ctx.fillStyle = '#38BDF8';
  ctx.strokeStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(poleX, topY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pennant Rune Banner
  const wave = Math.sin(time * 6) * 4;
  ctx.fillStyle = '#10B981';
  ctx.strokeStyle = '#064E3B';
  ctx.beginPath();
  ctx.moveTo(poleX - 3, flagY);
  ctx.lineTo(poleX - 48, flagY + 14 + wave);
  ctx.lineTo(poleX - 3, flagY + 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(poleX - 20, flagY + 14 + wave * 0.4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSanctuaryGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: LevelData['theme']
): void {
  ctx.save();
  const w = 5 * TILE_SIZE;
  const h = 6 * TILE_SIZE;
  const mainStone =
    theme === 'RUNEHEART_KEEP'
      ? '#27272A'
      : theme === 'CRYSTAL_CAVERNS'
      ? '#1E293B'
      : '#334155';
  const trim = '#38BDF8';

  ctx.fillStyle = mainStone;
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y + 48, w, h - 48);
  ctx.strokeRect(x, y + 48, w, h - 48);

  ctx.fillRect(x + 32, y + 8, w - 64, 40);
  ctx.strokeRect(x + 32, y + 8, w - 64, 40);

  ctx.fillStyle = trim;
  for (let bx = x; bx < x + w; bx += 20) {
    ctx.fillRect(bx, y + 40, 12, 10);
  }
  for (let bx = x + 32; bx < x + w - 32; bx += 20) {
    ctx.fillRect(bx, y, 12, 10);
  }

  // Glowing Portal Archway
  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h - 32, 22, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 22, y + h);
  ctx.lineTo(x + w / 2 - 22, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
