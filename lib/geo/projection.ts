import { PROJ_CENTER, METERS_PER_DEGREE } from '../constants/kanto';
import type { MeshGenerationParams } from '../types';

const COS_CENTER = Math.cos(PROJ_CENTER.lat * Math.PI / 180);

export function lonLatToWorld(lon: number, lat: number, params: Pick<MeshGenerationParams, 'xyScale'>) {
  const mx = (lon - PROJ_CENTER.lon) * COS_CENTER * METERS_PER_DEGREE;
  const my = (lat - PROJ_CENTER.lat) * METERS_PER_DEGREE;
  return { x: mx * params.xyScale, y: my * params.xyScale };
}

export function elevToWorld(elev: number, params: Pick<MeshGenerationParams, 'xyScale' | 'zScale'>) {
  return elev * params.zScale * params.xyScale;
}
