## AI エージェント向け再現プロンプト

このプロジェクトと同等のサイトをゼロから構築するために AI エージェントへ渡すプロンプトです。

---

### プロンプト

```
## 目標

日本の全都道府県の地形 STL ファイルを 3D プリント用に配布する静的 Web サイトを構築してください。
国土地理院の数値標高モデル（DEM）と国土交通省の行政区域データから Python で STL を自動生成し、
Next.js の静的エクスポートで GitHub Pages にデプロイします。

---

## 技術スタック

- **フロントエンド**: Next.js 15（App Router、`output: 'export'`）、TypeScript、Tailwind CSS
- **3D プレビュー**: Three.js（STLLoader + OrbitControls）、dynamic import で SSR 無効化
- **ZIP 生成**: JSZip（クライアントサイド）
- **STL 生成スクリプト**: Python 3.9+（numpy、Pillow）
- **デプロイ**: GitHub Actions → GitHub Pages（`basePath: '/リポジトリ名'`）

---

## ディレクトリ構成

```
/
├── app/
│   ├── page.tsx            # メインページ（都道府県一覧・ダウンロード）
│   ├── layout.tsx
│   ├── globals.css
│   └── components/
│       └── StlViewer.tsx   # Three.js 3D プレビューコンポーネント
├── lib/
│   ├── types.ts            # PrefectureInfo, BBox 型定義
│   └── constants/          # 地方別の都道府県データ（code, name, capital, nameEn, color）
│       ├── hokkaido.ts
│       ├── tohoku.ts
│       ├── kanto.ts
│       ├── chubu.ts
│       ├── kinki.ts
│       ├── chugoku.ts
│       ├── shikoku.ts
│       └── kyushu.ts
├── scripts/
│   ├── fetch-boundaries.ts # 行政区域データの取得・GeoJSON 変換
│   └── gen_stl.py          # STL ファイル生成
├── public/
│   └── data/
│       ├── boundary/       # {code}.json（GeoJSON）
│       ├── dem/            # キャッシュ済み DEM タイル
│       └── stl/            # {code}.stl（生成済み）
└── .github/workflows/
    └── deploy.yml          # GitHub Actions（STL 生成 + Pages デプロイ）
