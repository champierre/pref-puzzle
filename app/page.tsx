'use client';
import dynamic from 'next/dynamic';
import { useState, useCallback, useRef } from 'react';
import { KANTO_PREFECTURES, DEFAULT_PARAMS, BASE_PATH, TOKYO_PUZZLE_BBOX } from '../lib/constants/kanto';
import type { BBox } from '../lib/types';
import type { MeshGenerationParams, PrefectureStatus, WorkerResponse, WorkerRequest } from '../lib/types';
import { fetchDemTiles } from '../lib/geo/tiles';
import PrefectureSelector from '../components/PrefectureSelector';
import ParameterPanel from '../components/ParameterPanel';
import StatusPanel from '../components/StatusPanel';
import Attribution from '../components/Attribution';

const Preview3D = dynamic(() => import('../components/Preview3D'), { ssr: false });

function computeBBox(geometry: unknown, code: string): BBox {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

  function visitRing(ring: number[][]) {
    for (const [lon, lat] of ring) {
      // 東京の離島を除外: TOKYO_PUZZLE_BBOX の範囲外の座標はスキップ
      if (code === '13') {
        const b = TOKYO_PUZZLE_BBOX;
        if (lon < b.minLon || lon > b.maxLon || lat < b.minLat || lat > b.maxLat) continue;
      }
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  const geom = geometry as { type: string; coordinates: unknown };
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates as number[][][]) visitRing(ring);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as number[][][][]) {
      for (const ring of poly) visitRing(ring);
    }
  }

  // フォールバック
  if (!isFinite(minLon)) return { minLon: 139.0, maxLon: 140.0, minLat: 35.5, maxLat: 36.5 };
  return { minLon, maxLon, minLat, maxLat };
}

type MeshData = NonNullable<WorkerResponse['mesh']>;

