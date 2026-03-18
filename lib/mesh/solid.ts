import type { DemGrid, MeshGenerationParams, TriangleSoup } from '../types';
import { computeWorldGrid } from '../geo/clip';
import earcut from 'earcut';

export function buildSolidMesh(
  demGrid: DemGrid,
  params: MeshGenerationParams,
  baseZ: number,
): { walls: TriangleSoup; bottom: TriangleSoup } {
  const { cols, rows, values } = demGrid;
  const { wx, wy, wz } = computeWorldGrid(demGrid, params);
  const dec = params.decimation;

  const seaZ = 0.0 * params.zScale * params.xyScale;
  function getXYZ(r: number, c: number): [number, number, number] {
    const idx = r * cols + c;
    const z = isNaN(wz[idx]) ? seaZ : wz[idx];
    return [wx[idx], wy[idx], z];
  }
  function isValid(r: number, c: number) {
    return r >= 0 && r < rows && c >= 0 && c < cols && !isNaN(values[r * cols + c]);
  }

  // Collect boundary edges (valid cell adjacent to invalid)
  const wallPosArr: number[] = [];
  const wallNormArr: number[] = [];

  function pushWallQuad(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    // Wall from top edge (A_top, B_top) down to baseZ
    const nx = -(by - ay), ny = bx - ax, nz = 0;
    const len = Math.sqrt(nx * nx + ny * ny);
    const nnx = len > 0 ? nx / len : 0, nny = len > 0 ? ny / len : 0;
    // Tri 1: A_top, B_top, A_bot
    wallPosArr.push(ax, ay, az, bx, by, bz, ax, ay, baseZ);
    wallNormArr.push(nnx, nny, 0, nnx, nny, 0, nnx, nny, 0);
    // Tri 2: B_top, B_bot, A_bot
    wallPosArr.push(bx, by, bz, bx, by, baseZ, ax, ay, baseZ);
    wallNormArr.push(nnx, nny, 0, nnx, nny, 0, nnx, nny, 0);
  }

  for (let r = 0; r < rows; r += dec) {
    for (let c = 0; c < cols; c += dec) {
      if (!isValid(r, c)) continue;
      const r2 = Math.min(r + dec, rows - 1);
      const c2 = Math.min(c + dec, cols - 1);
      const A = getXYZ(r, c);
      const B = getXYZ(r2, c);
      const C = getXYZ(r, c2);
      const D = getXYZ(r2, c2);

      // Check 4 neighbors
      if (!isValid(r - dec, c)) pushWallQuad(C[0], C[1], C[2], A[0], A[1], A[2]);
      if (!isValid(r + dec, c)) pushWallQuad(B[0], B[1], B[2], D[0], D[1], D[2]);
      if (!isValid(r, c - dec)) pushWallQuad(A[0], A[1], A[2], B[0], B[1], B[2]);
      if (!isValid(r, c + dec)) pushWallQuad(D[0], D[1], D[2], C[0], C[1], C[2]);
    }
  }

  // Bottom face: collect all valid boundary vertices in XY and earcut
  const botVerts: number[] = [];
  const seen = new Set<number>();
  for (let r = 0; r < rows; r += dec) {
    for (let c = 0; c < cols; c += dec) {
      if (!isValid(r, c)) continue;
      const key = r * cols + c;
      if (!seen.has(key)) {
        seen.add(key);
        const idx = r * cols + c;
        botVerts.push(wx[idx], wy[idx]);
      }
    }
  }

  const indices = earcut(botVerts, undefined, 2);
  const botPosArr: number[] = [];
  const botNormArr: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    // Reverse winding for downward normal
    const i0 = indices[i] * 2, i1 = indices[i + 2] * 2, i2 = indices[i + 1] * 2;
    botPosArr.push(botVerts[i0], botVerts[i0 + 1], baseZ);
    botPosArr.push(botVerts[i1], botVerts[i1 + 1], baseZ);
    botPosArr.push(botVerts[i2], botVerts[i2 + 1], baseZ);
    botNormArr.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  }

  return {
    walls: { positions: new Float32Array(wallPosArr), normals: new Float32Array(wallNormArr), triangleCount: wallPosArr.length / 9 },
    bottom: { positions: new Float32Array(botPosArr), normals: new Float32Array(botNormArr), triangleCount: botPosArr.length / 9 },
  };
}
