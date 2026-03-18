# 関東 3D 都県パズル

国土地理院の数値標高モデル（DEM）と国土交通省の行政区域データから生成した、関東 7 都県の 3D プリント用 STL ファイルを配布するサイトです。

🌐 **サイト**: https://champierre.github.io/pref-puzzle/

## 特徴

- 関東 7 都県（茨城・栃木・群馬・埼玉・千葉・東京・神奈川）の地形 STL
- ブラウザ上で 3D プレビュー（Three.js）
- 個別ダウンロード / ZIP 一括ダウンロード
- 各ピース裏面に県コード・都道府県名・県庁所在地を彫刻

## STL パラメータ

| パラメータ | 値 |
|------------|-----|
| XY スケール | 1/1107（神奈川幅 ≈ 75mm） |
| Z スケール | 5.0 |
| ベース厚 | 3mm |
| 境界クリアランス | 約 0.3mm/辺 |
| 解像度 | zoom=12 / decimation=4（約 120m メッシュ） |

## データ生成

### 前提条件

- Python 3.9+（numpy, Pillow）
- Node.js 20+

### 行政界データの取得

```bash
npm run data:fetch
```

`public/data/boundary/{code}.json` に GeoJSON として保存されます。

### STL の生成

```bash
# 全 7 都県
npm run data:stl

# 特定の都県のみ（例: 神奈川）
python3 scripts/gen_stl.py 14
```

生成された STL は `public/data/stl/{code}.stl` に保存されます。

## 開発

```bash
npm install
npm run dev   # http://localhost:3000
npm run build # 静的エクスポート → out/
```

## デプロイ

`main` ブランチへのプッシュで GitHub Actions が自動的に GitHub Pages へデプロイします。

初回は GitHub リポジトリの **Settings → Pages → Source** を **「GitHub Actions」** に変更してください。

## データライセンス

- 地形データ: [国土地理院 基盤地図情報数値標高モデル](https://maps.gsi.go.jp/development/ichiran.html)
- 行政界データ: [国土交通省 国土数値情報 行政区域データ N03-2024](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html)

本データは上記データを加工して作成しています。
