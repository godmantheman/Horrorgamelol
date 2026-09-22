import React from 'react';
import { PlayerStats, SectorInfo } from '../types';
import {
  Flashlight,
  Activity,
  Zap,
  Flame,
  BatteryCharging,
  Eye,
  AlertTriangle,
  Compass,
  Shield,
} from 'lucide-react';

interface GameHUDProps {
  stats: PlayerStats;
  sectors: SectorInfo[];
  prompt: string | null;
  warningIntensity: number; // 0 - 1
  escapeCountdown: number | null;
  fps?: number;
  showFps?: boolean;
  isTouchDevice?: boolean;
  onOpenOptimization: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  onToggleFlashlight: () => void;
  onThrowFlare: () => void;
  onUseSyringe: () => void;
  onReloadBattery: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  sectors,
  prompt,
  warningIntensity,
  escapeCountdown,
  fps,
  showFps = true,
  isTouchDevice = false,
  onOpenOptimization,
  onOpenMap,
  onOpenLogs,
  onToggleFlashlight,
  onThrowFlare,
  onUseSyringe,
  onReloadBattery,
}) => {
  const isHighDanger = warningIntensity > 0.45;
  const isPanic = stats.heartRate > 135;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-zinc-100">
      {/* 1. Monster Proximity Static & Vignette Filter */}
      {warningIntensity > 0.05 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            backgroundColor: isHighDanger ? 'rgba(180, 15, 15, 0.18)' : 'rgba(10, 10, 15, 0.1)',
            boxShadow: `inset 0 0 ${Math.round(warningIntensity * 120)}px rgba(220, 20, 20, ${warningIntensity * 0.7})`,
            filter: `blur(${warningIntensity * 1.2}px)`,
          }}
        />
      )}

      {/* Screen Film Grain & Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* Wardrobe / Locker Peeking Stealth Overlay */}
      {stats.isHiding && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between">
          {/* Top locker door frame with ventilation slats */}
          <div className="w-full bg-gradient-to-b from-black via-zinc-950/95 to-transparent h-28 sm:h-36 border-b-4 border-zinc-900 flex flex-col items-center justify-start pt-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md animate-pulse">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase">
                [ 🔒 옷장 내부 은신 중 ]
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-1 font-semibold tracking-wide">
              괴물이 시야를 잃었습니다. 수색 후 다른 곳으로 떠나갈 때까지 숨죽이십시오.
            </div>
            {/* Locker ventilation slits visual */}
            <div className="flex gap-2 sm:gap-3 mt-2 opacity-50">
              <div className="w-10 sm:w-16 h-1 bg-zinc-800 rounded-full" />
              <div className="w-10 sm:w-16 h-1 bg-zinc-800 rounded-full" />
              <div className="w-10 sm:w-16 h-1 bg-zinc-800 rounded-full" />
            </div>
          </div>

          {/* Left and Right locker door edge frames (peeking viewport) */}
          <div className="flex-1 flex justify-between">
            <div className="w-6 sm:w-16 bg-gradient-to-r from-black to-transparent h-full border-r border-zinc-800/40" />
            <div className="w-6 sm:w-16 bg-gradient-to-l from-black to-transparent h-full border-l border-zinc-800/40" />
          </div>

          {/* Bottom locker door frame */}
          <div className="w-full bg-gradient-to-t from-black via-zinc-950/95 to-transparent h-24 sm:h-32 border-t-4 border-zinc-900 flex flex-col items-center justify-end pb-3">
            <div className="px-3 py-1 rounded bg-zinc-900/90 border border-zinc-700 text-amber-300 text-xs font-bold shadow-lg">
              [E] 키 또는 [상호작용] 버튼을 눌러 옷장 밖으로 나가기
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Banner: Escape Countdown or Danger Warning */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {escapeCountdown !== null ? (
          <div className="flex items-center gap-3 bg-red-950/80 border border-red-500/80 px-6 py-2.5 rounded shadow-lg backdrop-blur animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
            <div className="text-center">
              <div className="text-xs text-red-300 font-bold tracking-widest uppercase">
                비상 탈출 격벽 개방 시퀀스 진행 중
              </div>
              <div className="text-2xl font-black text-red-100 tracking-wider">
                {escapeCountdown}초 남음 — 버텨라!
              </div>
            </div>
          </div>
        ) : isHighDanger ? (
          <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/50 px-4 py-1.5 rounded backdrop-blur">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-300 tracking-wider">
              위험 개체 접근 중: 즉시 은신하거나 조명탄을 사용하십시오
            </span>
          </div>
        ) : null}
      </div>

      {/* 3. Top Left: Anomaly Core Status (4 Objectives) */}
      <div className="absolute top-4 left-4 bg-zinc-950/85 border border-zinc-800/80 p-2.5 sm:p-3.5 rounded-md backdrop-blur-md max-w-[200px] sm:max-w-none z-20">
        <div className="flex items-center justify-between gap-3 mb-1.5 sm:mb-2 pb-1 border-b border-zinc-800 text-[11px] sm:text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">보조 에너지 </span>코어 수집
          </span>
          <span className="font-bold text-zinc-200">
            {sectors.filter((s) => s.coreCollected).length} / {sectors.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 sm:gap-2">
          {sectors.map((sector) => (
            <div
              key={sector.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] sm:text-[11px] border transition-colors ${
                sector.coreCollected
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
              }`}
            >
              <div
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                  sector.coreCollected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-700'
                }`}
              />
              <span className="truncate">{sector.koreanName.split(':')[0]}</span>
            </div>
          ))}
        </div>

        {/* Mobile Compact Vital Meters (shown under core status on touch screens) */}
        {isTouchDevice && (
          <div className="mt-2 pt-2 border-t border-zinc-800 flex flex-col gap-1.5 md:hidden">
            {/* Stamina bar */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> 스태미나
              </span>
              <span className="font-bold text-zinc-200">{Math.round(stats.stamina)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.adrenalineActive
                    ? 'bg-amber-400'
                    : stats.stamina < 25
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${stats.stamina}%` }}
              />
            </div>

            {/* Heart rate */}
            <div className="flex items-center justify-between text-[10px] mt-0.5">
              <span className="text-zinc-400 flex items-center gap-1">
                <Activity className={`w-3 h-3 ${isPanic ? 'text-red-400' : 'text-emerald-400'}`} />
                심박수
              </span>
              <span className={`font-bold ${isPanic ? 'text-red-400' : 'text-zinc-200'}`}>
                {stats.heartRate} BPM
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Top Right: Desktop Quick Utility Buttons & Live FPS */}
      <div className="absolute top-5 right-5 flex items-center gap-2 pointer-events-auto z-20">
        {showFps && (
          <button
            onClick={onOpenOptimization}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition active:scale-95 ${
              (fps || 60) >= 50
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : (fps || 60) >= 30
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : 'bg-red-950/80 border-red-500/50 text-red-400 animate-pulse'
            }`}
            title="실시간 FPS 카운터 및 성능 최적화 열기"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{fps || 60} FPS</span>
          </button>
        )}

        {/* Desktop-only quick action buttons (TouchControls provides mobile buttons) */}
        {!isTouchDevice && (
          <>
            <button
              onClick={onOpenOptimization}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs px-3 py-1.5 rounded shadow transition active:scale-95 font-bold"
              title="렉 완벽 제거 및 감자 PC 최적화 설정"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>최적화</span>
            </button>

            <button
              onClick={onOpenMap}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded shadow transition active:scale-95"
              title="휴대용 단말기 지도"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>단말기 [M]</span>
            </button>
            <button
              onClick={onOpenLogs}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded shadow transition active:scale-95"
              title="발견된 연구원 기록"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>기록 [L]</span>
            </button>
          </>
        )}
      </div>

      {/* 5. Center Interaction Prompt & Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {/* Subtle Crosshair */}
        <div className="w-1.5 h-1.5 bg-zinc-400/60 rounded-full" />

        {/* Interaction Prompt Box */}
        {prompt && (
          <div className="absolute top-[56%] bg-zinc-950/90 border border-amber-500/70 text-amber-300 px-4 py-2 rounded shadow-xl backdrop-blur-md text-sm font-semibold flex items-center gap-2 animate-pulse">
            <span>{prompt}</span>
          </div>
        )}
      </div>

      {/* 6. Bottom Left: Desktop Biometric Monitor (Heart Rate & Stamina) */}
      {!isTouchDevice && (
        <div className="absolute bottom-5 left-5 hidden md:flex flex-col gap-2.5 z-20">
          {/* Heart Rate ECG */}
          <div
            className={`flex items-center gap-3 px-3.5 py-2 rounded-md border backdrop-blur-md transition-colors ${
              isPanic
                ? 'bg-red-950/80 border-red-500/80 text-red-300'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
            }`}
          >
            <Activity
              className={`w-5 h-5 ${isPanic ? 'text-red-400 animate-ping' : 'text-emerald-400'}`}
            />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest">생체 신호 (심박수)</span>
              <span className="text-lg font-black tracking-wider leading-none">
                {stats.heartRate} <span className="text-xs font-normal">BPM</span>
              </span>
            </div>

            {/* Mini pulse wave bar */}
            <div className="h-4 w-16 flex items-center gap-0.5 overflow-hidden ml-1">
              <div
                className={`h-full w-1 rounded-full ${isPanic ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse`}
              />
              <div
                className={`h-2/3 w-1 rounded-full ${isPanic ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse delay-75`}
              />
              <div
                className={`h-full w-1 rounded-full ${isPanic ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse delay-150`}
              />
              <div
                className={`h-1/2 w-1 rounded-full ${isPanic ? 'bg-red-500' : 'bg-emerald-400'} animate-pulse delay-200`}
              />
            </div>
          </div>

          {/* Stamina Meter */}
          <div className="bg-zinc-950/80 border border-zinc-800 px-3.5 py-2 rounded-md backdrop-blur-md w-56">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {stats.adrenalineActive ? '아드레날린 폭발 중!' : '스태미나 [Shift]'}
              </span>
              <span className="font-bold text-zinc-300">{Math.round(stats.stamina)}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  stats.adrenalineActive
                    ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                    : stats.stamina < 25
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${stats.stamina}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Bottom Right: Desktop Equipment, Battery & Quick Actions */}
      {!isTouchDevice && (
        <div className="absolute bottom-5 right-5 hidden md:flex flex-col items-end gap-2.5 z-20">
          {/* Flashlight Battery */}
          <div className="bg-zinc-950/80 border border-zinc-800 px-3.5 py-2.5 rounded-md backdrop-blur-md w-60">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Flashlight
                  className={`w-4 h-4 ${stats.flashlightOn ? 'text-amber-300' : 'text-zinc-500'}`}
                />
                손전등 [F] : {stats.flashlightOn ? 'ON' : 'OFF'}
              </span>
              <span
                className={`font-bold ${
                  stats.battery < 20 ? 'text-red-400 animate-pulse' : 'text-zinc-300'
                }`}
              >
                {Math.round(stats.battery)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 rounded-full ${
                  stats.battery < 20
                    ? 'bg-red-500'
                    : stats.battery < 50
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${stats.battery}%` }}
              />
            </div>
          </div>

          {/* Inventory Action Hotbar */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Spare Batteries */}
            <button
              onClick={onReloadBattery}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs px-3 py-2 rounded active:scale-95 transition"
              title="여분 배터리로 손전등 충전 (R키)"
            >
              <BatteryCharging className="w-4 h-4 text-amber-400" />
              <span>배터리 [R]: {stats.batteries}</span>
            </button>

            {/* Flares */}
            <button
              onClick={onThrowFlare}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs px-3 py-2 rounded active:scale-95 transition"
              title="조명탄 전방 투척 및 유인 (G키)"
            >
              <Flame className="w-4 h-4 text-red-400" />
              <span>조명탄 [G]: {stats.flares}</span>
            </button>

            {/* Syringe */}
            <button
              onClick={onUseSyringe}
              className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs px-3 py-2 rounded active:scale-95 transition"
              title="아드레날린 주사로 전력질주 (V키)"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>주사기 [V]: {stats.syringes}</span>
            </button>
          </div>

          {/* Quick Keyboard Helper */}
          <div className="text-[10px] text-zinc-500 flex items-center gap-2 pr-1">
            <span>[WASD] 이동</span>
            <span>[Shift] 질주</span>
            <span>[C] 웅크리기(소음 차단)</span>
            <span>[F] 전등</span>
          </div>
        </div>
      )}
    </div>
  );
};
