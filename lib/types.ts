export interface PrefectureInfo {
  code: string; name: string; capital: string;
  nameEn: string; capitalEn: string; color: string;
}

export interface BBox { minLon: number; maxLon: number; minLat: number; maxLat: number; }

export interface DemGrid {
  bbox: BBox; cols: number; rows: number;
  values: Float32Array;
}

export type TextMode = 'emboss' | 'engrave' | 'none';

export interface MeshGenerationParams {
  zoom: 12 | 14;
  xyScale: number;
  zScale: number;
  baseThickness: number;
  clearance: number;
  decimation: number;
  smoothing: boolean;
  noDataFill: 'sea' | 'interpolate';
  includeIslands: boolean;
  minIslandArea: number;
  textMode: TextMode;
  textDepth: number;
  fontSize: number;
  textMargin: number;
}

export interface TriangleSoup {
  positions: Float32Array;
  normals: Float32Array;
  triangleCount: number;
}

export interface PrefectureMesh {
  terrain: TriangleSoup; walls: TriangleSoup; bottom: TriangleSoup;
  text: TriangleSoup | null;
  worldBBox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

export type GenerationPhase =
  'idle' | 'fetching-boundary' | 'fetching-dem' | 'clipping' | 'meshing' | 'ready' | 'error';

export interface PrefectureStatus {
  code: string; phase: GenerationPhase; progress: number; errorMessage?: string;
}

export interface WorkerRequest {
  type: 'generate';
  code: string;
  boundary: GeoJSON.Feature;
  demGrid: { bbox: BBox; cols: number; rows: number; valuesBase64: string };
  params: MeshGenerationParams;
  fontBase64: string;
}

export interface WorkerResponse {
  type: 'progress' | 'done' | 'error';
  code: string;
  phase?: GenerationPhase;
  progress?: number;
  mesh?: {
    terrain: { posB64: string; normB64: string; count: number };
    walls:   { posB64: string; normB64: string; count: number };
    bottom:  { posB64: string; normB64: string; count: number };
    text:    { posB64: string; normB64: string; count: number } | null;
    worldBBox: PrefectureMesh['worldBBox'];
  };
  stlBase64?: string;
  errorMessage?: string;
}
