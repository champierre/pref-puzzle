/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse, BBox, DemGrid } from '../lib/types';
import { fetchDemTiles } from '../lib/geo/tiles';
import { clipDemToPolygon } from '../lib/geo/clip';
import { buildTerrainMesh } from '../lib/mesh/terrain';
import { buildSolidMesh } from '../lib/mesh/solid';
import { buildTextMesh } from '../lib/mesh/text';
import { serializeStl } from '../lib/mesh/stl';
import { TOKYO_PUZZLE_BBOX } from '../lib/constants/kanto';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

function b64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}

function float32ToB64(arr: Float32Array): string {
  const u8 = new Uint8Array(arr.buffer);
  let str = '';
  for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i]);
  return btoa(str);
}

function bufToB64(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i]);
  return btoa(str);
}

function progress(code: string, phase: WorkerResponse['phase'], prog: number) {
  self.postMessage({ type: 'progress', code, phase, progress: prog } satisfies WorkerResponse);
}

type Ring = [number, number][];

function featureToPolygons(feature: Feature, code: string): Ring[][] {
  const geom = feature.geometry as MultiPolygon | Polygon;
  const polygons: Ring[][] = [];

  function addPolygon(coords: number[][][]) {
    const rings: Ring[] = coords.map(ring => ring.map(([lon, lat]) => [lon, lat] as [number, number]));
    // Filter Tokyo islands
    if (code === '13') {
      const outer = rings[0];
      let sumLon = 0, sumLat = 0;
      for (const [lon, lat] of outer) { sumLon += lon; sumLat += lat; }
      const cLon = sumLon / outer.length, cLat = sumLat / outer.length;
      const b = TOKYO_PUZZLE_BBOX;
      if (cLon < b.minLon || cLon > b.maxLon || cLat < b.minLat || cLat > b.maxLat) return;
    }
    polygons.push(rings);
  }

  if (geom.type === 'Polygon') addPolygon(geom.coordinates as number[][][]);
  else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as number[][][][]) addPolygon(poly);
  }
  return polygons;
}

self.onmessage = async (evt: MessageEvent<WorkerRequest>) => {
  const { type, code, boundary, demGrid: demGridMsg, params, fontBase64 } = evt.data;
  if (type !== 'generate') return;

  try {
    progress(code, 'clipping', 0.1);
    const demValues = b64ToFloat32(demGridMsg.valuesBase64);
    const demGrid: DemGrid = { bbox: demGridMsg.bbox, cols: demGridMsg.cols, rows: demGridMsg.rows, values: demValues };

    const polygons = featureToPolygons(boundary, code);

    progress(code, 'clipping', 0.3);
    const clipped = clipDemToPolygon(demGrid, polygons);

    progress(code, 'meshing', 0.5);
    const { mesh: terrain, baseZ } = buildTerrainMesh(clipped, params);

    progress(code, 'meshing', 0.65);
    const { walls, bottom } = buildSolidMesh(clipped, params, baseZ);

    progress(code, 'meshing', 0.8);
    // Centroid for text
    let sumX = 0, sumY = 0, cnt = 0;
    for (let i = 0; i < terrain.positions.length; i += 3) {
      sumX += terrain.positions[i]; sumY += terrain.positions[i + 1]; cnt++;
    }
    const cx = cnt > 0 ? sumX / cnt : 0, cy = cnt > 0 ? sumY / cnt : 0;

    const fontBuffer = Uint8Array.from(atob(fontBase64), c => c.charCodeAt(0)).buffer;
    const prefName = boundary.properties?.N03_001 as string ?? code;
    const textMesh = await buildTextMesh(prefName, fontBuffer, cx, cy, baseZ, params);

    progress(code, 'meshing', 0.9);
    const soups = [terrain, walls, bottom, ...(textMesh ? [textMesh] : [])];
    const stlBuf = serializeStl(soups);

    // World bbox
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of soups) {
      for (let i = 0; i < s.positions.length; i += 3) {
        const x = s.positions[i], y = s.positions[i + 1], z = s.positions[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }

    const resp: WorkerResponse = {
      type: 'done',
      code,
      mesh: {
        terrain: { posB64: float32ToB64(terrain.positions), normB64: float32ToB64(terrain.normals), count: terrain.triangleCount },
        walls:   { posB64: float32ToB64(walls.positions),   normB64: float32ToB64(walls.normals),   count: walls.triangleCount },
        bottom:  { posB64: float32ToB64(bottom.positions),  normB64: float32ToB64(bottom.normals),  count: bottom.triangleCount },
        text:    textMesh ? { posB64: float32ToB64(textMesh.positions), normB64: float32ToB64(textMesh.normals), count: textMesh.triangleCount } : null,
        worldBBox: { minX, maxX, minY, maxY, minZ, maxZ },
      },
      stlBase64: bufToB64(stlBuf),
    };
    self.postMessage(resp);
  } catch (e) {
    self.postMessage({ type: 'error', code, errorMessage: String(e) } satisfies WorkerResponse);
  }
};
