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
PUZZLE_BBOXES = {
    '08': dict(minLon=139.50, maxLon=141.00, minLat=35.60, maxLat=37.00),  # 茨城
    '09': dict(minLon=139.20, maxLon=140.40, minLat=36.10, maxLat=37.20),  # 栃木
    '10': dict(minLon=138.30, maxLon=139.80, minLat=35.90, maxLat=37.10),  # 群馬
    '11': dict(minLon=138.60, maxLon=140.00, minLat=35.60, maxLat=36.40),  # 埼玉
    '12': dict(minLon=139.60, maxLon=141.00, minLat=34.80, maxLat=36.20),  # 千葉
    '13': dict(minLon=138.90, maxLon=139.95, minLat=35.40, maxLat=35.90),  # 東京（本土）
    '14': dict(minLon=138.80, maxLon=140.00, minLat=35.00, maxLat=35.80),  # 神奈川
}

# デフォルトパラメータ
ZOOM       = 12
XY_SCALE      = 1.5 / 1660
Z_SCALE       = 5.0
BASE_THICK    = 3.0
DECIMATION    = 4   # 1 にすると ~200MB/県
CLEARANCE_PX  = 8   # 境界クリアランス（ピクセル数、約0.27mm/辺）

CODES = ['08', '09', '10', '11', '12', '13', '14']

# ── 彫刻設定 ──────────────────────────────────────────────────────────────
ENGRAVE_DEPTH   = 0.4   # 彫り深さ (mm)
ENGRAVE_TEXT_MM = 5.0   # テキスト行高さ (mm)

PREFECTURE_INFO = {
    '08': ('08', '茨城県', '水戸市'),
    '09': ('09', '栃木県', '宇都宮市'),
    '10': ('10', '群馬県', '前橋市'),
    '11': ('11', '埼玉県', 'さいたま市'),
    '12': ('12', '千葉県', '千葉市'),
    '13': ('13', '東京都', '新宿区'),
    '14': ('14', '神奈川県', '横浜市'),
}

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
    return PUZZLE_BBOXES[code]

# ── ポリゴン抽出 ──────────────────────────────────────────────────────────
def feature_to_polygons(feature, code):
    geom = feature['geometry']
    b = PUZZLE_BBOXES[code]
    polygons = []
    def add_poly(coords):
        rings = [[(p[0], p[1]) for p in ring] for ring in coords]
        outer = rings[0]
        cx = sum(p[0] for p in outer) / len(outer)
        cy = sum(p[1] for p in outer) / len(outer)
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

# ── 境界クリアランス ──────────────────────────────────────────────────────
def apply_clearance(clipped, px):
    """有効セルマスクを px ピクセル内側に縮小してピース間の隙間を確保する。"""
    if px <= 0:
        return clipped
    valid = (~np.isnan(clipped)).astype(np.uint8)
    # 上下左右に px 回シフトしながら AND をとる（マンハッタン erosion）
    eroded = valid.copy()
    for _ in range(px):
        eroded &= np.roll(eroded,  1, axis=0)
        eroded &= np.roll(eroded, -1, axis=0)
        eroded &= np.roll(eroded,  1, axis=1)
        eroded &= np.roll(eroded, -1, axis=1)
        # 端が巻き込まれないよう境界行列を 0 にリセット
        eroded[0, :] = 0; eroded[-1, :] = 0
        eroded[:, 0] = 0; eroded[:, -1] = 0
    result = clipped.copy()
    result[eroded == 0] = np.nan
    return result

