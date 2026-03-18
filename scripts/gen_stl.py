#!/usr/bin/env python3
"""
関東7都県のSTLファイルをNumPyで高速生成するスクリプト。
public/data/dem/ の事前バンドルタイル（fetch-dem.ts で生成）を使用し、
public/data/stl/{code}.stl に出力する。

Usage:
  python3 scripts/gen_stl.py              # 全都県
  python3 scripts/gen_stl.py 13           # 東京のみ
  python3 scripts/gen_stl.py --dec 2 13   # decimation=2 で東京

デフォルト decimation=4（zoom12 で約76m 解像度、東京 STL で約5MB）。
decimation=1 にすると ~200MB になり GitHub Pages には不向き。
"""
import json, math, os, struct, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np

# ── 定数（lib/constants/kanto.ts と同値） ──────────────────────────────────
PROJ_CENTER_LAT = 36.0
PROJ_CENTER_LON = 139.0
METERS_PER_DEGREE = 111320.0
COS_CENTER = math.cos(PROJ_CENTER_LAT * math.pi / 180)
TILE_SIZE = 256
DEM_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
TOKYO_PUZZLE_BBOX = dict(minLon=138.9, maxLon=139.95, minLat=35.4, maxLat=35.9)

# デフォルトパラメータ
ZOOM       = 12
XY_SCALE   = 1 / 50000
Z_SCALE    = 2.0
BASE_THICK = 3.0
DECIMATION = 4   # 1 にすると ~200MB/県

CODES = ['08', '09', '10', '11', '12', '13', '14']

# ── タイル座標変換 ─────────────────────────────────────────────────────────
def lon_to_tile_x(lon, z): return int((lon + 180) / 360 * (2**z))
def lat_to_tile_y(lat, z):
    lr = lat * math.pi / 180
    return int((1 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2 * (2**z))
def tile_to_nw(x, y, z):
    n = 2**z
    lon = x / n * 360 - 180
    lat = math.atan(math.sinh(math.pi * (1 - 2 * y / n))) * 180 / math.pi
    return lon, lat

# ── タイル読み込み ─────────────────────────────────────────────────────────
def parse_dem_txt(text):
    data = np.full(TILE_SIZE * TILE_SIZE, np.nan, dtype=np.float32)
    for r, row in enumerate(text.strip().split('\n')[:TILE_SIZE]):
        for c, v in enumerate(row.split(',')[:TILE_SIZE]):
            v = v.strip()
            if v and v != 'e':
                try: data[r * TILE_SIZE + c] = float(v)
                except ValueError: pass
    return data

def load_tile(z, x, y, dem_dir):
    bin_path = os.path.join(dem_dir, str(z), str(x), f'{y}.bin')
    if os.path.exists(bin_path):
        raw = np.frombuffer(open(bin_path, 'rb').read(), dtype='<f4')
        return raw.copy()
    url = DEM_TILE_URL.format(z=z, x=x, y=y)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            data = parse_dem_txt(r.read().decode())
        os.makedirs(os.path.dirname(bin_path), exist_ok=True)
        data.astype('<f4').tofile(bin_path)
        return data
    except (urllib.error.HTTPError, Exception):
        return np.full(TILE_SIZE * TILE_SIZE, np.nan, dtype=np.float32)

# ── DEM グリッド取得 ───────────────────────────────────────────────────────
def fetch_dem_grid(bbox, dem_dir):
    xm = lon_to_tile_x(bbox['minLon'], ZOOM)
    xM = lon_to_tile_x(bbox['maxLon'], ZOOM)
    ym = lat_to_tile_y(bbox['maxLat'], ZOOM)
    yM = lat_to_tile_y(bbox['minLat'], ZOOM)
    nX, nY = xM - xm + 1, yM - ym + 1
    cols, rows = nX * TILE_SIZE, nY * TILE_SIZE
    values = np.full((rows, cols), np.nan, dtype=np.float32)

    tasks = [(tx, ty) for ty in range(ym, yM+1) for tx in range(xm, xM+1)]
    total = len(tasks)
    done = [0]
    def _load(tx, ty):
        tile = load_tile(ZOOM, tx, ty, dem_dir).reshape(TILE_SIZE, TILE_SIZE)
        ox, oy = (tx - xm) * TILE_SIZE, (ty - ym) * TILE_SIZE
        return tx, ty, tile, ox, oy
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(_load, tx, ty): (tx, ty) for tx, ty in tasks}
        for fut in as_completed(futs):
            tx, ty, tile, ox, oy = fut.result()
            values[oy:oy+TILE_SIZE, ox:ox+TILE_SIZE] = tile
            done[0] += 1
            print(f'\r  tiles {done[0]}/{total}', end='', flush=True)
    print()

    nw_lon, nw_lat = tile_to_nw(xm, ym, ZOOM)
    se_lon, se_lat = tile_to_nw(xM+1, yM+1, ZOOM)
    bbox_out = dict(minLon=nw_lon, maxLon=se_lon, minLat=se_lat, maxLat=nw_lat)
    return bbox_out, values