export default function HomePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<MeshGenerationParams>(DEFAULT_PARAMS);
  const [statuses, setStatuses] = useState<Record<string, PrefectureStatus>>({});
  const [meshes, setMeshes] = useState<Record<string, MeshData>>({});
  const [stlData, setStlData] = useState<Record<string, string>>({});
  const workersRef = useRef<Record<string, Worker>>({});

  function updateStatus(code: string, update: Partial<PrefectureStatus>) {
    setStatuses(prev => {
      const existing = prev[code] ?? { code, phase: 'idle' as const, progress: 0 };
      return { ...prev, [code]: { ...existing, ...update } };
    });
  }

  const generate = useCallback(async () => {
    for (const code of selected) {
      updateStatus(code, { phase: 'fetching-boundary', progress: 0.05 });
      try {
        const boundaryResp = await fetch(`${BASE_PATH}/data/boundary/${code}.json`);
        if (!boundaryResp.ok) throw new Error(`Boundary fetch failed: ${boundaryResp.status}`);
        const boundary = await boundaryResp.json();

        updateStatus(code, { phase: 'fetching-dem', progress: 0.2 });
        // Compute bbox from boundary (ループで計算してスタック溢れを回避)
        const bbox = computeBBox(boundary.geometry, code);

        const demGrid = await fetchDemTiles(bbox, params.zoom);

        // Convert to base64
        const u8 = new Uint8Array(demGrid.values.buffer);
        let str = '';
        for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i]);
        const valuesBase64 = btoa(str);

        // Load font
        const fontResp = await fetch(`${BASE_PATH}/fonts/NotoSansJP-Regular.ttf`);
        const fontBuf = await fontResp.arrayBuffer();
        const fontU8 = new Uint8Array(fontBuf);
        let fontStr = '';
        for (let i = 0; i < fontU8.length; i++) fontStr += String.fromCharCode(fontU8[i]);
        const fontBase64 = btoa(fontStr);

        // Terminate old worker if any
        workersRef.current[code]?.terminate();
        const worker = new Worker(new URL('../workers/mesh.worker.ts', import.meta.url));
        workersRef.current[code] = worker;

        worker.onmessage = (evt: MessageEvent<WorkerResponse>) => {
          const msg = evt.data;
          if (msg.type === 'progress') {
            updateStatus(code, { phase: msg.phase, progress: msg.progress ?? 0 });
          } else if (msg.type === 'done') {
            updateStatus(code, { phase: 'ready', progress: 1 });
            if (msg.mesh) setMeshes(prev => ({ ...prev, [code]: msg.mesh! }));
            if (msg.stlBase64) setStlData(prev => ({ ...prev, [code]: msg.stlBase64! }));
          } else if (msg.type === 'error') {
            updateStatus(code, { phase: 'error', errorMessage: msg.errorMessage });
          }
        };

        const req: WorkerRequest = {
          type: 'generate',
          code,
          boundary,
          demGrid: { bbox: demGrid.bbox, cols: demGrid.cols, rows: demGrid.rows, valuesBase64 },
          params,
          fontBase64,
        };
        worker.postMessage(req);
      } catch (e) {
        updateStatus(code, { phase: 'error', errorMessage: String(e) });
      }
    }
  }, [selected, params]);

  const downloadPreset = useCallback(async () => {
    for (const code of selected) {
      updateStatus(code, { phase: 'fetching-dem', progress: 0.5 });
      try {
        const resp = await fetch(`${BASE_PATH}/data/stl/${code}.stl`);
        if (!resp.ok) throw new Error(`プリセットSTLが見つかりません (${code}.stl)`);
        const buf = await resp.arrayBuffer();
        const u8 = new Uint8Array(buf);
        let str = '';
        for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i]);
        setStlData(prev => ({ ...prev, [code]: btoa(str) }));
        updateStatus(code, { phase: 'ready', progress: 1 });
      } catch (e) {
        updateStatus(code, { phase: 'error', errorMessage: String(e) });
      }
    }
  }, [selected]);

  function downloadStl(code: string) {
    const b64 = stlData[code];
    if (!b64) return;
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${code}.stl`; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const [code, b64] of Object.entries(stlData)) {
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const pref = KANTO_PREFECTURES.find(p => p.code === code);
      zip.file(`${code}_${pref?.nameEn ?? code}.stl`, u8);
    }
    zip.file('README.txt', `地形データ: 国土地理院 基盤地図情報数値標高モデル
行政界データ: 国土交通省 国土数値情報（行政区域データ）N03-2024
本データは上記データを加工して作成したものです。`);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'kanto-puzzle.zip'; a.click();
    URL.revokeObjectURL(url);
  }

  const readyCodes = Object.entries(statuses).filter(([, s]) => s.phase === 'ready').map(([c]) => c);

  return (
    <div className="flex flex-col h-screen">
      <header className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h1 className="text-xl font-bold">関東 3D 都県パズル</h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-56 p-4 bg-gray-900 border-r border-gray-700 flex flex-col gap-4 overflow-y-auto">
          <PrefectureSelector selected={selected} onChange={setSelected} />
          <div className="flex flex-col gap-2">
            <button
              onClick={downloadPreset}
              disabled={selected.size === 0}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 rounded font-semibold text-sm"
              title="事前生成済みSTLをダウンロード（高速）"
            >
              プリセットDL
            </button>
            <button
              onClick={generate}
              disabled={selected.size === 0}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded font-semibold"
            >
              生成開始
            </button>
            {readyCodes.length > 0 && (
              <button onClick={downloadZip} className="w-full py-2 bg-green-700 hover:bg-green-600 rounded font-semibold">
                ZIP DL ({readyCodes.length}件)
              </button>
            )}
          </div>
        </aside>
        <section className="flex-1 relative">
          <Preview3D meshes={meshes} />
        </section>
        <aside className="w-72 p-4 bg-gray-900 border-l border-gray-700 flex flex-col gap-4 overflow-y-auto">
          <ParameterPanel params={params} onChange={setParams} />
          <StatusPanel statuses={Object.values(statuses)} onDownload={downloadStl} />
        </aside>
      </main>
      <Attribution />
    </div>
  );
}
