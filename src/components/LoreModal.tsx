import React, { useState } from 'react';
import { GameLog } from '../types';
import { X, BookOpen, AlertOctagon } from 'lucide-react';

interface LoreModalProps {
  logs: GameLog[];
  onClose: () => void;
}

export const LoreModal: React.FC<LoreModalProps> = ({ logs, onClose }) => {
  const [selectedLog, setSelectedLog] = useState<GameLog>(logs[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-700 rounded-xl p-6 shadow-2xl text-zinc-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-200">
              시설 잔존 음성/텍스트 기록 보관함
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* List of logs */}
          <div className="flex flex-col gap-2 border-r border-zinc-800 pr-2">
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`text-left p-2.5 rounded text-xs transition ${
                  selectedLog.id === log.id
                    ? 'bg-amber-950/60 border border-amber-500/50 text-amber-200 font-bold'
                    : 'bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="truncate">{log.title}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{log.date}</div>
              </button>
            ))}
          </div>

          {/* Log content */}
          <div className="md:col-span-2 flex flex-col justify-between bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <h3 className="font-bold text-sm text-zinc-100">{selectedLog.title}</h3>
                <span className="text-[11px] text-zinc-400">{selectedLog.author}</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-line">
                {selectedLog.text}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2 text-[11px] text-red-400">
              <AlertOctagon className="w-4 h-4" />
              <span>기밀 등급: 프로젝트 오메가 제로 — 유출 금지</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
