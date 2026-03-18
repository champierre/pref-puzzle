'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { KANTO_PREFECTURES, BASE_PATH } from '../lib/constants/kanto';

const StlViewer = dynamic(() => import('./components/StlViewer'), { ssr: false });

const FILE_SIZES: Record<string, string> = {
  '08': '75.7 MB', '09': '80.8 MB', '10': '79.7 MB',
  '11': '47.0 MB', '12': '62.2 MB', '13': '21.5 MB', '14': '28.8 MB',
};

export default function HomePage() {
  const [zipping, setZipping] = useState(false);
  const [preview, setPreview] = useState<{ code: string; name: string; color: string } | null>(null);

  async function downloadZip() {
    setZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      await Promise.all(KANTO_PREFECTURES.map(async (p) => {
        const resp = await fetch(`${BASE_PATH}/data/stl/${p.code}.stl`);
        if (resp.ok) zip.file(`${p.code}_${p.nameEn}.stl`, await resp.arrayBuffer());
      }));
      zip.file('README.txt',
        '地形データ: 国土地理院 基盤地図情報数値標高モデル（DEM）\n' +
        '行政界データ: 国土交通省 国土数値情報（行政区域データ）N03-2024\n' +
        '本データは上記データを加工して作成したものです。\n'
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'kanto-puzzle.zip'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }

  return (
    <>
      <div className="max-w-xl mx-auto px-4 py-10 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-bold mb-1">関東 3D 都県パズル</h1>
          <p className="text-gray-400 text-sm">
            国土地理院DEMから生成した3Dプリント用STLファイルです。<br />
            zoom=12 / decimation=4 / zScale=5.0（本土のみ、離島除外）
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {KANTO_PREFECTURES.map((p) => (
            <li key={p.code} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-gray-400 text-sm">{p.nameEn}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview({ code: p.code, name: p.name, color: p.color })}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600"
                >
                  プレビュー
                </button>
                <a
                  href={`${BASE_PATH}/data/stl/${p.code}.stl`}
                  download={`${p.code}_${p.nameEn}.stl`}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-sm font-medium"
                >
                  STL
                  <span className="text-blue-300 text-xs">{FILE_SIZES[p.code]}</span>
                </a>
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={downloadZip}
          disabled={zipping}
          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-lg font-semibold"
        >
          {zipping ? 'ZIP 作成中...' : '全都県まとめて ZIP DL'}
        </button>

        <footer className="text-xs text-gray-500 border-t border-gray-800 pt-4">
          地形: <a href="https://maps.gsi.go.jp/development/ichiran.html" className="underline">国土地理院基盤地図情報数値標高モデル</a> ／
          行政界: <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html" className="underline">国土交通省国土数値情報 N03-2024</a>
        </footer>
      </div>

      {/* STL プレビューモーダル */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gray-950"
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: preview.color }} />
              <span className="font-medium">{preview.name}</span>
              <span className="text-gray-400 text-xs">ドラッグで回転 / スクロールでズーム</span>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-gray-400 hover:text-white text-xl leading-none px-2"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <StlViewer
              url={`${BASE_PATH}/data/stl/${preview.code}.stl`}
              color={preview.color}
            />
          </div>
        </div>
      )}
    </>
  );
}
