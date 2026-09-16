import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Flashlight,
  Flame,
  Compass,
  Zap,
  BatteryCharging,
  FileText,
  Pause,
  Shield,
  Activity,
  Hand,
  Sliders
} from 'lucide-react';
import { PlayerStats } from '../types';

interface TouchControlsProps {
  stats: PlayerStats;
  prompt: string | null;
  onMove: (x: number, y: number) => void;
  onLook: (dx: number, dy: number) => void;
  onToggleFlashlight: () => void;
  onThrowFlare: () => void;
  onUseSyringe: () => void;
  onReloadBattery: () => void;
  onInteract: () => void;
  onToggleSprint: () => void;
  onToggleCrouch: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  onOpenOptimization: () => void;
  onPause: () => void;
  isSprinting: boolean;
  isCrouching: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  stats,
  prompt,
  onMove,
  onLook,
  onToggleFlashlight,
  onThrowFlare,
  onUseSyringe,
  onReloadBattery,
  onInteract,
  onToggleSprint,
  onToggleCrouch,
  onOpenMap,
  onOpenLogs,
  onOpenOptimization,
  onPause,
  isSprinting,
  isCrouching,
}) => {
  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Look surface touch tracking
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleJoystickTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (joystickTouchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      joystickTouchIdRef.current = touch.identifier;
      setIsJoystickActive(true);

      if (joystickBaseRef.current) {
        const rect = joystickBaseRef.current.getBoundingClientRect();
        joystickOriginRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      const dx = touch.clientX - joystickOriginRef.current.x;
      const dy = touch.clientY - joystickOriginRef.current.y;
      const dist = Math.hypot(dx, dy);
      const maxR = 48;
      const clampedDist = Math.min(dist, maxR);
      const angle = Math.atan2(dy, dx);

      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      setKnobPos({ x: kx, y: ky });

      // Normalized direction vector (-1 to 1)
      onMove(kx / maxR, ky / maxR);
    },
    [onMove]
  );

  const handleJoystickTouchMove = useCallback(
    (e: TouchEvent) => {
      if (joystickTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchIdRef.current) {
          const dx = touch.clientX - joystickOriginRef.current.x;
          const dy = touch.clientY - joystickOriginRef.current.y;
          const dist = Math.hypot(dx, dy);
          const maxR = 48;
          const clampedDist = Math.min(dist, maxR);
          const angle = Math.atan2(dy, dx);

          const kx = Math.cos(angle) * clampedDist;
          const ky = Math.sin(angle) * clampedDist;
          setKnobPos({ x: kx, y: ky });

          // Normalized direction vector (-1 to 1)
          onMove(kx / maxR, ky / maxR);
          break;
        }
      }
    },
    [onMove]
  );

  const handleJoystickTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (joystickTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchIdRef.current) {
          joystickTouchIdRef.current = null;
          setIsJoystickActive(false);
          setKnobPos({ x: 0, y: 0 });
          onMove(0, 0);
          break;
        }
      }
    },
    [onMove]
  );

  // Look area touch handlers
  const handleLookTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Pick the first touch that starts in the look area
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleLookTouchMove = useCallback(
    (e: TouchEvent) => {
      if (lookTouchIdRef.current === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          const dx = touch.clientX - lastLookPosRef.current.x;
          const dy = touch.clientY - lastLookPosRef.current.y;
          lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            onLook(dx, dy);
          }
          break;
        }
      }
    },
    [onLook]
  );

  const handleLookTouchEnd = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  // Global touch listeners to ensure drag continuity even if fingers slide outside divs
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      handleJoystickTouchMove(e);
      handleLookTouchMove(e);
    };

    const onTouchEnd = (e: TouchEvent) => {
      handleJoystickTouchEnd(e);
      handleLookTouchEnd(e);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleJoystickTouchMove, handleLookTouchMove, handleJoystickTouchEnd, handleLookTouchEnd]);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono z-30"
      style={{ touchAction: 'none' }}
    >
      {/* 1. Seamless Touch Look Pad (Covers full screen except bottom-left joystick and right buttons) */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ touchAction: 'none' }}
        onTouchStart={handleLookTouchStart}
      />

      {/* 2. Top-Right Mobile Quick Utility Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto z-40">
        <button
          onClick={onOpenOptimization}
          className="flex items-center gap-1 bg-zinc-950/80 border border-amber-500/50 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 shadow-md backdrop-blur-md"
          title="성능 최적화"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>최적화</span>
        </button>

        <button
          onClick={onOpenLogs}
          className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-700 text-zinc-300 active:scale-95 shadow-md backdrop-blur-md"
          title="연구 일지"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenMap}
          className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 active:scale-95 shadow-md backdrop-blur-md"
          title="단말기 지도"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={onPause}
          className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-700 text-zinc-300 active:scale-95 shadow-md backdrop-blur-md"
          title="일시 정지"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Bottom-Left Virtual Joystick for WASD Movement */}
      <div
        className="absolute bottom-6 left-6 pointer-events-auto flex items-center justify-center z-40"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          className={`relative w-36 h-36 rounded-full border-2 transition-colors flex items-center justify-center backdrop-blur-md ${
            isJoystickActive
              ? 'bg-zinc-950/70 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
              : 'bg-zinc-950/50 border-zinc-700/80 shadow-lg'
          }`}
        >
          {/* Subtle Directional Marks */}
          <span className="absolute top-1.5 text-[10px] font-bold text-zinc-500">▲ 전진</span>
          <span className="absolute bottom-1.5 text-[10px] font-bold text-zinc-500">▼ 후진</span>
          <span className="absolute left-2 text-[10px] font-bold text-zinc-500">◄</span>
          <span className="absolute right-2 text-[10px] font-bold text-zinc-500">►</span>

          {/* Center Neutral Ring */}
          <div className="w-12 h-12 rounded-full border border-zinc-800/80 pointer-events-none" />

          {/* Dynamic Draggable Knob */}
          <div
            className={`absolute w-14 h-14 rounded-full border-2 flex items-center justify-center transition-shadow pointer-events-none ${
              isJoystickActive
                ? 'bg-gradient-to-tr from-cyan-600 to-cyan-400 border-white text-black shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                : 'bg-zinc-800/90 border-zinc-500 text-zinc-300 shadow-md'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isJoystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/70 shadow-sm" />
          </div>
        </div>
      </div>

      {/* 4. Bottom-Right Ergonomic Action Buttons */}
      <div className="absolute bottom-6 right-5 pointer-events-auto flex flex-col items-end gap-3 z-40">
        {/* Dynamic Contextual Interaction Button [E] */}
        <div className="relative flex flex-col items-end">
          {prompt && (
            <div className="absolute right-0 -top-8 px-3 py-1 bg-amber-500 text-black font-black text-xs rounded-full shadow-lg whitespace-nowrap animate-bounce border border-amber-300">
              {prompt}
            </div>
          )}
          <button
            onClick={onInteract}
            className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center transition-all active:scale-90 shadow-2xl ${
              prompt
                ? 'bg-gradient-to-tr from-amber-600 to-amber-400 border-amber-200 text-black shadow-[0_0_22px_rgba(245,158,11,0.9)] animate-pulse'
                : 'bg-zinc-900/85 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Hand className="w-6 h-6" />
            <span className="text-[10px] font-black mt-0.5">[E] 상호작용</span>
          </button>
        </div>

        {/* Movement Modifiers: Sprint & Crouch Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Sprint Toggle */}
          <button
            onClick={onToggleSprint}
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition active:scale-95 shadow-lg backdrop-blur-md ${
              isSprinting
                ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                : 'bg-zinc-950/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSprinting ? 'fill-current' : ''}`} />
            <span>{isSprinting ? '질주 ON' : '질주'}</span>
          </button>

          {/* Crouch Toggle */}
          <button
            onClick={onToggleCrouch}
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition active:scale-95 shadow-lg backdrop-blur-md ${
              isCrouching
                ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black'
                : 'bg-zinc-950/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className={`w-4 h-4 ${isCrouching ? 'fill-current' : ''}`} />
            <span>{isCrouching ? '은신 ON' : '은신'}</span>
          </button>
        </div>

        {/* Tactical Survival Item Bar */}
        <div className="flex items-center gap-2.5">
          {/* Flashlight Toggle */}
          <button
            onClick={onToggleFlashlight}
            className={`relative w-12 h-12 rounded-full border flex items-center justify-center transition active:scale-95 shadow-lg backdrop-blur-md ${
              stats.flashlightOn
                ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-zinc-950/80 border-zinc-700 text-zinc-500'
            }`}
            title="손전등 켜기/끄기"
          >
            <Flashlight className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
              {Math.round(stats.battery)}%
            </span>
          </button>

          {/* Throw Flare */}
          <button
            onClick={onThrowFlare}
            className="relative w-12 h-12 rounded-full border border-red-500/60 bg-red-950/50 active:bg-red-800 text-red-300 flex items-center justify-center active:scale-95 shadow-lg backdrop-blur-md"
            title="조명탄 전방 투척"
          >
            <Flame className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white shadow">
              {stats.flares}
            </span>
          </button>

          {/* Adrenaline Syringe */}
          <button
            onClick={onUseSyringe}
            className={`relative w-12 h-12 rounded-full border flex items-center justify-center active:scale-95 shadow-lg backdrop-blur-md ${
              stats.adrenalineActive
                ? 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_14px_rgba(16,185,129,0.7)] animate-pulse'
                : 'border-emerald-500/60 bg-emerald-950/50 active:bg-emerald-800 text-emerald-300'
            }`}
            title="아드레날린 주사기 사용"
          >
            <Activity className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow">
              {stats.syringes}
            </span>
          </button>

          {/* Flashlight Battery Reload */}
          <button
            onClick={onReloadBattery}
            className="relative w-12 h-12 rounded-full border border-amber-500/60 bg-amber-950/50 active:bg-amber-800 text-amber-300 flex items-center justify-center active:scale-95 shadow-lg backdrop-blur-md"
            title="배터리 충전"
          >
            <BatteryCharging className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-600 text-black shadow">
              {stats.batteries}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
