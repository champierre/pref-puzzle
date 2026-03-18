'use client';
import { KANTO_PREFECTURES } from '../lib/constants/kanto';

interface Props {
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}

export default function PrefectureSelector({ selected, onChange }: Props) {
  function toggle(code: string) {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-1">都県選択</h2>
      {KANTO_PREFECTURES.map(p => (
        <label key={p.code} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
          <input
            type="checkbox"
            checked={selected.has(p.code)}
            onChange={() => toggle(p.code)}
            className="w-4 h-4"
          />
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-sm">{p.name}</span>
        </label>
      ))}
      <div className="flex gap-2 mt-2">
        <button onClick={() => onChange(new Set(KANTO_PREFECTURES.map(p => p.code)))}
          className="flex-1 text-xs py-1 bg-gray-700 hover:bg-gray-600 rounded">全選択</button>
        <button onClick={() => onChange(new Set())}
          className="flex-1 text-xs py-1 bg-gray-700 hover:bg-gray-600 rounded">クリア</button>
      </div>
    </div>
  );
}
