import React from 'react';
import { GameState, SectorInfo } from '../types';
import { Skull, Trophy, RotateCcw, Clock, Compass, ShieldAlert } from 'lucide-react';

interface GameOverModalProps {
  state: GameState;
  survivedTime: number; // seconds
  sectors: SectorInfo[];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  state,
  survivedTime,
  sectors,
  onRestart,
}) => {
  const isVictory = state === 'VICTORY';
  const minutes = Math.floor(survivedTime / 60);
  const seconds = survivedTime % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const coresCollected = sectors.filter((s) => s.coreCollected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-mono select-none backdrop-blur-md">
      {/* Heavy Red / Green atmospheric glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 ${
          isVictory
            ? 'bg-[radial-gradient(ellipse_at_center,#10b981_0%,transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_at_center,#ef4444_0%,transparent_70%)]'
        }`}
      />

      <div
        className={`relative w-full max-w-lg rounded-2xl border p-8 shadow-2xl backdrop-blur-xl text-center ${
          isVictory
            ? 'bg-zinc-950/90 border-emerald-500/60 shadow-emerald-950/50'
            : 'bg-zinc-950/90 border-red-700/60 shadow-red-950/60'
        }`}
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              isVictory
                ? 'bg-emerald-950/60 border-emerald-400 text-emerald-400 shadow-[0_0_20px_#10b981]'
                : 'bg-red-950/60 border-red-500 text-red-500 shadow-[0_0_20px_#ef4444]'
            }`}
          >
            {isVictory ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8 animate-pulse" />}
          </div>
        </div>

        {/* Title */}
        <h2
          className={`text-2xl md:text-3xl font-black tracking-widest uppercase mb-2 ${
            isVictory ? 'text-emerald-300' : 'text-red-500'
          }`}
        >
          {isVictory ? '탈출 성공 : 생환 확인' : '생체 신호 정지 (TERMINATED)'}
        </h2>

        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6 leading-relaxed">
          {isVictory
            ? '4개의 보조 에너지 코어를 모두 동기화하고 최심부 격벽을 가동하여 미로를 무사히 탈출했습니다.'
            : '심층 격리 구역의 괴생명체에게 따라잡혀 사망했습니다. 미로의 어둠 속에 영원히 묻힙니다.'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>생존 시간</span>
            </div>
            <div className="text-xl font-black text-zinc-100">{timeFormatted}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>확보한 코어</span>
            </div>
            <div className="text-xl font-black text-zinc-100">{coresCollected} / 4</div>
          </div>
        </div>

        {/* Cores Breakdown */}
        <div className="flex justify-center gap-2 mb-8">
          {sectors.map((s) => (
            <div
              key={s.id}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                s.coreCollected
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-600'
              }`}
            >
              {s.id.replace('SECTOR_', '코어 ')}
            </div>
          ))}
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wider uppercase transition duration-200 active:scale-98 ${
            isVictory
              ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-900/40'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isVictory ? '새로운 미로 탐험하기' : '미로에서 다시 도전하기'}</span>
        </button>
      </div>
    </div>
  );
};
