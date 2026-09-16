import React from 'react';
import {
  Zap,
  Gauge,
  Monitor,
  Sun,
  Eye,
  Sparkles,
  Check,
  X,
  Flame,
  ShieldCheck,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { GraphicsSettings, GraphicsPreset } from '../types';

interface OptimizationModalProps {
  settings: GraphicsSettings;
  fps: number;
  onUpdateSettings: (newSettings: GraphicsSettings) => void;
  onClose: () => void;
}

export const PRESETS: Record<GraphicsPreset, { name: string; desc: string; icon: string; badge: string; config: Partial<GraphicsSettings> }> = {
  POTATO: {
    name: '감자 PC 모드 (초고속 렉 제거)',
    desc: '컴퓨터 과열 및 프레임 드랍을 완전히 해결하는 최고 속도 모드',
    icon: '🥔',
    badge: '최고 속도 (추천)',
    config: {
      renderScale: 0.5,
      shadows: false,
      maxLights: 0,
      viewDistance: 40,
      particles: false,
    },
  },
  PERFORMANCE: {
    name: '성능 우선 모드 (60 FPS 보장)',
    desc: '선명한 그래픽과 부드러운 프레임의 완벽한 밸런스',
    icon: '⚡',
    badge: '밸런스 권장',
    config: {
      renderScale: 0.75,
      shadows: false,
      maxLights: 2,
      viewDistance: 55,
      particles: true,
    },
  },
  BALANCED: {
    name: '표준 밸런스 모드',
    desc: '보통 사양 그래픽카드 환경을 위한 기본 세팅',
    icon: '⚖️',
    badge: '표준',
    config: {
      renderScale: 1.0,
      shadows: true,
      maxLights: 2,
      viewDistance: 65,
      particles: true,
    },
  },
  QUALITY: {
    name: '고화질 풀옵션 모드',
    desc: '고성능 외장 GPU 데스크톱 전용 모드',
    icon: '🌟',
    badge: '고사양 전용',
    config: {
      renderScale: 1.0,
      shadows: true,
      maxLights: 4,
      viewDistance: 80,
      particles: true,
    },
  },
};

export const OptimizationModal: React.FC<OptimizationModalProps> = ({
  settings,
  fps,
  onUpdateSettings,
  onClose,
}) => {
  const handlePresetSelect = (preset: GraphicsPreset) => {
    const config = PRESETS[preset].config;
    onUpdateSettings({
      ...settings,
      ...config,
      preset,
    });
  };

  const fpsColor =
    fps >= 55 ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/60' :
    fps >= 30 ? 'text-amber-400 border-amber-500/50 bg-amber-950/60' :
    'text-red-400 border-red-500/50 bg-red-950/60 animate-pulse';

  const fpsText =
    fps >= 55 ? '매우 부드러움 (안정)' :
    fps >= 30 ? '양호 (플레이 가능)' :
    '렉 발생 중! [감자 PC 모드]를 누르세요';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none text-zinc-100">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                성능 최적화 & 렉 방지 제어판
              </div>
              <h2 className="text-xl font-black tracking-wide text-zinc-100">
                GRAPHICS & PERFORMANCE
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live FPS & Performance Status */}
        <div className={`flex items-center justify-between p-3.5 rounded-xl border mb-5 ${fpsColor}`}>
          <div className="flex items-center gap-3">
            <Gauge className="w-6 h-6 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-80">실시간 측정 프레임</div>
              <div className="text-2xl font-black tracking-wider leading-none">
                {fps} <span className="text-sm font-semibold">FPS</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold">{fpsText}</div>
            <div className="text-[11px] opacity-75">
              스케일: {Math.round(settings.renderScale * 100)}% | 그림자: {settings.shadows ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {/* Instant 1-Click Presets */}
        <div className="mb-6">
          <div className="text-xs text-zinc-400 font-bold mb-2.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            원클릭 최적화 프리셋 (컴퓨터 사양 맞춤)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(PRESETS) as GraphicsPreset[]).map((key) => {
              const p = PRESETS[key];
              const isSelected = settings.preset === key;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-lg shadow-amber-950/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold flex items-center gap-1.5 text-zinc-100">
                      <span>{p.icon}</span>
                      <span>{p.name.split(' (')[0]}</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isSelected ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight line-clamp-2">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Granular Individual Settings */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-4 mb-6">
          <div className="text-xs text-zinc-300 font-bold flex items-center justify-between">
            <span>세부 그래픽 조절</span>
            <span className="text-[10px] text-zinc-500 font-normal">실시간 즉시 적용</span>
          </div>

          {/* 1. Render Resolution Scale */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                3D 렌더링 해상도 스케일
              </span>
              <span className="font-bold text-zinc-200">
                {Math.round(settings.renderScale * 100)}% ({settings.renderScale < 0.7 ? '최고 프레임' : settings.renderScale < 0.9 ? '추천' : '네이티브'})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0.5, 0.75, 1.0].map((scale) => (
                <button
                  key={scale}
                  onClick={() => onUpdateSettings({ ...settings, renderScale: scale, preset: 'PERFORMANCE' })}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    settings.renderScale === scale
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {scale === 0.5 ? '50% (감자 PC)' : scale === 0.75 ? '75% (추천)' : '100% (원래 해상도)'}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              * 해상도를 50%나 75%로 낮추면 GPU 발열과 팬 소음이 대폭 줄어듭니다.
            </div>
          </div>

          {/* 2. Dynamic Shadows Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                실시간 동적 그림자 계산
              </span>
              <span className="text-[10px] text-zinc-500">
                그림자를 끄면 약 +25~50 FPS 프레임 상승
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ ...settings, shadows: !settings.shadows })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                settings.shadows
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              {settings.shadows ? 'ON (켜짐)' : 'OFF (꺼짐 - 권장)'}
            </button>
          </div>

          {/* 3. Max Lights */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                복도 천장 전등 광원 수
              </span>
              <span className="text-[10px] text-zinc-500">
                플레이어 주변 활성 램프 개수 제한
              </span>
            </div>
            <div className="flex gap-1.5">
              {[0, 2, 4].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => onUpdateSettings({ ...settings, maxLights: cnt })}
                  className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                    settings.maxLights === cnt
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {cnt === 0 ? '0개 (절전)' : `${cnt}개`}
                </button>
              ))}
            </div>
          </div>

          {/* 4. View Distance */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                시야 렌더링 거리 (Far Plane)
              </span>
              <span className="text-[10px] text-zinc-500">
                미로 벽면 Frustum 컬링 거리
              </span>
            </div>
            <div className="flex gap-1.5">
              {[40, 55, 75].map((dist) => (
                <button
                  key={dist}
                  onClick={() => onUpdateSettings({ ...settings, viewDistance: dist })}
                  className={`px-2.5 py-1 rounded text-xs font-bold border transition ${
                    settings.viewDistance === dist
                      ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {dist}m
                </button>
              ))}
            </div>
          </div>

          {/* 5. Particles & FPS Counter */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 파티클 효과
              </span>
              <button
                onClick={() => onUpdateSettings({ ...settings, particles: !settings.particles })}
                className={`px-2 py-1 rounded text-xs font-bold border transition ${
                  settings.particles ? 'bg-purple-500/20 border-purple-400 text-purple-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {settings.particles ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> FPS 표시
              </span>
              <button
                onClick={() => onUpdateSettings({ ...settings, showFps: !settings.showFps })}
                className={`px-2 py-1 rounded text-xs font-bold border transition ${
                  settings.showFps ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {settings.showFps ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={() => handlePresetSelect('POTATO')}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-black text-xs tracking-wider uppercase transition shadow-lg active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>🥔 감자 PC 즉시 적용 (렉 완벽 해결)</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-xs uppercase transition active:scale-98"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
