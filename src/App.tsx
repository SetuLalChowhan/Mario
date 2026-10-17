import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameCanvas,
  GameControllerRef,
  StageFinishPayload,
} from './game/GameCanvas';
import {
  CAMPAIGN_BLUEPRINTS,
  getBlueprintById,
  WORLDS_METADATA,
} from './game/levels';
import { sound } from './game/sound';
import {
  ACHIEVEMENTS_CATALOG,
  ControlPreset,
  DIFFICULTY_CONFIGS,
  loadSaveData,
  recordStageCompletion,
  resetSaveData,
  runSaveSystemQA,
  SaveDataV1,
  TOTAL_CAMPAIGN_LEVELS,
  writeSaveData,
} from './game/storage';
import {
  Difficulty,
  GameState,
  HudTelemetry,
  StageClearSummary,
} from './game/types';

export default function App() {
  const [saveData, setSaveData] = useState<SaveDataV1>(() => loadSaveData());
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedWorldTab, setSelectedWorldTab] = useState<number>(1);
  const [pendingStartLevel, setPendingStartLevel] = useState<number | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [stageSummary, setStageSummary] = useState<StageClearSummary | null>(
    null
  );

  const [hud, setHud] = useState<HudTelemetry>(() => ({
    levelId: 1,
    score: 0,
    highScore: 0,
    coins: 0,
    totalCoinsInLevel: 20,
    relicsFound: 0,
    lives: DIFFICULTY_CONFIGS[saveData.difficulty].startingLives,
    worldIndex: 1,
    worldLabel: '1-1',
    worldTitle: 'Whispering Glade',
    timeLeft: DIFFICULTY_CONFIGS[saveData.difficulty].stageTimeSeconds,
    powerMode: DIFFICULTY_CONFIGS[saveData.difficulty].startPowerMode,
    starActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    bossName: '',
    checkpointReached: false,
    difficulty: saveData.difficulty,
  }));

  const controllerRef = useRef<GameControllerRef | null>(null);

  // Sync audio preferences with SoundEngine whenever settings change
  useEffect(() => {
    sound.configureAudio({
      muted: saveData.settings.muted,
      musicVolume: saveData.settings.musicVolume,
      sfxVolume: saveData.settings.sfxVolume,
    });
  }, [saveData.settings]);

  // Run non-destructive save system QA check once on mount
  useEffect(() => {
    runSaveSystemQA();
  }, []);

  const updateSave = useCallback((updater: (prev: SaveDataV1) => SaveDataV1) => {
    setSaveData((prev) => {
      const next = updater(prev);
      return writeSaveData(next);
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    updateSave((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        muted: !prev.settings.muted,
      },
    }));
  }, [updateSave]);

  const launchLevel = useCallback(
    (levelId: number, diffOverride?: Difficulty) => {
      const targetDiff = diffOverride ?? saveData.difficulty;
      const bp = getBlueprintById(levelId);
      setSelectedWorldTab(bp.worldNumber);
      updateSave((prev) => ({
        ...prev,
        difficulty: targetDiff,
        hasSelectedInitialDifficulty: true,
        lastPlayedLevel: levelId,
      }));
      controllerRef.current?.startStage(levelId, targetDiff);
    },
    [saveData.difficulty, updateSave]
  );

  const handlePlayButtonClick = useCallback(
    (targetLevelId?: number) => {
      const levelToStart = targetLevelId ?? saveData.lastPlayedLevel ?? 1;
      // First-time player experience: show difficulty selection before first level
      if (!saveData.hasSelectedInitialDifficulty) {
        setPendingStartLevel(levelToStart);
        setGameState('DIFFICULTY_SELECT');
        return;
      }
      launchLevel(levelToStart);
    },
    [launchLevel, saveData.hasSelectedInitialDifficulty, saveData.lastPlayedLevel]
  );

  const handleStageComplete = useCallback(
    (payload: StageFinishPayload) => {
      const result = recordStageCompletion(saveData, {
        levelId: payload.levelId,
        score: payload.score,
        shardsCollected: payload.shardsCollected,
        totalShardsInLevel: payload.totalShardsInLevel,
        relicsFound: payload.relicsFound,
        timeTakenSeconds: payload.timeTakenSeconds,
        timeLeftSeconds: payload.timeLeftSeconds,
        playtimeDeltaSeconds: payload.timeTakenSeconds,
      });

      setSaveData(result.updatedSave);
      setStageSummary({
        levelId: payload.levelId,
        worldLabel: payload.worldLabel,
        levelTitle: payload.levelTitle,
        score: payload.score,
        shardsCollected: payload.shardsCollected,
        totalShardsInLevel: payload.totalShardsInLevel,
        relicsFound: payload.relicsFound,
        timeTaken: Math.round(payload.timeTakenSeconds * 10) / 10,
        timeLeft: payload.timeLeftSeconds,
        starsEarned: result.starsEarned,
        isNewBestScore: result.isNewBestScore,
        isNewBestTime: result.isNewBestTime,
        newlyUnlockedAchievements: result.newlyUnlockedAchievements,
      });

      if (payload.isFinalCampaignStage) {
        setGameState('VICTORY');
      } else {
        setGameState('STAGE_CLEAR');
      }
    },
    [saveData]
  );

  // Calculate aggregate campaign statistics
  let totalStarsEarned = 0;
  let completedStagesCount = 0;
  for (let i = 1; i <= TOTAL_CAMPAIGN_LEVELS; i++) {
    const rec = saveData.levels[i];
    if (rec) {
      totalStarsEarned += rec.stars;
      if (rec.completed) completedStagesCount++;
    }
  }

  const hasExistingProgress =
    saveData.hasSelectedInitialDifficulty &&
    (completedStagesCount > 0 || saveData.highestUnlockedLevel > 1);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#090d16]">
      {/* Isolated 60fps Canvas Simulation */}
      <GameCanvas
        gameState={gameState}
        difficulty={saveData.difficulty}
        settings={saveData.settings}
        onStateChange={setGameState}
        onHudUpdate={setHud}
        onStageComplete={handleStageComplete}
        controllerRef={controllerRef}
      />

      {/* IN-GAME PERIMETER HUD OVERLAY (Unobtrusive, pointer-events-none wrapper) */}
      {(gameState === 'PLAYING' ||
        gameState === 'PAUSED' ||
        gameState === 'STAGE_CLEAR' ||
        gameState === 'VICTORY' ||
        gameState === 'GAME_OVER') && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col justify-between p-3 md:px-7 md:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Left Cluster: KAELEN Score, Ward Lives & Active Rune Form */}
            <div className="flex items-center gap-5 bg-[#0f172a]/95 border-2 border-[#38BDF8] rounded-xl px-4 py-2 shadow-lg">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-[#38BDF8] font-display">
                  RUNEWARDEN · {saveData.difficulty}
                </div>
                <div className="text-lg md:text-xl font-extrabold text-white font-mono-num leading-tight">
                  {String(hud.score).padStart(6, '0')}
                </div>
              </div>

              <div className="h-7 w-[1px] bg-slate-700" />

              {/* Ward Lives & Power State */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2L20 7V13C20 17.5 16.5 21.3 12 22C7.5 21.3 4 17.5 4 13V7L12 2Z"
                      fill="#10B981"
                      stroke="#A7F3D0"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <span className="text-base md:text-lg font-bold text-white font-mono-num">
                    ×{hud.lives}
                  </span>
                </div>

                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>

                <div className="text-xs font-semibold text-sky-300 whitespace-nowrap">
                  {hud.starActive
                    ? 'AETHER WARD'
                    : hud.powerMode === 'FIRE'
                    ? 'FLAME WEAVER'
                    : hud.powerMode === 'SUPER'
                    ? 'RUNE GUARD'
                    : 'WANDERER'}
                </div>
              </div>
            </div>

            {/* Center Cluster: Rune Shards, Secret Relics, Stage & Timer */}
            <div className="flex items-center gap-5 bg-[#0f172a]/95 border-2 border-[#38BDF8] rounded-xl px-4 py-2 shadow-lg">
              {/* Rune Shards */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <polygon
                    points="12,2 20,12 12,22 4,12"
                    fill="#38BDF8"
                    stroke="#BAE6FD"
                    strokeWidth="1.8"
                  />
                </svg>
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-sky-300 font-display">
                    SHARDS
                  </div>
                  <div className="text-base md:text-lg font-extrabold text-white font-mono-num leading-tight">
                    {hud.coins}/{hud.totalCoinsInLevel}
                  </div>
                </div>
              </div>

              <div className="h-7 w-[1px] bg-slate-700" />

              {/* Secret Relics */}
              <div>
                <div className="text-[10px] font-bold tracking-wider text-amber-300 font-display">
                  RELICS
                </div>
                <div className="text-base md:text-lg font-extrabold text-amber-300 font-mono-num leading-tight">
                  {hud.relicsFound}/3
                </div>
              </div>

              <div className="h-7 w-[1px] bg-slate-700" />

              {/* Stage */}
              <div>
                <div className="text-[10px] font-bold tracking-wider text-emerald-300 font-display">
                  REALM {hud.worldLabel}
                </div>
                <div className="text-xs md:text-sm font-bold text-white whitespace-nowrap leading-tight">
                  {hud.worldTitle}
                  {hud.checkpointReached ? ' · CP ✓' : ''}
                </div>
              </div>

              <div className="h-7 w-[1px] bg-slate-700" />

              {/* Timer */}
              <div>
                <div className="text-[10px] font-bold tracking-wider text-sky-300 font-display">
                  TIME
                </div>
                <div
                  className={`text-base md:text-lg font-extrabold font-mono-num leading-tight ${
                    hud.timeLeft <= 60 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {String(hud.timeLeft).padStart(3, '0')}
                </div>
              </div>
            </div>

            {/* Right Cluster: Interactive Audio Mute & Pause Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={saveData.settings.muted ? 'Unmute Audio' : 'Mute Audio'}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0f172a]/95 border-2 border-slate-700 hover:border-[#38BDF8] text-white text-xs font-semibold transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{saveData.settings.muted ? 'Muted' : 'Audio On'}</span>
              </button>

              <button
                type="button"
                onClick={() => controllerRef.current?.togglePause()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0f172a]/95 border-2 border-slate-700 hover:border-[#38BDF8] text-white text-xs font-semibold transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Pause</span>
              </button>
            </div>
          </div>

          {/* Boss Health Bar in x-4 Stages */}
          {hud.bossMaxHp > 0 && hud.bossHp > 0 && (
            <div className="mt-3 self-center flex items-center gap-3 bg-[#1F122B]/95 border-2 border-rose-500 rounded-xl px-4 py-1.5 shadow-lg">
              <span className="text-xs font-extrabold tracking-wide text-rose-300 font-display whitespace-nowrap">
                {hud.bossName || 'REALM WARDEN'}
              </span>
              <div className="w-44 h-3 bg-slate-900 rounded overflow-hidden border border-rose-900">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-amber-400 transition-transform duration-150 origin-left"
                  style={{
                    transform: `scaleX(${hud.bossHp / hud.bossMaxHp})`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-amber-300 font-mono-num">
                {hud.bossHp}/{hud.bossMaxHp}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Touch Controls for Mobile / Tablet during Active Play */}
      {gameState === 'PLAYING' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex items-center justify-between px-5 md:hidden">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onPointerDown={() =>
                controllerRef.current?.triggerTouchInput('left', true)
              }
              onPointerUp={() =>
                controllerRef.current?.triggerTouchInput('left', false)
              }
              onPointerLeave={() =>
                controllerRef.current?.triggerTouchInput('left', false)
              }
              className="w-14 h-14 rounded-xl bg-slate-900/90 border-2 border-sky-400 text-white font-bold text-xl flex items-center justify-center active:scale-95"
              aria-label="Move Left"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() =>
                controllerRef.current?.triggerTouchInput('right', true)
              }
              onPointerUp={() =>
                controllerRef.current?.triggerTouchInput('right', false)
              }
              onPointerLeave={() =>
                controllerRef.current?.triggerTouchInput('right', false)
              }
              className="w-14 h-14 rounded-xl bg-slate-900/90 border-2 border-sky-400 text-white font-bold text-xl flex items-center justify-center active:scale-95"
              aria-label="Move Right"
            >
              ▶
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onPointerDown={() =>
                controllerRef.current?.triggerTouchInput('fire', true)
              }
              onPointerUp={() =>
                controllerRef.current?.triggerTouchInput('fire', false)
              }
              className="w-14 h-14 rounded-xl bg-amber-600/90 border-2 border-amber-300 text-white font-bold text-xs flex items-center justify-center active:scale-95"
            >
              BOLT
            </button>
            <button
              type="button"
              onPointerDown={() =>
                controllerRef.current?.triggerTouchInput('jump', true)
              }
              onPointerUp={() =>
                controllerRef.current?.triggerTouchInput('jump', false)
              }
              className="w-16 h-16 rounded-xl bg-emerald-600/90 border-2 border-emerald-300 text-white font-bold text-sm flex items-center justify-center active:scale-95"
            >
              JUMP
            </button>
          </div>
        </div>
      )}

      {/* ==================== 1. MAIN TITLE MENU ==================== */}
      {gameState === 'TITLE_MENU' && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-5 md:p-9 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/90 overflow-y-auto">
          {/* Top Bar: Campaign Progress & Audio Toggle */}
          <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs md:text-sm font-semibold text-slate-200 font-mono-num">
              <span>STARS {totalStarsEarned}/60</span>
              <span aria-hidden="true">·</span>
              <span>RELICS {saveData.totalRelicsFound}/60</span>
              <span aria-hidden="true">·</span>
              <span>SHARDS {saveData.totalShardsCollected}</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-300">
                DIFFICULTY: {saveData.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-sky-400 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {saveData.settings.muted ? 'Audio: Muted' : 'Audio: Active'}
              </button>
              <button
                type="button"
                onClick={() => setGameState('SETTINGS')}
                className="px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-sky-400 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </div>

          {/* Center Hero Title Lockup & Menu Actions */}
          <div className="flex flex-col items-center text-center max-w-2xl my-auto py-4">
            {/* Original Mushbound: Realm of Runes SVG Crest Lockup */}
            <svg
              className="w-full max-w-[520px] h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.75)]"
              viewBox="0 0 580 185"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="16"
                y="14"
                width="548"
                height="156"
                rx="20"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth="5"
              />
              <rect
                x="26"
                y="24"
                width="528"
                height="136"
                rx="14"
                fill="#1E293B"
                stroke="#0284C7"
                strokeWidth="2.5"
              />

              {/* Left Luminescent Spore Emblem */}
              <g transform="translate(52, 58)">
                <path
                  d="M4 28C4 12 16 2 30 2C44 2 56 12 56 28H4Z"
                  fill="#059669"
                  stroke="#A7F3D0"
                  strokeWidth="2.5"
                />
                <circle cx="20" cy="15" r="4.5" fill="#38BDF8" />
                <circle cx="39" cy="15" r="4.5" fill="#FACC15" />
                <rect
                  x="18"
                  y="28"
                  width="24"
                  height="18"
                  rx="5"
                  fill="#FDE68A"
                  stroke="#A7F3D0"
                  strokeWidth="2"
                />
              </g>

              {/* Right Arcane Rune Diamond Emblem */}
              <g transform="translate(476, 56)">
                <polygon
                  points="26,2 50,26 26,50 2,26"
                  fill="#38BDF8"
                  stroke="#FACC15"
                  strokeWidth="3"
                />
                <polygon points="26,12 38,26 26,40 14,26" fill="#0F172A" />
              </g>

              <text
                x="290"
                y="82"
                textAnchor="middle"
                fill="#090D16"
                fontFamily="Outfit, sans-serif"
                fontWeight="900"
                fontSize="50"
                letterSpacing="3"
              >
                MUSHBOUND
              </text>
              <text
                x="287"
                y="79"
                textAnchor="middle"
                fill="#38BDF8"
                fontFamily="Outfit, sans-serif"
                fontWeight="900"
                fontSize="50"
                letterSpacing="3"
              >
                MUSHBOUND
              </text>

              <text
                x="290"
                y="126"
                textAnchor="middle"
                fill="#FACC15"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="21"
                letterSpacing="6"
              >
                REALM OF RUNES
              </text>
            </svg>

            <p className="mt-3 text-sm text-slate-300 max-w-lg text-balance">
              Journey across 5 mystical worlds and 20 handcrafted stages. Master
              double-jump rune somersaults, awaken ancient Waystones, and reclaim
              the Realm of Runes.
            </p>

            {/* Primary CTA Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {hasExistingProgress && (
                <button
                  type="button"
                  onClick={() =>
                    handlePlayButtonClick(saveData.lastPlayedLevel)
                  }
                  className="px-7 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-display font-extrabold text-base tracking-wide border-2 border-[#A7F3D0] shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Resume Stage{' '}
                  {getBlueprintById(saveData.lastPlayedLevel).worldLabel}
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePlayButtonClick(1)}
                className="px-8 py-3.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-display font-extrabold text-base tracking-wide border-2 border-[#38BDF8] shadow-lg transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {hasExistingProgress ? 'Play Stage 1-1' : 'Start Adventure'}
              </button>

              <button
                type="button"
                onClick={() => setGameState('WORLD_MAP')}
                className="px-6 py-3.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-amber-300 font-display font-bold text-base border-2 border-amber-400/80 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              >
                World Map ({saveData.highestUnlockedLevel}/20)
              </button>
            </div>

            {/* Secondary Menu Navigation Row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPendingStartLevel(null);
                  setGameState('DIFFICULTY_SELECT');
                }}
                className="px-4 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Difficulty ({DIFFICULTY_CONFIGS[saveData.difficulty].title})
              </button>

              <button
                type="button"
                onClick={() => setGameState('ACHIEVEMENTS')}
                className="px-4 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Achievements ({saveData.achievements.length}/
                {ACHIEVEMENTS_CATALOG.length})
              </button>

              <button
                type="button"
                onClick={() => setGameState('HOW_TO_PLAY')}
                className="px-4 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                How to Play
              </button>

              <button
                type="button"
                onClick={() => setGameState('SETTINGS')}
                className="px-4 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </div>

          {/* Single Flat Control-Hint Line */}
          <div className="text-xs md:text-sm font-medium text-slate-300 tracking-wide text-center">
            Arrows / WASD Move · Up Arrow (×2) / Space Jump &amp; Double Jump ·
            Shift / Z Arcane Bolt &amp; Sprint · Esc Pause
          </div>
        </div>
      )}

      {/* ==================== 2. DIFFICULTY SELECTION MODAL ==================== */}
      {gameState === 'DIFFICULTY_SELECT' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-6 md:p-8 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-sky-400 tracking-wider">
                  SELECT CAMPAIGN CHALLENGE
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white font-display">
                  Choose Your Difficulty
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingStartLevel(null);
                  setGameState('TITLE_MENU');
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Back to Menu
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-300">
              Difficulty adjusts starting Ward Lives, initial armor state, enemy
              speed, stage timers, and score multipliers. You can change this
              anytime in Settings without losing your unlocked stages.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((diffKey) => {
                const cfg = DIFFICULTY_CONFIGS[diffKey];
                const isSelected = saveData.difficulty === diffKey;
                return (
                  <div
                    key={diffKey}
                    onClick={() =>
                      updateSave((prev) => ({
                        ...prev,
                        difficulty: diffKey,
                        hasSelectedInitialDifficulty: true,
                      }))
                    }
                    className={`flex flex-col justify-between rounded-xl p-5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-[#38BDF8] shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-base font-extrabold font-display"
                          style={{ color: cfg.badgeColor }}
                        >
                          {cfg.title}
                        </span>
                        {isSelected && (
                          <span className="text-xs font-bold text-sky-300">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">
                        {cfg.subtitle}
                      </div>
                      <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                        {cfg.description}
                      </p>

                      <ul className="mt-4 space-y-2 text-xs text-slate-200">
                        {cfg.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-sky-400 font-bold">·</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendingStartLevel !== null) {
                          const target = pendingStartLevel;
                          setPendingStartLevel(null);
                          launchLevel(target, diffKey);
                        } else {
                          updateSave((prev) => ({
                            ...prev,
                            difficulty: diffKey,
                            hasSelectedInitialDifficulty: true,
                          }));
                          setGameState('TITLE_MENU');
                        }
                      }}
                      className="mt-5 w-full py-2.5 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {pendingStartLevel !== null
                        ? `Start on ${cfg.id}`
                        : `Select ${cfg.id}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. WORLD MAP & 20-LEVEL SELECTOR ==================== */}
      {gameState === 'WORLD_MAP' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-6 md:p-8 shadow-2xl my-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-sky-400 tracking-wider">
                  REALM OF RUNES CAMPAIGN · 5 WORLDS · 20 STAGES
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white font-display">
                  World Map &amp; Stage Select
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs font-bold text-amber-300 font-mono-num">
                  STARS {totalStarsEarned}/60 · RELICS{' '}
                  {saveData.totalRelicsFound}/60
                </div>
                <button
                  type="button"
                  onClick={() => setGameState('TITLE_MENU')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Back to Menu
                </button>
              </div>
            </div>

            {/* 5 World Tabs */}
            <div className="mt-5 flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800">
              {WORLDS_METADATA.map((w) => {
                const firstLevelOfWorld = (w.worldNumber - 1) * 4 + 1;
                const isWorldUnlocked =
                  saveData.highestUnlockedLevel >= firstLevelOfWorld;
                const isSelected = selectedWorldTab === w.worldNumber;
                return (
                  <button
                    key={w.worldNumber}
                    type="button"
                    onClick={() => setSelectedWorldTab(w.worldNumber)}
                    className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0284C7] text-white shadow'
                        : isWorldUnlocked
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-[10px] font-bold tracking-wider opacity-85">
                      WORLD {w.worldNumber} {!isWorldUnlocked ? '· LOCKED' : ''}
                    </div>
                    <div className="text-xs md:text-sm font-extrabold truncate">
                      {w.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active World Banner */}
            {(() => {
              const activeWorld =
                WORLDS_METADATA[selectedWorldTab - 1] || WORLDS_METADATA[0];
              const worldLevels = CAMPAIGN_BLUEPRINTS.filter(
                (b) => b.worldNumber === activeWorld.worldNumber
              );

              return (
                <div className="mt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800">
                    <div>
                      <h3
                        className="text-xl font-extrabold font-display"
                        style={{ color: activeWorld.accentColor }}
                      >
                        World {activeWorld.worldNumber}: {activeWorld.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {activeWorld.description}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {activeWorld.subtitle}
                    </span>
                  </div>

                  {/* 4 Stage Cards for Selected World */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {worldLevels.map((bp) => {
                      const rec = saveData.levels[bp.levelId];
                      const unlocked =
                        bp.levelId <= saveData.highestUnlockedLevel;
                      const stars = rec?.stars || 0;

                      return (
                        <div
                          key={bp.levelId}
                          className={`flex flex-col justify-between rounded-xl p-4 border-2 transition-all ${
                            unlocked
                              ? 'bg-slate-900 border-slate-700 hover:border-sky-400'
                              : 'bg-slate-900/40 border-slate-800/80 opacity-65'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-sky-400 font-mono-num">
                                STAGE {bp.worldLabel}
                              </span>
                              {bp.isBossStage && (
                                <span className="text-[10px] font-bold text-rose-400">
                                  BOSS
                                </span>
                              )}
                            </div>

                            <h4 className="mt-1 text-base font-extrabold text-white font-display">
                              {bp.title}
                            </h4>

                            {/* 3-Star Rating Row */}
                            <div className="mt-3 flex items-center gap-1">
                              {[1, 2, 3].map((s) => (
                                <span
                                  key={s}
                                  className={`text-lg leading-none ${
                                    s <= stars
                                      ? 'text-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                              <span className="ml-2 text-xs text-slate-400 font-mono-num">
                                {stars}/3 Stars
                              </span>
                            </div>

                            {/* Best Records */}
                            <div className="mt-3 pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-300 font-mono-num">
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Best Score:
                                </span>
                                <span>{rec?.bestScore || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">
                                  Best Time:
                                </span>
                                <span>
                                  {rec?.bestTimeSeconds
                                    ? `${rec.bestTimeSeconds}s`
                                    : '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Relics:</span>
                                <span>{rec?.relicsFound || 0}/3</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!unlocked}
                            onClick={() => handlePlayButtonClick(bp.levelId)}
                            className={`mt-4 w-full py-2.5 px-4 rounded-lg font-bold text-xs transition-colors whitespace-nowrap ${
                              unlocked
                                ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {unlocked
                              ? rec?.completed
                                ? 'Replay Stage'
                                : 'Play Stage'
                              : `Complete ${
                                  getBlueprintById(bp.levelId - 1).worldLabel
                                } to Unlock`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== 4. HOW TO PLAY MODAL ==================== */}
      {gameState === 'HOW_TO_PLAY' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-6 md:p-8 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-white font-display">
                How to Play — Adventurer’s Guide
              </h2>
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-200">
              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-sky-300 font-display">
                  Controls (Desktop, Mobile &amp; Gamepad)
                </h3>
                <p>
                  <strong className="text-white">Move Left / Right:</strong>{' '}
                  Left / Right Arrow Keys, A / D, or Gamepad D-Pad / Left Stick.
                </p>
                <p>
                  <strong className="text-white">
                    Jump &amp; Double Jump:
                  </strong>{' '}
                  Press Up Arrow (`↑`), W, or Space once to jump. Press Up Arrow
                  (`↑`) a second time while airborne to perform a 360° Rune
                  Somersault Double Jump!
                </p>
                <p>
                  <strong className="text-white">
                    Sprint &amp; Cast Arcane Bolt:
                  </strong>{' '}
                  Hold Shift, Z, or X to run faster and cast bouncing Arcane
                  Bolts when empowered by the Sunfire Bloom.
                </p>
                <p>
                  <strong className="text-white">Pause Menu:</strong> Press Esc
                  or P anytime.
                </p>
              </div>

              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-amber-300 font-display">
                  Shrines, Relics &amp; 3-Star Mastery
                </h3>
                <p>
                  <strong className="text-white">Rune Shrines:</strong> Strike
                  glowing blue rune blocks from below to release Rune Shards,
                  Vitality Spores (Rune Guard armor), Sunfire Blooms (Arcane
                  Bolt spellcasting), or Aether Stars (invincibility).
                </p>
                <p>
                  <strong className="text-white">Waystone Checkpoints:</strong>{' '}
                  Touch the stone obelisk midway through any stage to save your
                  respawn point.
                </p>
                <p>
                  <strong className="text-white">3-Star Ratings:</strong> Earn
                  ★1 for clearing the stage, ★2 for collecting 60%+ Shards or
                  finishing quickly, and ★3 for finding all 3 hidden Secret
                  Relics!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. ACHIEVEMENTS MODAL ==================== */}
      {gameState === 'ACHIEVEMENTS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-6 md:p-8 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-300 tracking-wider">
                  HALL OF MILESTONES · {saveData.achievements.length}/
                  {ACHIEVEMENTS_CATALOG.length} UNLOCKED
                </div>
                <h2 className="text-2xl font-extrabold text-white font-display">
                  Achievements &amp; Honors
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Back to Menu
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {ACHIEVEMENTS_CATALOG.map((ach) => {
                const unlocked = saveData.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border ${
                      unlocked
                        ? 'bg-slate-900 border-amber-400/80'
                        : 'bg-slate-900/50 border-slate-800 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white font-display">
                        {ach.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          unlocked ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {unlocked ? 'UNLOCKED ✓' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      {ach.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. SETTINGS MODAL ==================== */}
      {gameState === 'SETTINGS' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-6 md:p-8 shadow-2xl my-auto">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-white font-display">
                Settings &amp; Controls
              </h2>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  setGameState('TITLE_MENU');
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Done
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs text-slate-200">
              {/* Difficulty Selector */}
              <div>
                <label className="block font-bold text-slate-300 mb-2">
                  Campaign Difficulty (Preserves Unlocked Progress)
                </label>
                <div className="flex items-center gap-2">
                  {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        updateSave((prev) => ({
                          ...prev,
                          difficulty: d,
                          hasSelectedInitialDifficulty: true,
                        }))
                      }
                      className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        saveData.difficulty === d
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {DIFFICULTY_CONFIGS[d].title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between font-semibold mb-1.5">
                    <span>Music Volume</span>
                    <span className="font-mono-num">
                      {saveData.settings.musicVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={saveData.settings.musicVolume}
                    onChange={(e) =>
                      updateSave((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          musicVolume: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1.5">
                    <span>Sound Effects Volume</span>
                    <span className="font-mono-num">
                      {saveData.settings.sfxVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={saveData.settings.sfxVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateSave((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          sfxVolume: val,
                        },
                      }));
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles: Mute, Double Jump, Reduced Motion */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 font-semibold text-center cursor-pointer whitespace-nowrap"
                >
                  Mute All: {saveData.settings.muted ? 'YES' : 'NO'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSave((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        doubleJumpEnabled: !prev.settings.doubleJumpEnabled,
                      },
                    }))
                  }
                  className="py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 font-semibold text-center cursor-pointer whitespace-nowrap"
                >
                  Double Jump:{' '}
                  {saveData.settings.doubleJumpEnabled ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateSave((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        reducedMotion: !prev.settings.reducedMotion,
                      },
                    }))
                  }
                  className="py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 font-semibold text-center cursor-pointer whitespace-nowrap"
                >
                  Reduced Motion:{' '}
                  {saveData.settings.reducedMotion ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Control Preset */}
              <div>
                <label className="block font-bold text-slate-300 mb-2">
                  Keyboard Control Binding Preset
                </label>
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'HYBRID', label: 'Hybrid (Arrows + WASD)' },
                      { id: 'ARROWS_ONLY', label: 'Arrow Keys Only' },
                      { id: 'WASD_ONLY', label: 'WASD Only' },
                    ] as Array<{ id: ControlPreset; label: string }>
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        updateSave((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            controlPreset: preset.id,
                          },
                        }))
                      }
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        saveData.settings.controlPreset === preset.id
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Progress with Confirmation */}
              <div className="pt-4 border-t border-slate-800">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-2.5 px-4 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-800 font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Reset All Saved Campaign Progress
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-500 text-center space-y-3">
                    <p className="text-xs font-bold text-white">
                      Are you sure? This will permanently erase all unlocked
                      levels, stars, relics, and high scores.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const fresh = resetSaveData();
                          setSaveData(fresh);
                          setConfirmReset(false);
                        }}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer whitespace-nowrap"
                      >
                        Yes, Erase Everything
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 7. PAUSE MODAL ==================== */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8] p-7 text-center shadow-2xl">
            <h2 className="text-2xl font-extrabold text-white font-display">
              Adventure Paused
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Stage {hud.worldLabel} · {hud.worldTitle} ({saveData.difficulty})
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => controllerRef.current?.resumeGame()}
                className="w-full py-3 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Resume Game
              </button>
              <button
                type="button"
                onClick={() => launchLevel(hud.levelId)}
                className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Restart Stage
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.stopMusic();
                  setGameState('WORLD_MAP');
                }}
                className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                World Map
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.stopMusic();
                  setGameState('TITLE_MENU');
                }}
                className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 8. STAGE CLEAR MODAL ==================== */}
      {gameState === 'STAGE_CLEAR' && stageSummary && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-[#10B981] p-7 text-center shadow-2xl">
            <div className="text-xs font-bold text-[#34D399] tracking-wider">
              REALM STAGE COMPLETE
            </div>
            <h2 className="mt-1 text-3xl font-extrabold text-white font-display">
              Stage {stageSummary.worldLabel} Cleared!
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {stageSummary.levelTitle}
            </p>

            {/* 3-Star Award */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`text-3xl ${
                    s <= stageSummary.starsEarned
                      ? 'text-amber-400'
                      : 'text-slate-700'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            <div className="mt-5 py-4 px-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="text-lg font-extrabold text-sky-300 font-mono-num">
                  {stageSummary.score}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">SHARDS</div>
                <div className="text-lg font-extrabold text-amber-300 font-mono-num">
                  {stageSummary.shardsCollected}/
                  {stageSummary.totalShardsInLevel}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">RELICS</div>
                <div className="text-lg font-extrabold text-purple-300 font-mono-num">
                  {stageSummary.relicsFound}/3
                </div>
              </div>
            </div>

            {stageSummary.newlyUnlockedAchievements.length > 0 && (
              <div className="mt-3 py-2 px-3 rounded-lg bg-amber-950/60 border border-amber-500/60 text-xs text-amber-200 font-semibold">
                Achievement Unlocked:{' '}
                {stageSummary.newlyUnlockedAchievements.join(', ')}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => controllerRef.current?.nextStage()}
                className="w-full py-3.5 px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-slate-950 font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                Continue to Stage{' '}
                {getBlueprintById(stageSummary.levelId + 1).worldLabel}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => launchLevel(stageSummary.levelId)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  Replay Stage
                </button>
                <button
                  type="button"
                  onClick={() => setGameState('WORLD_MAP')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs cursor-pointer whitespace-nowrap"
                >
                  World Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 9. CAMPAIGN VICTORY MODAL ==================== */}
      {gameState === 'VICTORY' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-[#FACC15] p-8 text-center shadow-2xl">
            <div className="text-xs font-bold text-[#FACC15] tracking-wider">
              REALM OF RUNES RESTORED
            </div>
            <h2 className="mt-1 text-3xl font-extrabold text-white font-display text-balance">
              Victory! Malakor Defeated!
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              You have conquered all 5 Worlds of Mushbound: Realm of Runes!
            </p>

            <div className="mt-6 py-4 px-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-around">
              <div>
                <div className="text-xs text-slate-400">STAGE SCORE</div>
                <div className="text-2xl font-extrabold text-amber-300 font-mono-num">
                  {hud.score}
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div>
                <div className="text-xs text-slate-400">TOTAL STARS</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono-num">
                  {totalStarsEarned}/60
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setGameState('WORLD_MAP')}
                className="w-full py-3.5 px-6 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                Explore World Map
              </button>
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 10. GAME OVER MODAL ==================== */}
      {gameState === 'GAME_OVER' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0F172A] border-2 border-rose-500 p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-extrabold text-rose-500 font-display">
              WARD SHATTERED
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Fallen in Stage {hud.worldLabel} · {hud.worldTitle}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => launchLevel(hud.levelId)}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                Retry Stage {hud.worldLabel}
              </button>
              <button
                type="button"
                onClick={() => setGameState('WORLD_MAP')}
                className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                World Map
              </button>
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