# ── 境界BOX ────────────────────────────────────────────────────────────────
def compute_bbox(geometry, code):
    if code == '13':
        return TOKYO_PUZZLE_BBOX
    lons, lats = [], []
    def walk(c):
        if isinstance(c, list) and len(c) == 2 and isinstance(c[0], (int, float)):
            lons.append(c[0]); lats.append(c[1])
        elif isinstance(c, list):
            for x in c: walk(x)
    walk(geometry['coordinates'])
    return dict(minLon=min(lons), maxLon=max(lons), minLat=min(lats), maxLat=max(lats))

# ── ポリゴン抽出 ──────────────────────────────────────────────────────────
def feature_to_polygons(feature, code):
    geom = feature['geometry']
    polygons = []
    def add_poly(coords):
        rings = [[(p[0], p[1]) for p in ring] for ring in coords]
        if code == '13':
            outer = rings[0]
            cx = sum(p[0] for p in outer) / len(outer)
            cy = sum(p[1] for p in outer) / len(outer)
            b = TOKYO_PUZZLE_BBOX
            if cx < b['minLon'] or cx > b['maxLon'] or cy < b['minLat'] or cy > b['maxLat']:
                return
        polygons.append(rings)
    if geom['type'] == 'Polygon':
        add_poly(geom['coordinates'])
    elif geom['type'] == 'MultiPolygon':
        for poly in geom['coordinates']: add_poly(poly)
    return polygons

# ── スキャンラインクリッピング ─────────────────────────────────────────────
def clip_dem(bbox, values, polygons):
    rows, cols = values.shape
    lon_step = (bbox['maxLon'] - bbox['minLon']) / cols
    lat_step = (bbox['maxLat'] - bbox['minLat']) / rows
    clipped = np.full_like(values, np.nan)
    all_rings = [np.array(ring) for poly in polygons for ring in poly]

    for r in range(rows):
        lat = bbox['maxLat'] - (r + 0.5) * lat_step
        xs = []
        for ring in all_rings:
            lons_r = ring[:, 0]; lats_r = ring[:, 1]
            yi = lats_r; yj = np.roll(lats_r, 1)
            xi = lons_r; xj = np.roll(lons_r, 1)
            mask = (yi > lat) != (yj > lat)
            if mask.any():
                denom = yj[mask] - yi[mask]
                x_int = xi[mask] + (lat - yi[mask]) * (xj[mask] - xi[mask]) / denom
                xs.extend(x_int.tolist())
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            c0 = max(0, math.ceil((xs[k]   - bbox['minLon']) / lon_step - 0.5))
            c1 = min(cols-1, math.floor((xs[k+1] - bbox['minLon']) / lon_step - 0.5))
            if c0 <= c1:
                clipped[r, c0:c1+1] = values[r, c0:c1+1]
    return clipped

