import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, DEFAULT_GRAPHICS_SETTINGS } from './game/engine';
import { GameHUD } from './components/GameHUD';
import { MinimapTablet } from './components/MinimapTablet';
import { LoreModal } from './components/LoreModal';
import { GameOverModal } from './components/GameOverModal';
import { StartScreen } from './components/StartScreen';
import { PauseMenu } from './components/PauseMenu';
import { OptimizationModal, PRESETS } from './components/OptimizationModal';
import { TouchControls } from './components/TouchControls';
import { soundEngine } from './game/audio';
import { GameState, PlayerStats, SectorInfo, Difficulty, GraphicsSettings, GraphicsPreset } from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [stats, setStats] = useState<PlayerStats>({
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isCrouching: false,
    battery: 100,
    flashlightOn: true,
    heartRate: 70,
    sanity: 100,
    flares: 2,
    batteries: 1,
    syringes: 1,
    adrenalineActive: false,
    adrenalineTimeLeft: 0,
  });

  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [warningIntensity, setWarningIntensity] = useState<number>(0);
  const [escapeCountdown, setEscapeCountdown] = useState<number | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showOptimization, setShowOptimization] = useState<boolean>(false);
  const [survivedTime, setSurvivedTime] = useState<number>(0);

  // Graphics & Performance Optimization State
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>({ ...DEFAULT_GRAPHICS_SETTINGS });
  const [fps, setFps] = useState<number>(60);

  // Settings
  const [sensitivity, setSensitivity] = useState<number>(0.0022);
  const [volume, setVolume] = useState<number>(0.8);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
  });

  // Auto-detect touch on first screen touch
  useEffect(() => {
    const handleTouchFirst = () => {
      setIsTouchDevice(true);
    };
    window.addEventListener('touchstart', handleTouchFirst, { once: true });
    return () => window.removeEventListener('touchstart', handleTouchFirst);
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const timer = setInterval(() => {
      setSurvivedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // Apply graphics settings when updated
  const handleUpdateGraphics = (newSettings: GraphicsSettings) => {
    setGraphicsSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.applyGraphicsSettings(newSettings);
    }
  };

  // Handle Game Engine Setup
  const startGame = useCallback((selectedDifficulty: Difficulty = 'NORMAL', preset?: GraphicsPreset) => {
    if (!containerRef.current) return;

    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    setSurvivedTime(0);
    setEscapeCountdown(null);
    setShowMap(false);
    setShowLogs(false);
    setShowOptimization(false);

    let activeGraphics = { ...graphicsSettings };
    if (preset && PRESETS[preset]) {
      activeGraphics = {
        ...activeGraphics,
        ...PRESETS[preset].config,
        preset,
      };
      setGraphicsSettings(activeGraphics);
    }

    const engine = new GameEngine(
      containerRef.current,
      {
        onStatsUpdate: (newStats) => setStats({ ...newStats }),
        onStateChange: (newState) => {
          setGameState((current) => {
            if (current === 'GAMEOVER' || current === 'VICTORY') return current;
            return newState;
          });
        },
        onItemPrompt: (msg) => setPrompt(msg),
        onMonsterWarning: (intensity) => setWarningIntensity(intensity),
        onLogFound: () => {},
        onSectorVisited: (visitedSector) => {
          setSectors((prev) =>
            prev.map((s) => (s.id === visitedSector.id ? { ...s, coreCollected: true } : s))
          );
        },
        onEscapeCountdown: (sec) => setEscapeCountdown(sec),
        onFpsUpdate: (liveFps) => setFps(liveFps),
      },
      activeGraphics
    );

    engine.mouseSensitivity = sensitivity;
    engine.difficulty = selectedDifficulty;
    engineRef.current = engine;

    setSectors(engine.getSectors());
    engine.start();
    setGameState('PLAYING');

    // Request pointer lock for desktop mouse users only
    if (!isTouchDevice) {
      setTimeout(() => {
        if (containerRef.current) {
          try {
            containerRef.current.requestPointerLock?.();
          } catch {
            // Graceful fallback
          }
        }
      }, 100);
    }
  }, [sensitivity, graphicsSettings, isTouchDevice]);

  const restartGame = useCallback(() => {
    startGame('NORMAL');
  }, [startGame]);

  // Global keybinds for UI overlays (Map, Logs, Optimization, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' && gameState !== 'PAUSED') return;

      if (e.code === 'KeyM') {
        setShowMap((prev) => !prev);
      }
      if (e.code === 'KeyL') {
        setShowLogs((prev) => !prev);
      }
      if (e.code === 'KeyO') {
        setShowOptimization((prev) => !prev);
      }
      if (e.code === 'Escape') {
        if (showOptimization) {
          setShowOptimization(false);
          return;
        }
        if (showMap) setShowMap(false);
        if (showLogs) setShowLogs(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showMap, showLogs, showOptimization]);

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    if (engineRef.current) {
      engineRef.current.mouseSensitivity = val;
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    soundEngine.setVolume(val);
  };

  const handleResume = () => {
    if (!isTouchDevice && containerRef.current) {
      try {
        containerRef.current.requestPointerLock?.();
      } catch {
        // Fallback
      }
    }
    setGameState('PLAYING');
  };

  // Direct Engine Action Triggers
  const handleToggleFlashlight = () => {
    if (engineRef.current) {
      engineRef.current.toggleFlashlight();
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
    }
  };

  const handleThrowFlare = () => {
    if (engineRef.current) {
      engineRef.current.throwFlare();
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' }));
    }
  };

  const handleUseSyringe = () => {
    if (engineRef.current) {
      engineRef.current.useSyringe();
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
    }
  };

  const handleReloadBattery = () => {
    if (engineRef.current) {
      engineRef.current.reloadBattery();
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    }
  };

  const handleInteract = () => {
    if (engineRef.current) {
      engineRef.current.tryInteract();
    } else {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }
  };

  const handleToggleSprint = () => {
    if (engineRef.current) {
      engineRef.current.toggleSprint();
    }
  };

  const handleToggleCrouch = () => {
    if (engineRef.current) {
      engineRef.current.toggleCrouch();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair focus:outline-none"
        id="game-viewport"
      />

      {/* Start / Intro Screen */}
      {gameState === 'MENU' && (
        <StartScreen onStart={startGame} currentPreset={graphicsSettings.preset} />
      )}

      {/* In-Game Active HUD */}
      {gameState === 'PLAYING' && (
        <>
          <GameHUD
            stats={stats}
            sectors={sectors}
            prompt={prompt}
            warningIntensity={warningIntensity}
            escapeCountdown={escapeCountdown}
            fps={fps}
            showFps={graphicsSettings.showFps}
            isTouchDevice={isTouchDevice}
            onOpenOptimization={() => setShowOptimization(true)}
            onOpenMap={() => setShowMap(true)}
            onOpenLogs={() => setShowLogs(true)}
            onToggleFlashlight={handleToggleFlashlight}
            onThrowFlare={handleThrowFlare}
            onUseSyringe={handleUseSyringe}
            onReloadBattery={handleReloadBattery}
          />
          {isTouchDevice && (
            <TouchControls
              stats={stats}
              prompt={prompt}
              isSprinting={stats.isSprinting}
              isCrouching={stats.isCrouching}
              onMove={(x, y) => engineRef.current?.setTouchMovement(x, y)}
              onLook={(dx, dy) => engineRef.current?.rotateCamera(dx, dy)}
              onToggleFlashlight={handleToggleFlashlight}
              onThrowFlare={handleThrowFlare}
              onUseSyringe={handleUseSyringe}
              onReloadBattery={handleReloadBattery}
              onInteract={handleInteract}
              onToggleSprint={handleToggleSprint}
              onToggleCrouch={handleToggleCrouch}
              onOpenMap={() => setShowMap(true)}
              onOpenLogs={() => setShowLogs(true)}
              onOpenOptimization={() => setShowOptimization(true)}
              onPause={() => setGameState('PAUSED')}
            />
          )}
        </>
      )}

      {/* Tactical Radar Minimap Tablet Overlay */}
      {showMap && engineRef.current && (
        <MinimapTablet
          playerPos={engineRef.current.getPlayerPosition()}
          sectors={sectors}
          grid={engineRef.current.getMazeGrid()}
          wardrobes={engineRef.current.getWardrobes()}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Lore Notes Archive Overlay */}
      {showLogs && engineRef.current && (
        <LoreModal
          logs={engineRef.current.getLogs()}
          onClose={() => setShowLogs(false)}
        />
      )}

      {/* Optimization & Lag Reduction Modal */}
      {showOptimization && (
        <OptimizationModal
          settings={graphicsSettings}
          fps={fps}
          onUpdateSettings={handleUpdateGraphics}
          onClose={() => setShowOptimization(false)}
        />
      )}

      {/* Pause Menu */}
      {gameState === 'PAUSED' && !showMap && !showLogs && !showOptimization && (
        <PauseMenu
          onResume={handleResume}
          onRestart={restartGame}
          sensitivity={sensitivity}
          onSensitivityChange={handleSensitivityChange}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          currentPreset={graphicsSettings.preset}
          onOpenOptimization={() => setShowOptimization(true)}
        />
      )}

      {/* Game Over / Victory Screen */}
      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <GameOverModal
          state={gameState}
          survivedTime={survivedTime}
          sectors={sectors}
          onRestart={restartGame}
        />
      )}
    </div>
  );
}
