/**
 * Pre-downloads DEM tiles for all Kanto prefectures and saves them as binary
 * Float32Array files to public/data/dem/{z}/{x}/{y}.bin
 *
 * Usage: npx tsx scripts/fetch-dem.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const DEM_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt';
const TILE_SIZE = 256;
const OUT_DIR = path.join(process.cwd(), 'public', 'data', 'dem');

function lonToTileX(lon: number, z: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}
function latToTileY(lat: number, z: number): number {
  const latRad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
}

function bboxToTileRange(bbox: { minLon: number; maxLon: number; minLat: number; maxLat: number }, z: number) {
  return {
    xMin: lonToTileX(bbox.minLon, z),
    xMax: lonToTileX(bbox.maxLon, z),
    yMin: latToTileY(bbox.maxLat, z),
    yMax: latToTileY(bbox.minLat, z),
  };
}

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 404) { resolve(''); return; }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

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

function computeBBoxFromBoundaryFile(code: string): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
  const filePath = path.join(process.cwd(), 'public', 'data', 'boundary', `${code}.json`);
  const feature = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

  function walkCoords(coords: unknown) {
    if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number') {
      const lon = coords[0] as number, lat = coords[1] as number;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(coords)) {
      for (const c of coords) walkCoords(c);
    }
  }
  walkCoords(feature.geometry.coordinates);

  // Tokyo: filter to mainland bbox
  if (code === '13') {
    return { minLon: 138.9, maxLon: 139.95, minLat: 35.4, maxLat: 35.9 };
  }

  return { minLon, maxLon, minLat, maxLat };
}

async function fetchAndSaveTile(z: number, x: number, y: number): Promise<boolean> {
  const outPath = path.join(OUT_DIR, String(z), String(x), `${y}.bin`);
  if (fs.existsSync(outPath)) return true; // already cached

  const url = DEM_TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
  try {
    const text = await download(url);
    if (!text) return false; // 404
    const data = parseDemTxt(text);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(data.buffer));
    return true;
  } catch (e) {
    console.warn(`  WARN: failed ${z}/${x}/${y}: ${e}`);
    return false;
  }
}

async function fetchPrefDem(code: string, zoom: 12 | 14): Promise<void> {
  const bbox = computeBBoxFromBoundaryFile(code);
  const range = bboxToTileRange(bbox, zoom);
  const total = (range.xMax - range.xMin + 1) * (range.yMax - range.yMin + 1);
  console.log(`  ${code}: tiles ${range.xMin}-${range.xMax} x ${range.yMin}-${range.yMax} = ${total} tiles`);

  const tasks: Array<[number, number]> = [];
  for (let ty = range.yMin; ty <= range.yMax; ty++) {
    for (let tx = range.xMin; tx <= range.xMax; tx++) {
      tasks.push([tx, ty]);
    }
  }

  const concurrency = 8;
  let done = 0;
  for (let i = 0; i < tasks.length; i += concurrency) {
    await Promise.all(tasks.slice(i, i + concurrency).map(([tx, ty]) =>
      fetchAndSaveTile(zoom, tx, ty).then(() => {
        done++;
        if (done % 20 === 0 || done === tasks.length) {
          process.stdout.write(`\r    ${done}/${tasks.length}`);
        }
      })
    ));
  }
  console.log();
}

async function main() {
  const codes = ['08', '09', '10', '11', '12', '13', '14'];
  const zoom: 12 | 14 = 12;
  console.log(`Fetching DEM tiles at zoom ${zoom}...`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const code of codes) {
    console.log(`\nPrefecture ${code}:`);
    await fetchPrefDem(code, zoom);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