# ── ワールド座標グリッド ───────────────────────────────────────────────────
def world_grid(bbox, values):
    rows, cols = values.shape
    lon_step = (bbox['maxLon'] - bbox['minLon']) / cols
    lat_step = (bbox['maxLat'] - bbox['minLat']) / rows
    c_idx = np.arange(cols, dtype=np.float32)
    r_idx = np.arange(rows, dtype=np.float32)
    lons = bbox['minLon'] + (c_idx + 0.5) * lon_step
    lats = bbox['maxLat'] - (r_idx + 0.5) * lat_step
    lons2d, lats2d = np.meshgrid(lons, lats)
    wx = ((lons2d - PROJ_CENTER_LON) * COS_CENTER * METERS_PER_DEGREE * XY_SCALE).astype(np.float32)
    wy = ((lats2d - PROJ_CENTER_LAT) * METERS_PER_DEGREE * XY_SCALE).astype(np.float32)
    wz = np.where(np.isnan(values), np.nan, (values * Z_SCALE * XY_SCALE).astype(np.float32))
    return wx, wy, wz

# ── STL 型 ────────────────────────────────────────────────────────────────
STL_TRI = np.dtype([('n','<3f4'),('v0','<3f4'),('v1','<3f4'),('v2','<3f4'),('a','<u2')])

def _norms(e1, e2):
    """e1, e2: (N,3). Returns unit normals (N,3)."""
    n = np.cross(e1, e2)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln = np.where(ln > 0, ln, 1.0)
    return (n / ln).astype(np.float32)

def make_tris(p0, p1, p2):
    """p0/p1/p2: (N,3) float32. Returns STL_TRI array (N,)."""
    e1 = p1 - p0; e2 = p2 - p0
    n = _norms(e1, e2)
    out = np.zeros(len(p0), dtype=STL_TRI)
    out['n'] = n; out['v0'] = p0; out['v1'] = p1; out['v2'] = p2
    return out

# ── 地形メッシュ ──────────────────────────────────────────────────────────
def build_terrain(bbox, values, dec):
    rows, cols = values.shape
    wx, wy, wz = world_grid(bbox, values)
    sea_z = np.float32(0.0)
    wz_f = np.where(np.isnan(wz), sea_z, wz).astype(np.float32)

    valid_z = wz_f[~np.isnan(wz)]
    base_z = float(valid_z.min()) - BASE_THICK * XY_SCALE if len(valid_z) else 0.0

    R, C = np.meshgrid(np.arange(0, rows-dec, dec), np.arange(0, cols-dec, dec), indexing='ij')
    R2 = np.minimum(R + dec, rows-1)
    C2 = np.minimum(C + dec, cols-1)

    v00 = values[R, C]; v10 = values[R2, C]; v01 = values[R, C2]; v11 = values[R2, C2]
    m = ~(np.isnan(v00) & np.isnan(v10) & np.isnan(v01) & np.isnan(v11))
    R=R[m]; C=C[m]; R2=R2[m]; C2=C2[m]

    def xyz(r, c): return np.stack([wx[r,c], wy[r,c], wz_f[r,c]], axis=1)
    A=xyz(R,C); B=xyz(R2,C); C_=xyz(R,C2); D=xyz(R2,C2)

    t1 = make_tris(A, C_, B)   # winding: A-C-B
    t2 = make_tris(B, C_, D)   # winding: B-C-D
    tris = np.concatenate([t1, t2])
    return tris, base_z

