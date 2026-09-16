import React from 'react';
import { Play, RotateCcw, Volume2, MousePointer, Info, Zap } from 'lucide-react';
import { GraphicsPreset } from '../types';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  currentPreset?: GraphicsPreset;
  onOpenOptimization: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  sensitivity,
  onSensitivityChange,
  volume,
  onVolumeChange,
  currentPreset,
  onOpenOptimization,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none text-zinc-100">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-7 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">
            격리 시설 일시 정지
          </div>
          <h2 className="text-2xl font-black tracking-wider text-zinc-100">PAUSED</h2>
        </div>

        {/* Graphics & Performance Optimization Quick Banner */}
        <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">렉 발생 & 컴퓨터 발열 해결</div>
              <div className="text-[11px] text-zinc-400">
                현재 모드: <span className="text-zinc-200 font-bold">{currentPreset || 'PERFORMANCE'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onOpenOptimization}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition active:scale-95"
          >
            최적화 설정
          </button>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Mouse Sensitivity */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                마우스 시야 감도
              </span>
              <span className="font-bold text-zinc-200">
                {(sensitivity * 1000).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.006"
              step="0.0005"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
          </div>

          {/* Volume */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                음향 볼륨
              </span>
              <span className="font-bold text-zinc-200">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm tracking-wider uppercase transition shadow-lg shadow-cyan-950/40 active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>게임 재개 (마우스 클릭)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-sm tracking-wider uppercase transition active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>미로 재시작</span>
          </button>
        </div>

        {/* Controls Reminder */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
          <div className="flex items-center gap-1 text-zinc-400 font-bold mb-1">
            <Info className="w-3.5 h-3.5" /> 조작법 안내
          </div>
          <div>[WASD] 이동 | [Shift] 달리기 | [C] 앉기 (소음 감소)</div>
          <div>[F] 손전등 토글 | [G] 조명탄 투척 | [M] 단말기 지도</div>
        </div>
      </div>
    </div>
  );
};
