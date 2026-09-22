import React from 'react';
import { SectorInfo, MazeCell, WardrobeEntity } from '../types';
import { X, Compass, Radio, MapPin, Shield } from 'lucide-react';
import { CELL_SIZE, MAZE_DIM } from '../game/maze';

interface MinimapTabletProps {
  playerPos: { x: number; z: number; yaw: number };
  sectors: SectorInfo[];
  grid: MazeCell[][];
  wardrobes?: WardrobeEntity[];
  onClose: () => void;
}

export const MinimapTablet: React.FC<MinimapTabletProps> = ({
  playerPos,
  sectors,
  grid,
  wardrobes = [],
  onClose,
}) => {
  const mapCanvasSize = 280;
  const scale = mapCanvasSize / (MAZE_DIM * CELL_SIZE);

  // Player position relative to canvas
  const playerCanvasX = playerPos.x * scale;
  const playerCanvasY = playerPos.z * scale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 font-mono select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-cyan-500/60 rounded-xl p-4 sm:p-6 shadow-2xl text-zinc-200 max-h-[95vh] overflow-y-auto my-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h2 className="text-lg font-black tracking-wider text-cyan-300">
                격리 시설 전술 단말기 [MK-IV]
              </h2>
              <p className="text-xs text-zinc-400">
                지하 제로 섹터 (심층 400m) 레이더 스캔 분석
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout: Radar Map + Sector Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
          {/* Radar Screen Canvas Representation */}
          <div className="flex flex-col items-center">
            <div
              className="relative rounded-lg border border-cyan-900/80 bg-[#060a0f] overflow-hidden shadow-inner"
              style={{ width: mapCanvasSize, height: mapCanvasSize }}
            >
              {/* Radar Sweep Effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,182,212,0.06)_100%)] pointer-events-none" />
              <div className="absolute inset-0 border border-cyan-500/20 rounded-full" />
              <div className="absolute inset-8 border border-cyan-500/10 rounded-full" />

              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none border border-cyan-500">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="border border-cyan-500" />
                ))}
              </div>

              {/* Exit Gate Marker */}
              <div
                className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-purple-400"
                style={{ left: mapCanvasSize / 2, top: 16 }}
              >
                <div className="w-4 h-4 rounded-sm border-2 border-purple-500 bg-purple-950/60 flex items-center justify-center">
                  탈
                </div>
              </div>

              {/* Central Hub Marker */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: mapCanvasSize / 2, top: mapCanvasSize / 2 }}
              >
                <div className="w-5 h-5 rounded-full border border-blue-400 bg-blue-900/40 flex items-center justify-center text-[9px] text-blue-300">
                  HUB
                </div>
              </div>

              {/* Sector Markers */}
              {sectors.map((s) => {
                const sx = s.x * scale;
                const sy = s.z * scale;
                return (
                  <div
                    key={s.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: sx, top: sy }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        s.coreCollected
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-300 shadow-[0_0_8px_#34d399]'
                          : 'border-amber-400 bg-amber-950 text-amber-300 animate-pulse'
                      }`}
                    >
                      <span className="text-[8px] font-bold">
                        {s.id.replace('SECTOR_', '')}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Wardrobe / Locker Markers */}
              {wardrobes.map((w) => {
                const wx = w.x * scale;
                const wy = w.z * scale;
                return (
                  <div
                    key={w.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-sm bg-sky-400/90 pointer-events-none"
                    style={{ left: wx, top: wy }}
                    title="은신용 옷장"
                  />
                );
              })}

              {/* Player Icon & Direction Indicator */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: playerCanvasX,
                  top: playerCanvasY,
                  transform: `translate(-50%, -50%) rotate(${-playerPos.yaw}rad)`,
                }}
              >
                <div className="w-0 h-0 border-x-4 border-x-transparent border-b-8 border-b-cyan-400 drop-shadow-[0_0_6px_#38bdf8]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> 플레이어
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> 수집 완료
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> 미수집 코어
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-sm bg-sky-400" /> 은신 옷장
              </span>
            </div>
          </div>

          {/* Sector Details & Mission Objectives */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              구역별 코어 상태 및 거리
            </h3>

            <div className="flex flex-col gap-2.5">
              {sectors.map((sector) => {
                const dist = Math.round(
                  Math.hypot(sector.x - playerPos.x, sector.z - playerPos.z)
                );
                return (
                  <div
                    key={sector.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition ${
                      sector.coreCollected
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{sector.koreanName}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {sector.coreCollected ? '✓ 코어 회수 완료' : `미회수 상태 (남은 거리: 약 ${dist}m)`}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        sector.coreCollected
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-amber-900/60 text-amber-300'
                      }`}
                    >
                      {sector.coreCollected ? '확보됨' : '탐색 필요'}
                    </span>
                  </div>
                );
              })}

              {/* Final Exit Status */}
              <div className="p-3 rounded-lg border border-purple-800/50 bg-purple-950/20 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    북쪽 최심부 격벽 탈출구
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {sectors.every((s) => s.coreCollected)
                      ? '모든 코어 정렬 완료! 격벽 콘솔에서 비상 개방을 시작하십시오.'
                      : '4개 코어를 모두 수집해야 전력이 복구됩니다.'}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
              💡 <strong className="text-zinc-200">생존 수칙</strong>: 조명탄(<span className="text-red-400 font-bold">[G]</span>)을 투척하면 괴물이 공포에 질려 즉시 도망치며, 복도 곳곳의 옷장(<span className="text-cyan-400 font-bold">[E]</span>)에 숨으면 괴물이 플레이어를 놓치고 수색 후 떠나갑니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
