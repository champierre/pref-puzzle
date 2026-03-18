import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const CODES = ['08', '09', '10', '11', '12', '13', '14'];
const OUT_DIR = path.join(process.cwd(), 'public', 'data', 'boundary');

// N03 ZIP URL pattern (update year as needed)
const N03_URL = (code: string) =>
  `https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2024/N03-20240101_${code}_GML.zip`;

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

function parseGmlCoords(posList: string): number[][] {
  const nums = posList.trim().split(/\s+/).map(Number);
  const coords: number[][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    // GML is lat-lon → swap to lon-lat
    coords.push([nums[i + 1], nums[i]]);
  }
  return coords;
}

function extractPolygons(xml: unknown): Polygon[] {
  const polygons: Polygon[] = [];
  function walk(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    const rec = obj as Record<string, unknown>;
    // Look for gml:LinearRing/gml:posList pattern
    const keys = Object.keys(rec);
    for (const k of keys) {
      if (k.includes('posList')) {
        const val = rec[k];
        const posStr = typeof val === 'string' ? val : (val as Record<string, unknown>)['#text'] as string;
        if (posStr) {
          const coords = parseGmlCoords(posStr);
          if (coords.length >= 3) polygons.push({ type: 'Polygon', coordinates: [coords] });
        }
      } else {
        walk(rec[k]);
      }
    }
  }
  walk(xml);
  return polygons;
}

async function fetchBoundary(code: string): Promise<void> {
  const outFile = path.join(OUT_DIR, `${code}.json`);
  if (fs.existsSync(outFile)) {
    console.log(`  ${code}.json already exists, skipping`);
    return;
  }

  console.log(`  Downloading N03 for ${code}...`);
  const buf = await download(N03_URL(code));
  const zip = await JSZip.loadAsync(buf);

  const xmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.xml') || f.endsWith('.XML'));
  console.log(`  Found ${xmlFiles.length} XML files`);

  const allPolygons: Polygon[] = [];
  for (const xmlFile of xmlFiles) {
    const xmlStr = await zip.files[xmlFile].async('string');
    const parsed = parser.parse(xmlStr);
    const polys = extractPolygons(parsed);
    allPolygons.push(...polys);
  }

  const feature = {
    type: 'Feature',
    properties: { code, N03_001: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'][parseInt(code) - 8] },
    geometry: {
      type: 'MultiPolygon',
      coordinates: allPolygons.map(p => p.coordinates),
    },
  };

  fs.writeFileSync(outFile, JSON.stringify(feature));
  console.log(`  Written ${code}.json (${allPolygons.length} polygons)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Fetching boundary data...');
  for (const code of CODES) {
    try {
      await fetchBoundary(code);
    } catch (e) {
      console.error(`  ERROR for ${code}:`, e);
      process.exit(1);
    }
  }
  console.log('Done.');
}

main();
