'use client';
import type { PrefectureStatus } from '../lib/types';
import { KANTO_PREFECTURES } from '../lib/constants/kanto';

const PHASE_LABELS: Record<string, string> = {
  idle: '待機中',
  'fetching-boundary': '境界データ取得中',
  'fetching-dem': 'DEM取得中',
  clipping: 'クリッピング中',
  meshing: 'メッシュ生成中',
  ready: '完了',
  error: 'エラー',
};

interface Props {
  statuses: PrefectureStatus[];
  onDownload: (code: string) => void;
}

export default function StatusPanel({ statuses, onDownload }: Props) {
  if (statuses.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">ステータス</h2>
      {statuses.map(s => {
        const pref = KANTO_PREFECTURES.find(p => p.code === s.code);
        return (
          <div key={s.code} className="bg-gray-800 rounded p-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{pref?.name ?? s.code}</span>
              {s.phase === 'ready' && (
                <button onClick={() => onDownload(s.code)}
                  className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded">STL DL</button>
              )}
            </div>
            <div className="text-xs text-gray-400">{PHASE_LABELS[s.phase] ?? s.phase}</div>
            {s.phase !== 'idle' && s.phase !== 'error' && s.phase !== 'ready' && (
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${s.progress * 100}%` }} />
              </div>
            )}
            {s.phase === 'error' && <div className="text-xs text-red-400">{s.errorMessage}</div>}
          </div>
        );
      })}
    </div>
  );
}
