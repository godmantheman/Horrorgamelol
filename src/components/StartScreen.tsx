import React, { useState } from 'react';
import { Difficulty, GraphicsPreset } from '../types';
import { Play, ShieldAlert, Compass, Flame, Volume2, Eye, Flashlight, Zap, Sliders, Shield } from 'lucide-react';

interface StartScreenProps {
  onStart: (difficulty: Difficulty, preset: GraphicsPreset) => void;
  currentPreset?: GraphicsPreset;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, currentPreset = 'PERFORMANCE' }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [preset, setPreset] = useState<GraphicsPreset>(currentPreset);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070a] p-4 font-mono select-none overflow-y-auto">
      {/* Dark mist & red ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,20,20,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Subtle Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none" />

      <div className="relative w-full max-w-3xl bg-zinc-950/80 border border-red-900/50 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl text-zinc-100 my-auto">
        {/* Top Warning Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-400 tracking-[0.25em] uppercase">
            생체 재해 4급 비상 폐쇄 구역
          </span>
        </div>

        {/* Main Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl font-black tracking-wider text-zinc-100 uppercase drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]">
            LABYRINTH <span className="text-red-600">:</span> SUB-LEVEL 0
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-2 tracking-widest uppercase">
            심연의 미로 : 제로 섹터 (대규모 3D 1인칭 공포 생존)
          </p>
        </div>

        {/* Story Briefing */}
        <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-4 md:p-5 mb-5 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <div className="text-red-400 font-bold mb-1.5 flex items-center gap-1.5">
            <span>[사건 개요]</span>
          </div>
          <p>
            지하 400m 심층 연구소 &apos;제로 섹터&apos;의 격리 프로토콜이 파괴되었습니다.
            어둠 속을 배회하는 신체 변형 괴수(The Aberration)가 당신의 숨소리와 발자국을 쫓고 있습니다.
            탈출하기 위해서는 거대한 미로의 4개 구역(알파, 베타, 감마, 델타)에 흩어진
            <span className="text-cyan-400 font-bold"> 에너지 코어 4개</span>를 모두 회수하여
            북쪽 최심부 격벽을 가동해야 합니다.
          </p>
        </div>

        {/* Performance & Lag Optimization Selector */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 md:p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>컴퓨터 성능 & 그래픽 최적화 모드 (렉 방지)</span>
            </div>
            <span className="text-[10px] text-zinc-400">사양에 맞게 선택</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'POTATO', name: '🥔 감자 PC', desc: '초고속 렉 제거' },
              { id: 'PERFORMANCE', name: '⚡ 성능 우선', desc: '60 FPS 추천' },
              { id: 'BALANCED', name: '⚖️ 밸런스', desc: '보통 사양' },
              { id: 'QUALITY', name: '🌟 고화질', desc: '외장 그래픽' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id as GraphicsPreset)}
                className={`flex flex-col text-left p-2.5 rounded-lg border transition ${
                  preset === p.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-950/50'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span className="text-xs font-bold text-zinc-100">{p.name}</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Survival Tactical Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
          <div className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
              <Flashlight className="w-3.5 h-3.5" /> 소리와 빛 주의
            </div>
            <p className="text-zinc-400 text-[11px] leading-normal">
              질주(Shift)하거나 전등(F)을 켜면 놈이 알아챕니다. 웅크려(C) 조용히 피하십시오.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-red-900/50 p-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
              <Flame className="w-3.5 h-3.5" /> 조명탄 퇴치 (G키)
            </div>
            <p className="text-zinc-400 text-[11px] leading-normal">
              괴물에게 조명탄을 던지면 강렬한 섬광에 공포를 느끼고 즉시 반대 방향으로 도망칩니다!
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-cyan-900/50 p-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
              <Shield className="w-3.5 h-3.5" /> 옷장에 숨기 (E키)
            </div>
            <p className="text-zinc-400 text-[11px] leading-normal">
              복도의 옷장에 숨으면 괴물이 플레이어를 놓치며, 주위를 수색하다가 다른 곳으로 가버립니다.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
              <Compass className="w-3.5 h-3.5" /> 단말기 지도 (M키)
            </div>
            <p className="text-zinc-400 text-[11px] leading-normal">
              길을 잃었을 때는 단말기(M)를 켜서 4개 구역과 안전 옷장 위치를 파악하십시오.
            </p>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
          <div className="text-xs text-zinc-300">
            <span className="font-bold text-zinc-100 block mb-0.5">난이도 선택</span>
            <span className="text-zinc-400 text-[11px]">괴물의 감지 반경 및 이동 속도가 조정됩니다</span>
          </div>

          <div className="flex items-center gap-2">
            {(['STORY', 'NORMAL', 'NIGHTMARE'] as Difficulty[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDifficulty(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition border ${
                  difficulty === mode
                    ? mode === 'NIGHTMARE'
                      ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_12px_#ef4444]'
                      : 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-[0_0_12px_#06b6d4]'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'STORY' ? '탐험 (이지)' : mode === 'NORMAL' ? '생존 (보통)' : '악몽 (하드)'}
              </button>
            ))}
          </div>
        </div>

        {/* Start CTA Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onStart(difficulty, preset)}
            className="w-full md:w-2/3 flex items-center justify-center gap-3 py-4 px-8 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:brightness-110 text-white font-black text-base tracking-widest uppercase transition-all duration-200 shadow-xl shadow-red-950/70 active:scale-98 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>미로 진입 (START SURVIVAL)</span>
          </button>

          <p className="text-[11px] text-zinc-500 text-center">
            * 게임 플레이 도중 언제든 우상단 [⚡ 최적화] 버튼이나 ESC 메뉴에서 그래픽을 자유롭게 변경할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
