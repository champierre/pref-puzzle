import type { PrefectureInfo, BBox } from '../types';

export const KANTO_PREFECTURES: PrefectureInfo[] = [
  { code:'08', name:'茨城県',  capital:'水戸',     nameEn:'Ibaraki',  capitalEn:'Mito',       color:'#4ade80' },
  { code:'09', name:'栃木県',  capital:'宇都宮',   nameEn:'Tochigi',  capitalEn:'Utsunomiya', color:'#60a5fa' },
  { code:'10', name:'群馬県',  capital:'前橋',     nameEn:'Gunma',    capitalEn:'Maebashi',   color:'#f97316' },
  { code:'11', name:'埼玉県',  capital:'さいたま', nameEn:'Saitama',  capitalEn:'Saitama',    color:'#a78bfa' },
  { code:'12', name:'千葉県',  capital:'千葉',     nameEn:'Chiba',    capitalEn:'Chiba',      color:'#fb923c' },
  { code:'13', name:'東京都',  capital:'東京',     nameEn:'Tokyo',    capitalEn:'Tokyo',      color:'#f43f5e' },
  { code:'14', name:'神奈川県', capital:'横浜',    nameEn:'Kanagawa', capitalEn:'Yokohama',   color:'#facc15' },
];

export const TOKYO_PUZZLE_BBOX: BBox = { minLon:138.9, maxLon:139.95, minLat:35.4, maxLat:35.9 };

export const PROJ_CENTER = { lat: 36.0, lon: 139.0 };
export const METERS_PER_DEGREE = 111320;

export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/pref-puzzle' : '';

export const DEM_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt';

export const DEFAULT_PARAMS = {
  zoom: 12 as const,
  xyScale: 1 / 50000,
  zScale: 2.0,
  baseThickness: 3.0,
  clearance: 0.2,
  decimation: 1,
  smoothing: false,
  noDataFill: 'sea' as const,
  includeIslands: false,
  minIslandArea: 1.0,
  textMode: 'emboss' as const,
  textDepth: 0.5,
  fontSize: 12,
  textMargin: 2,
};