# ── 壁メッシュ ────────────────────────────────────────────────────────────
def _wall_quads(x1, y1, z1, x2, y2, z2, bz):
    """pushWallQuad 相当。p1→p2 エッジの壁 (N*2 tri) を返す。"""
    nx = -(y2 - y1); ny = x2 - x1
    ln = np.sqrt(nx**2 + ny**2); ln = np.where(ln > 0, ln, 1.0)
    nx /= ln; ny /= ln
    nz = np.zeros_like(nx)
    bz_arr = np.full(len(x1), bz, dtype=np.float32)
    p1t = np.stack([x1, y1, z1], axis=1).astype(np.float32)
    p2t = np.stack([x2, y2, z2], axis=1).astype(np.float32)
    p1b = np.stack([x1, y1, bz_arr], axis=1).astype(np.float32)
    p2b = np.stack([x2, y2, bz_arr], axis=1).astype(np.float32)
    nm  = np.stack([nx, ny, nz], axis=1).astype(np.float32)
    N = len(x1)
    out = np.zeros(N * 2, dtype=STL_TRI)
    out['n'][:N] = nm; out['v0'][:N] = p1t; out['v1'][:N] = p2t; out['v2'][:N] = p1b
    out['n'][N:] = nm; out['v0'][N:] = p2t; out['v1'][N:] = p2b; out['v2'][N:] = p1b
    return out

def build_walls(bbox, values, base_z, dec):
    rows, cols = values.shape
    wx, wy, wz = world_grid(bbox, values)
    sea_z = np.float32(0.0)
    wz_f = np.where(np.isnan(wz), sea_z, wz).astype(np.float32)
    bz = np.float32(base_z)

    R, C = np.meshgrid(np.arange(0, rows, dec), np.arange(0, cols, dec), indexing='ij')
    R2 = np.minimum(R + dec, rows-1)
    C2 = np.minimum(C + dec, cols-1)
    valid = ~np.isnan(values[R, C])

    def nbr_invalid(dr, dc):
        nr = R + dr; nc = C + dc
        oob = (nr < 0) | (nr >= rows) | (nc < 0) | (nc >= cols)
        nr_s = np.clip(nr, 0, rows-1); nc_s = np.clip(nc, 0, cols-1)
        return valid & (oob | np.isnan(values[nr_s, nc_s]))

    parts = []
    # top neighbor invalid → wall from (R,C2) to (R,C)
    m = nbr_invalid(-dec, 0)
    if m.any():
        r,c,c2 = R[m],C[m],C2[m]
        parts.append(_wall_quads(wx[r,c2],wy[r,c2],wz_f[r,c2], wx[r,c],wy[r,c],wz_f[r,c], bz))
    # bottom neighbor invalid → wall from (R2,C) to (R2,C2)
    m = nbr_invalid(dec, 0)
    if m.any():
        r2,c,c2 = R2[m],C[m],C2[m]
        parts.append(_wall_quads(wx[r2,c],wy[r2,c],wz_f[r2,c], wx[r2,c2],wy[r2,c2],wz_f[r2,c2], bz))
    # left neighbor invalid → wall from (R,C) to (R2,C)
    m = nbr_invalid(0, -dec)
    if m.any():
        r,r2,c = R[m],R2[m],C[m]
        parts.append(_wall_quads(wx[r,c],wy[r,c],wz_f[r,c], wx[r2,c],wy[r2,c],wz_f[r2,c], bz))
    # right neighbor invalid → wall from (R2,C2) to (R,C2)
    m = nbr_invalid(0, dec)
    if m.any():
        r,r2,c2 = R[m],R2[m],C2[m]
        parts.append(_wall_quads(wx[r2,c2],wy[r2,c2],wz_f[r2,c2], wx[r,c2],wy[r,c2],wz_f[r,c2], bz))

    return np.concatenate(parts) if parts else np.zeros(0, dtype=STL_TRI)