```

---

## 都道府県データ

北海道は面積が大きいため 4 地方（道南 `01d`・道央 `01c`・道北 `01n`・道東 `01e`）に分割します。
コードは JIS X 0401 の 2 桁ゼロ埋め数字（例: 東京 = `13`、沖縄 = `47`）。

各都道府県は以下の情報を持ちます:

```typescript
interface PrefectureInfo {
  code: string;     // 例: '13'
  name: string;     // 例: '東京都'
  capital: string;  // 例: '東京'
  nameEn: string;   // 例: 'Tokyo'
  capitalEn: string;
  color: string;    // Tailwind/CSS カラー（地方ごとに色分け）
}
```

---

## STL 生成ロジック（`scripts/gen_stl.py`）

### 共通パラメータ

```python
PROJ_CENTER_LAT = 36.0       # 投影基準緯度
PROJ_CENTER_LON = 139.0      # 投影基準経度
XY_SCALE = 1.5 / 1660        # ≈ 1/1107（全地方統一縮尺）
Z_SCALE = 5.0                # 標高方向の誇張倍率
BASE_THICKNESS = 3.0         # ベース厚 mm
CLEARANCE_PX = 8             # 境界クリアランス（px、マンハッタン侵食）
ZOOM = 12                    # DEM タイルズームレベル（北海道のみ 11）
DECIMATION = 4               # ダウンサンプリング率（北海道のみ 16）
DEM_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
```

### 各都道府県の本土 bbox（`PUZZLE_BBOXES`）

島嶼・飛び地を除く矩形範囲を `minLon/maxLon/minLat/maxLat` で定義します。
この bbox は DEM タイルの取得範囲と、Union-Find による本土自動判定の両方に使用します。

### 処理フロー

1. **DEM タイル取得**: bbox に必要な全タイルを並列ダウンロードし、1 枚のグリッドに結合。
   タイルは `public/data/dem/{z}/{x}/{y}.bin` にキャッシュし、再実行時は再ダウンロードしない。

2. **行政境界マスク（PIL OR 合算）**: GeoJSON の境界ポリゴンを PIL の `ImageDraw.polygon(fill=255)`
   で個別に描画して OR 合算。even-odd では共有頂点でマスクが 0 になるバグが生じるため、必ずこの方式を使う。

3. **飛び地・島の除外（Union-Find）**: bbox の外周座標を共有するポリゴンを隣接とみなし、
   Union-Find で連結成分を構築。面積合計最大の成分を本土と判定し、それ以外を除外。
   北海道は `coord_decimals=4`（≈ 10m 精度）で丸める（5 だと隣接判定が切れるケースあり）。

4. **境界クリアランス**: マスクを `CLEARANCE_PX` ピクセル内側にマンハッタン侵食し、
   隣接ピース間の印刷クリアランスを確保する。

5. **座標変換**: 経緯度 → STL 座標（mm）の変換式:
   ```
   wx = (lon - 139.0) × cos(36°) × 111320 × XY_SCALE
   wy = (lat - 36.0) × 111320 × XY_SCALE
   wz = 標高(m) × Z_SCALE × XY_SCALE
   ```
   海抜 0m 未満は 0m に補完する。

6. **メッシュ生成（4 種結合）**:
   - **地形（上面）**: decimation×decimation px を 1 セルとして三角形 2 枚に分割
   - **壁（側面）**: 有効セルと無効セルの境界にクワッドを生成し底面まで垂直に伸ばす
   - **底面**: 地形と同形状を `base_z`（最低標高 − BASE_THICKNESS）の平面に配置（法線下向き）
   - **テキスト壁**: 彫刻テキスト領域と通常底面の境界に高さ 1.5mm の垂直壁を追加

7. **テキスト彫刻**: 底面中央に都道府県コード・名称・県庁所在地を刻印。底面から 1.5mm 凹んだ位置に
   テキスト面を置く。テキストは裏面から読めるよう左右ミラー反転。フォントサイズは有効エリアに
   収まる最大サイズを二分探索で決定する。

8. **STL 出力**: バイナリ STL 形式で `public/data/stl/{code}.stl` に書き出す。

---

## 行政区域データ取得（`scripts/fetch-boundaries.ts`）

国土交通省 N03-2024 行政区域データ（ZIP/GML 形式）を都道府県コードごとにダウンロードし、
`public/data/boundary/{code}.json`（GeoJSON FeatureCollection）として保存します。

```
取得 URL: https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2024/N03-20240101_{code}_GML.zip
```

北海道は 4 地方ごとに振興局名（`N03_002` フィールド）でポリゴンをフィルタして別ファイルに分割します。

---

## フロントエンド実装

### メインページ（`app/page.tsx`）

- 地方ごとにアコーディオンで都道府県一覧を表示
- 各都道府県のカードに「プレビュー」ボタン（クリックで STLViewer モーダルを表示）と「ダウンロード」ボタン
- ファイルサイズを `FILE_SIZES` レコードでハードコードして表示
- 「全部まとめてダウンロード（ZIP）」ボタン: JSZip で全 STL を非同期フェッチして zip 化

### StlViewer コンポーネント（`app/components/StlViewer.tsx`）

- Three.js の STLLoader で STL を読み込み、OrbitControls でインタラクティブに回転・ズーム
- 読み込み中はプログレスバーを表示
- `dynamic(() => import('./components/StlViewer'), { ssr: false })` で SSR を無効化

---

## next.config.mjs

```javascript
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/リポジトリ名' : '',
  images: { unoptimized: true },
};
```

---

## GitHub Actions（`.github/workflows/deploy.yml`）

1. STL 生成ジョブ: 都道府県コードを matrix に展開して並列実行（`python3 scripts/gen_stl.py {code}`）
2. 静的ビルドジョブ: `npm run build`（`output: 'export'` で `out/` に静的ファイルを出力）
3. Pages デプロイジョブ: `actions/deploy-pages` で `out/` を公開

STL の再生成は重いので、`public/data/stl/` をキャッシュするか、事前生成済みファイルをリポジトリに含めることを検討してください。

---

## データライセンス表記（必須）

サイトおよびダウンロード ZIP の README.txt に以下を明記してください:

- 地形データ: 国土地理院 基盤地図情報数値標高モデル（https://maps.gsi.go.jp/development/ichiran.html）
- 行政界データ: 国土交通省 国土数値情報 行政区域データ N03-2024（https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html）
- 本データは上記データを加工して作成しています。
```
