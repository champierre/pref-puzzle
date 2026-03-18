import type { TriangleSoup } from '../types';

const STL_SCALE = 1000; // world units (m) → mm

function writeTriangle(view: DataView, offset: number, nx: number, ny: number, nz: number, verts: number[]): number {
  view.setFloat32(offset, nx, true); offset += 4;
  view.setFloat32(offset, ny, true); offset += 4;
  view.setFloat32(offset, nz, true); offset += 4;
  for (let i = 0; i < 9; i++) {
    view.setFloat32(offset, verts[i] * STL_SCALE, true); offset += 4;
  }
  view.setUint16(offset, 0, true); offset += 2;
  return offset;
}

export function serializeStl(soups: TriangleSoup[]): ArrayBuffer {
  const totalTris = soups.reduce((s, t) => s + t.triangleCount, 0);
  const buf = new ArrayBuffer(80 + 4 + 50 * totalTris);
  const view = new DataView(buf);
  const header = new Uint8Array(buf, 0, 80);
  const enc = new TextEncoder();
  header.set(enc.encode('pref-puzzle STL'));
  view.setUint32(80, totalTris, true);
  let offset = 84;
  for (const soup of soups) {
    const { positions, normals, triangleCount } = soup;
    for (let t = 0; t < triangleCount; t++) {
      const b = t * 9;
      const n = t * 9;
      offset = writeTriangle(view, offset,
        normals[n], normals[n + 1], normals[n + 2],
        Array.from(positions.slice(b, b + 9))
      );
    }
  }
  return buf;
}
