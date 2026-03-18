import type { BBox, DemGrid } from '../types';
import { lonLatToWorld } from './projection';
import type { MeshGenerationParams } from '../types';

type Ring = [number, number][];

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, rings: Ring[]): boolean {
  if (!rings.length) return false;
  if (!pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return false;
  }
  return true;
}

export function clipDemToPolygon(
  demGrid: DemGrid,
  polygons: Ring[][],
): DemGrid {
  const { bbox, cols, rows, values } = demGrid;
  const lonStep = (bbox.maxLon - bbox.minLon) / cols;
  const latStep = (bbox.maxLat - bbox.minLat) / rows;
  const clipped = new Float32Array(rows * cols).fill(NaN);

  // Flatten all rings from all polygons for scanline rasterization.
  // Even-odd rule correctly handles outer rings + holes + multiple polygons.
  const allRings: Ring[] = polygons.flat();

  for (let r = 0; r < rows; r++) {
    const lat = bbox.maxLat - (r + 0.5) * latStep;

    // Collect x-intersections of all ring edges at this latitude
    const xs: number[] = [];
    for (const ring of allRings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const yi = ring[i][1], yj = ring[j][1];
        if ((yi > lat) !== (yj > lat)) {
          const xi = ring[i][0], xj = ring[j][0];
          xs.push(xi + (lat - yi) * (xj - xi) / (yj - yi));
        }
      }
    }
    xs.sort((a, b) => a - b);

    // Fill between pairs of intersections (even-odd fill)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const cStart = Math.max(0, Math.ceil((xs[k]   - bbox.minLon) / lonStep - 0.5));
      const cEnd   = Math.min(cols - 1, Math.floor((xs[k+1] - bbox.minLon) / lonStep - 0.5));
      for (let c = cStart; c <= cEnd; c++) {
        clipped[r * cols + c] = values[r * cols + c];
      }
    }
  }
  return { bbox, cols, rows, values: clipped };
}

export function computeWorldGrid(
  demGrid: DemGrid,
  params: MeshGenerationParams,
): { wx: Float32Array; wy: Float32Array; wz: Float32Array } {
  const { bbox, cols, rows, values } = demGrid;
  const lonStep = (bbox.maxLon - bbox.minLon) / cols;
  const latStep = (bbox.maxLat - bbox.minLat) / rows;
  const wx = new Float32Array(rows * cols);
  const wy = new Float32Array(rows * cols);
  const wz = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    const lat = bbox.maxLat - (r + 0.5) * latStep;
    for (let c = 0; c < cols; c++) {
      const lon = bbox.minLon + (c + 0.5) * lonStep;
      const { x, y } = lonLatToWorld(lon, lat, params);
      const elev = values[r * cols + c];
      wx[r * cols + c] = x;
      wy[r * cols + c] = y;
      wz[r * cols + c] = isNaN(elev) ? NaN : elev * params.zScale * params.xyScale;
    }
  }
  return { wx, wy, wz };
}
