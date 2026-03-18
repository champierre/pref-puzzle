import type { DemGrid, MeshGenerationParams, TriangleSoup } from '../types';
import { computeWorldGrid } from '../geo/clip';

function cross(ax: number, ay: number, az: number, bx: number, by: number, bz: number): [number, number, number] {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}
function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
}

export function buildTerrainMesh(demGrid: DemGrid, params: MeshGenerationParams): { mesh: TriangleSoup; baseZ: number } {
  const { cols, rows, values } = demGrid;
  const dec = params.decimation;
  const { wx, wy, wz } = computeWorldGrid(demGrid, params);

  let minValidZ = Infinity;
  for (let i = 0; i < wz.length; i++) {
    if (!isNaN(wz[i]) && wz[i] < minValidZ) minValidZ = wz[i];
  }
  if (!isFinite(minValidZ)) minValidZ = 0;
  const baseZ = minValidZ - params.baseThickness * params.xyScale;

  const seaZ = 0.0 * params.zScale * params.xyScale;

  // First pass: count valid triangles to pre-allocate typed arrays
  let triCount = 0;
  for (let r = 0; r < rows - dec; r += dec) {
    for (let c = 0; c < cols - dec; c += dec) {
      const r2 = Math.min(r + dec, rows - 1);
      const c2 = Math.min(c + dec, cols - 1);
      if (!(isNaN(values[r * cols + c]) && isNaN(values[r2 * cols + c]) &&
            isNaN(values[r * cols + c2]) && isNaN(values[r2 * cols + c2]))) {
        triCount += 2;
      }
    }
  }

  const posArr = new Float32Array(triCount * 9);
  const normArr = new Float32Array(triCount * 9);
  let ptr = 0;

  const getZ = (r: number, c: number) => {
    const z = wz[r * cols + c];
    return isNaN(z) ? seaZ : z;
  };

  for (let r = 0; r < rows - dec; r += dec) {
    for (let c = 0; c < cols - dec; c += dec) {
      const r2 = Math.min(r + dec, rows - 1);
      const c2 = Math.min(c + dec, cols - 1);
      const i00 = r * cols + c, i10 = r2 * cols + c, i01 = r * cols + c2, i11 = r2 * cols + c2;
      if (isNaN(values[i00]) && isNaN(values[i10]) && isNaN(values[i01]) && isNaN(values[i11])) continue;

      const ax = wx[i00], ay = wy[i00], az = getZ(r, c);
      const bx = wx[i10], by = wy[i10], bz = getZ(r2, c);
      const cx = wx[i01], cy = wy[i01], cz = getZ(r, c2);
      const dx = wx[i11], dy = wy[i11], dz = getZ(r2, c2);

      // Triangle A-C-B
      {
        const e1x = cx-ax, e1y = cy-ay, e1z = cz-az;
        const e2x = bx-ax, e2y = by-ay, e2z = bz-az;
        const [nx, ny, nz] = normalize3(cross(e1x, e1y, e1z, e2x, e2y, e2z));
        posArr[ptr]=ax; posArr[ptr+1]=ay; posArr[ptr+2]=az;
        posArr[ptr+3]=cx; posArr[ptr+4]=cy; posArr[ptr+5]=cz;
        posArr[ptr+6]=bx; posArr[ptr+7]=by; posArr[ptr+8]=bz;
        normArr[ptr]=nx; normArr[ptr+1]=ny; normArr[ptr+2]=nz;
        normArr[ptr+3]=nx; normArr[ptr+4]=ny; normArr[ptr+5]=nz;
        normArr[ptr+6]=nx; normArr[ptr+7]=ny; normArr[ptr+8]=nz;
        ptr += 9;
      }
      // Triangle B-C-D
      {
        const e1x = cx-bx, e1y = cy-by, e1z = cz-bz;
        const e2x = dx-bx, e2y = dy-by, e2z = dz-bz;
        const [nx, ny, nz] = normalize3(cross(e1x, e1y, e1z, e2x, e2y, e2z));
        posArr[ptr]=bx; posArr[ptr+1]=by; posArr[ptr+2]=bz;
        posArr[ptr+3]=cx; posArr[ptr+4]=cy; posArr[ptr+5]=cz;
        posArr[ptr+6]=dx; posArr[ptr+7]=dy; posArr[ptr+8]=dz;
        normArr[ptr]=nx; normArr[ptr+1]=ny; normArr[ptr+2]=nz;
        normArr[ptr+3]=nx; normArr[ptr+4]=ny; normArr[ptr+5]=nz;
        normArr[ptr+6]=nx; normArr[ptr+7]=ny; normArr[ptr+8]=nz;
        ptr += 9;
      }
    }
  }

  return {
    mesh: {
      positions: posArr,
      normals: normArr,
      triangleCount: triCount,
    },
    baseZ,
  };
}
