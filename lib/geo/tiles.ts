import type { BBox } from '../types';
import { DEM_TILE_URL, BASE_PATH } from '../constants/kanto';
import { getDemTile, setDemTile } from '../cache/idb';

export function lonToTileX(lon: number, z: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

export function latToTileY(lat: number, z: number): number {
  const latRad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
}

export function tileToNW(x: number, y: number, z: number): [number, number] {
  const n = Math.pow(2, z);
  const lon = x / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
  const lat = latRad * 180 / Math.PI;
  return [lon, lat];
}

export function bboxToTileRange(bbox: BBox, z: number) {
  return {
    xMin: lonToTileX(bbox.minLon, z),
    xMax: lonToTileX(bbox.maxLon, z),
    yMin: latToTileY(bbox.maxLat, z),
    yMax: latToTileY(bbox.minLat, z),
  };
}

const TILE_SIZE = 256;

function parseDemTxt(text: string): Float32Array {
  const rows = text.trim().split('\n');
  const data = new Float32Array(TILE_SIZE * TILE_SIZE);
  for (let r = 0; r < TILE_SIZE; r++) {
    const cols = rows[r]?.split(',') ?? [];
    for (let c = 0; c < TILE_SIZE; c++) {
      const v = cols[c];
      data[r * TILE_SIZE + c] = (!v || v.trim() === 'e') ? NaN : parseFloat(v);
    }
  }
  return data;
}

export async function fetchDemTiles(bbox: BBox, zoom: 12 | 14): Promise<{
  bbox: BBox; cols: number; rows: number; values: Float32Array;
}> {
  const range = bboxToTileRange(bbox, zoom);
  const tileXCount = range.xMax - range.xMin + 1;
  const tileYCount = range.yMax - range.yMin + 1;
  const cols = tileXCount * TILE_SIZE;
  const rows = tileYCount * TILE_SIZE;
  const values = new Float32Array(rows * cols).fill(NaN);

  const concurrency = 4;
  const tasks: Array<() => Promise<void>> = [];

  for (let ty = range.yMin; ty <= range.yMax; ty++) {
    for (let tx = range.xMin; tx <= range.xMax; tx++) {
      const lTx = tx, lTy = ty;
      tasks.push(async () => {
        const key = `dem_${zoom}_${lTx}_${lTy}`;
        let tileData: Float32Array | null = await getDemTile(key);
        if (!tileData) {
          // Try pre-bundled binary tile first (faster, no parse needed)
          const binUrl = `${BASE_PATH}/data/dem/${zoom}/${lTx}/${lTy}.bin`;
          try {
            const binResp = await fetch(binUrl);
            if (binResp.ok) {
              const buf = await binResp.arrayBuffer();
              tileData = new Float32Array(buf);
              await setDemTile(key, tileData);
            }
          } catch { /* not pre-bundled, fall through */ }
        }
        if (!tileData) {
          const url = DEM_TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(lTx)).replace('{y}', String(lTy));
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 5000);
            const resp = await fetch(url, { signal: ctrl.signal });
            clearTimeout(timer);
            if (resp.ok) {
              tileData = parseDemTxt(await resp.text());
              await setDemTile(key, tileData);
            }
          } catch { /* 404 or timeout → leave NaN */ }
        }
        if (tileData) {
          const offX = (lTx - range.xMin) * TILE_SIZE;
          const offY = (lTy - range.yMin) * TILE_SIZE;
          for (let r = 0; r < TILE_SIZE; r++) {
            for (let c = 0; c < TILE_SIZE; c++) {
              values[(offY + r) * cols + (offX + c)] = tileData[r * TILE_SIZE + c];
            }
          }
        }
      });
    }
  }

  // Run with concurrency limit
  for (let i = 0; i < tasks.length; i += concurrency) {
    await Promise.all(tasks.slice(i, i + concurrency).map(t => t()));
  }

  const [nwLon, nwLat] = tileToNW(range.xMin, range.yMin, zoom);
  const [seLon, seLat] = tileToNW(range.xMax + 1, range.yMax + 1, zoom);

  return { bbox: { minLon: nwLon, maxLon: seLon, minLat: seLat, maxLat: nwLat }, cols, rows, values };
}