# ── 底面メッシュ ──────────────────────────────────────────────────────────
def build_bottom(bbox, values, base_z, dec):
    rows, cols = values.shape
    wx, wy, _ = world_grid(bbox, values)
    bz = np.float32(base_z)

    R, C = np.meshgrid(np.arange(0, rows-dec, dec), np.arange(0, cols-dec, dec), indexing='ij')
    R2 = np.minimum(R + dec, rows-1)
    C2 = np.minimum(C + dec, cols-1)

    v00 = values[R,C]; v10 = values[R2,C]; v01 = values[R,C2]; v11 = values[R2,C2]
    m = ~(np.isnan(v00) & np.isnan(v10) & np.isnan(v01) & np.isnan(v11))
    R=R[m]; C=C[m]; R2=R2[m]; C2=C2[m]

    bz_col = np.full(len(R), bz, dtype=np.float32)
    def xyz_bot(r, c): return np.stack([wx[r,c], wy[r,c], bz_col], axis=1).astype(np.float32)
    A=xyz_bot(R,C); B=xyz_bot(R2,C); C_=xyz_bot(R,C2); D=xyz_bot(R2,C2)

    # 逆巻きで下向き法線
    t1 = make_tris(A, B, C_)
    t2 = make_tris(B, D, C_)
    # 法線を強制的に (0,0,-1) に上書き
    tris = np.concatenate([t1, t2])
    tris['n'] = (0.0, 0.0, -1.0)
    return tris

# ── STL 書き出し ──────────────────────────────────────────────────────────
def write_stl(path, tri_arrays):
    all_tris = np.concatenate([t for t in tri_arrays if len(t) > 0])
    with open(path, 'wb') as f:
        f.write(b'\x00' * 80)
        f.write(struct.pack('<I', len(all_tris)))
        f.write(all_tris.tobytes())

# ── メイン ────────────────────────────────────────────────────────────────
def gen_one(code, base_dir, dec):
    boundary_path = os.path.join(base_dir, 'public', 'data', 'boundary', f'{code}.json')
    dem_dir       = os.path.join(base_dir, 'public', 'data', 'dem')
    out_dir       = os.path.join(base_dir, 'public', 'data', 'stl')
    out_path      = os.path.join(out_dir, f'{code}.stl')

    print(f'\n=== {code} ===')
    with open(boundary_path) as f:
        feature = json.load(f)

    bbox = compute_bbox(feature['geometry'], code)
    print(f'  bbox: lon {bbox["minLon"]:.3f}–{bbox["maxLon"]:.3f}  lat {bbox["minLat"]:.3f}–{bbox["maxLat"]:.3f}')

    print('  DEM 読み込み中...')
    grid_bbox, values = fetch_dem_grid(bbox, dem_dir)
    print(f'  グリッド: {values.shape[0]}×{values.shape[1]}')

    print('  クリッピング中...')
    polygons = feature_to_polygons(feature, code)
    clipped  = clip_dem(grid_bbox, values, polygons)
    valid_n  = int(np.sum(~np.isnan(clipped)))
    print(f'  有効セル: {valid_n:,}')

    print('  地形メッシュ生成...')
    terrain_tris, base_z = build_terrain(grid_bbox, clipped, dec)
    print(f'  地形 tri: {len(terrain_tris):,}')

    print('  壁メッシュ生成...')
    wall_tris = build_walls(grid_bbox, clipped, base_z, dec)
    print(f'  壁 tri: {len(wall_tris):,}')

    print('  底面メッシュ生成...')
    bot_tris = build_bottom(grid_bbox, clipped, base_z, dec)
    print(f'  底面 tri: {len(bot_tris):,}')

    os.makedirs(out_dir, exist_ok=True)
    write_stl(out_path, [terrain_tris, wall_tris, bot_tris])
    mb = os.path.getsize(out_path) / (1024**2)
    total = len(terrain_tris) + len(wall_tris) + len(bot_tris)
    print(f'  完了: {out_path}  ({total:,} tri, {mb:.1f} MB)')

def main():
    args = sys.argv[1:]
    dec = DECIMATION
    codes = []
    i = 0
    while i < len(args):
        if args[i] == '--dec' and i + 1 < len(args):
            dec = int(args[i+1]); i += 2
        else:
            codes.append(args[i]); i += 1
    if not codes:
        codes = CODES

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f'decimation={dec}  zoom={ZOOM}')
    for code in codes:
        gen_one(code, base_dir, dec)
    print('\n全完了。')

if __name__ == '__main__':
    main()
