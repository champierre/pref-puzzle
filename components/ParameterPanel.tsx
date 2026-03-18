'use client';
import type { MeshGenerationParams } from '../lib/types';

interface Props {
  params: MeshGenerationParams;
  onChange: (p: MeshGenerationParams) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {children}
    </div>
  );
}

export default function ParameterPanel({ params, onChange }: Props) {
  function set<K extends keyof MeshGenerationParams>(key: K, value: MeshGenerationParams[K]) {
    onChange({ ...params, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">パラメータ</h2>

      <Row label={`垂直誇張: ${params.zScale.toFixed(1)}×`}>
        <input type="range" min={1} max={5} step={0.5} value={params.zScale}
          onChange={e => set('zScale', parseFloat(e.target.value))} className="w-full" />
      </Row>

      <Row label={`ベース厚さ: ${params.baseThickness}mm`}>
        <input type="range" min={1} max={10} step={0.5} value={params.baseThickness}
          onChange={e => set('baseThickness', parseFloat(e.target.value))} className="w-full" />
      </Row>

      <Row label={`間引き: 1/${params.decimation}`}>
        <input type="range" min={1} max={4} step={1} value={params.decimation}
          onChange={e => set('decimation', parseInt(e.target.value))} className="w-full" />
      </Row>

      <Row label="ズームレベル">
        <select value={params.zoom} onChange={e => set('zoom', parseInt(e.target.value) as 12 | 14)}
          className="bg-gray-800 rounded px-2 py-1 text-sm">
          <option value={12}>12 (低解像度・高速)</option>
          <option value={14}>14 (高解像度・低速)</option>
        </select>
      </Row>

      <Row label="テキスト">
        <select value={params.textMode} onChange={e => set('textMode', e.target.value as 'emboss' | 'engrave' | 'none')}
          className="bg-gray-800 rounded px-2 py-1 text-sm">
          <option value="emboss">浮き彫り</option>
          <option value="engrave">彫り込み</option>
          <option value="none">なし</option>
        </select>
      </Row>
    </div>
  );
}