# ── テキスト彫刻 ──────────────────────────────────────────────────────────
def find_jp_font():
    candidates = [
        '/System/Library/Fonts/AquaKana.ttc',
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def make_text_mask(values, text_lines, font_path, px_per_mm):
    """底面中央にテキストマスクを生成する（裏面から読めるよう左右ミラー）。"""
    from PIL import Image, ImageDraw, ImageFont
    rows, cols = values.shape
    valid = ~np.isnan(values)
    if not valid.any() or font_path is None:
        return np.zeros((rows, cols), dtype=bool)
    font_size = max(8, int(ENGRAVE_TEXT_MM * px_per_mm))
    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception:
        print('  警告: フォント読み込み失敗。テキスト彫刻スキップ。')
        return np.zeros((rows, cols), dtype=bool)
    dummy = ImageDraw.Draw(Image.new('L', (1, 1)))
    line_boxes = [dummy.textbbox((0, 0), l, font=font) for l in text_lines]
    pad = font_size // 4
    img_w = max(b[2] - b[0] for b in line_boxes) + pad * 2
    img_h = sum(b[3] - b[1] for b in line_boxes) + pad * (len(text_lines) + 1)
    img = Image.new('L', (img_w, img_h), 0)
    draw = ImageDraw.Draw(img)
    y = pad
    for line, box in zip(text_lines, line_boxes):
        draw.text((pad, y), line, font=font, fill=255)
        y += (box[3] - box[1]) + pad
    img = img.transpose(Image.FLIP_LEFT_RIGHT)  # 裏面から読めるようミラー
    img_arr = np.array(img) > 128
    img_h2, img_w2 = img_arr.shape
    r_coords, c_coords = np.where(valid)
    row_c = int(np.median(r_coords))
    col_c = int(np.median(c_coords))
    r0 = row_c - img_h2 // 2
    c0 = col_c - img_w2 // 2
    mask = np.zeros((rows, cols), dtype=bool)
    r_s = max(0, r0); r_e = min(rows, r0 + img_h2)
    c_s = max(0, c0); c_e = min(cols, c0 + img_w2)
    mask[r_s:r_e, c_s:c_e] = img_arr[r_s-r0:r_e-r0, c_s-c0:c_e-c0]
    mask &= valid
    return mask

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
    min_valid_z = float(valid_z.min()) if len(valid_z) else 0.0
    # 海抜0m を基準にすることで、低地でも BASE_THICK の厚さを確保
    base_z = min(min_valid_z, 0.0) - BASE_THICK

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
def build_bottom(bbox, values, base_z, dec, text_mask=None):
    rows, cols = values.shape
    wx, wy, _ = world_grid(bbox, values)
    bz_bg  = np.float32(base_z)
    bz_txt = np.float32(base_z + ENGRAVE_DEPTH)

    R, C = np.meshgrid(np.arange(0, rows-dec, dec), np.arange(0, cols-dec, dec), indexing='ij')
    R2 = np.minimum(R + dec, rows-1)
    C2 = np.minimum(C + dec, cols-1)

    v00 = values[R,C]; v10 = values[R2,C]; v01 = values[R,C2]; v11 = values[R2,C2]
    m = ~(np.isnan(v00) & np.isnan(v10) & np.isnan(v01) & np.isnan(v11))
    R=R[m]; C=C[m]; R2=R2[m]; C2=C2[m]

    if text_mask is not None:
        bz_cell = np.where(text_mask[R, C], bz_txt, bz_bg).astype(np.float32)
    else:
        bz_cell = np.full(len(R), bz_bg, dtype=np.float32)

    def xyz_bot(r, c): return np.stack([wx[r,c], wy[r,c], bz_cell], axis=1).astype(np.float32)
    A=xyz_bot(R,C); B=xyz_bot(R2,C); C_=xyz_bot(R,C2); D=xyz_bot(R2,C2)

    t1 = make_tris(A, B, C_)
    t2 = make_tris(B, D, C_)
    tris = np.concatenate([t1, t2])
    tris['n'] = (0.0, 0.0, -1.0)
    return tris

def build_text_walls(bbox, values, base_z, dec, text_mask):
    """テキスト彫刻領域と通常底面の境界に垂直壁を生成する。"""
    if text_mask is None or not text_mask.any():
        return np.zeros(0, dtype=STL_TRI)
    rows, cols = values.shape
    wx, wy, _ = world_grid(bbox, values)
    bz_bg  = np.float32(base_z)
    bz_txt = np.float32(base_z + ENGRAVE_DEPTH)

    R, C = np.meshgrid(np.arange(0, rows, dec), np.arange(0, cols, dec), indexing='ij')
    R2 = np.minimum(R + dec, rows-1)
    C2 = np.minimum(C + dec, cols-1)
    valid    = ~np.isnan(values[R, C])
    is_text  = text_mask[R, C]

    def nbr_non_text(dr, dc):
        nr = R + dr; nc = C + dc
        oob = (nr < 0) | (nr >= rows) | (nc < 0) | (nc >= cols)
        nr_s = np.clip(nr, 0, rows-1); nc_s = np.clip(nc, 0, cols-1)
        return valid & is_text & ~oob & ~text_mask[nr_s, nc_s] & ~np.isnan(values[nr_s, nc_s])

    bz_fn = lambda n: np.full(n, bz_txt, dtype=np.float32)
    parts = []
    m = nbr_non_text(-dec, 0)  # 上隣が非テキスト
    if m.any():
        r,c,c2 = R[m],C[m],C2[m]; ba = bz_fn(m.sum())
        parts.append(_wall_quads(wx[r,c2],wy[r,c2],ba, wx[r,c],wy[r,c],ba, bz_bg))
    m = nbr_non_text(dec, 0)   # 下隣が非テキスト
    if m.any():
        r2,c,c2 = R2[m],C[m],C2[m]; ba = bz_fn(m.sum())
        parts.append(_wall_quads(wx[r2,c],wy[r2,c],ba, wx[r2,c2],wy[r2,c2],ba, bz_bg))
    m = nbr_non_text(0, -dec)  # 左隣が非テキスト
    if m.any():
        r,r2,c = R[m],R2[m],C[m]; ba = bz_fn(m.sum())
        parts.append(_wall_quads(wx[r,c],wy[r,c],ba, wx[r2,c],wy[r2,c],ba, bz_bg))
    m = nbr_non_text(0, dec)   # 右隣が非テキスト
    if m.any():
        r,r2,c2 = R[m],R2[m],C2[m]; ba = bz_fn(m.sum())
        parts.append(_wall_quads(wx[r2,c2],wy[r2,c2],ba, wx[r,c2],wy[r,c2],ba, bz_bg))
    return np.concatenate(parts) if parts else np.zeros(0, dtype=STL_TRI)

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
    clipped  = apply_clearance(clipped, CLEARANCE_PX)
    valid_n  = int(np.sum(~np.isnan(clipped)))
    print(f'  有効セル: {valid_n:,}')

    print('  テキストマスク生成...')
    code_str, pref_name, capital = PREFECTURE_INFO.get(code, (code, code, ''))
    grid_pixel_lon = (grid_bbox['maxLon'] - grid_bbox['minLon']) / clipped.shape[1]
    grid_pixel_mm  = grid_pixel_lon * COS_CENTER * METERS_PER_DEGREE * XY_SCALE
    px_per_mm = 1.0 / grid_pixel_mm
    jp_font   = find_jp_font()
    text_mask = make_text_mask(clipped, [code_str, pref_name, capital], jp_font, px_per_mm)
    print(f'  テキストピクセル: {text_mask.sum():,}')

    print('  地形メッシュ生成...')
    terrain_tris, base_z = build_terrain(grid_bbox, clipped, dec)
    print(f'  地形 tri: {len(terrain_tris):,}')

    print('  壁メッシュ生成...')
    wall_tris = build_walls(grid_bbox, clipped, base_z, dec)
    print(f'  壁 tri: {len(wall_tris):,}')

    print('  底面メッシュ生成...')
    bot_tris = build_bottom(grid_bbox, clipped, base_z, dec, text_mask)
    print(f'  底面 tri: {len(bot_tris):,}')

    print('  テキスト壁生成...')
    txt_wall_tris = build_text_walls(grid_bbox, clipped, base_z, dec, text_mask)
    print(f'  テキスト壁 tri: {len(txt_wall_tris):,}')

    os.makedirs(out_dir, exist_ok=True)
    write_stl(out_path, [terrain_tris, wall_tris, bot_tris, txt_wall_tris])
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
