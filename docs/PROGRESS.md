# 進捗

## 現在のフェーズ
Phase 0（環境構築と「空の PWA」を公開する）— 実装完了。コミット・push・Pages 設定・実機確認が残り

## 完了したフェーズ
（なし。Phase 0 は push と実機確認で完了）

## 次にやること
- [ ] `git init` → 初回コミット → GitHub へ push
- [ ] GitHub の Settings → Pages で Source を「GitHub Actions」にする
- [ ] https://tetsuf0605-rgb.github.io/sw-dictionary/ が開くことを確認
- [ ] スマホでホーム画面に追加 →（枠なしで起動・機内モードでも起動）を確認
- [ ] Phase 1（データ基盤：型・検証・結合・プレビュー）へ

## 決め待ち
（なし）

## メモ・決めたこと
- 2026-10-31 指示キット作成。前提は README.md の表のとおり
- 2026-10-31 Phase 0 実装
  - プロジェクトは `C:\SW`（OneDrive の外）。リポジトリは https://github.com/tetsuf0605-rgb/sw-dictionary （public）
  - Vite 8 / React 19 / TypeScript 7 / react-router 7 / vite-plugin-pwa 2 / Vitest 5 / lucide-react
  - リポジトリ名は `sw-dictionary` のまま。`vite.config.ts` の `base` は `/sw-dictionary/`
  - manifest の `start_url` / `scope` は相対パス `./`。アプリ名は仮に「ホロクロン — スター・ウォーズ辞典」
  - 辞典タブの行き先は `#/list/character`（一覧の既定の種類）。タブの行き先には戻るボタンを出さない
  - アイコンは `assets/icon-source.png` から `npm run icons` で生成する。
    追加パッケージを避けるため Node 標準の zlib だけで PNG を読み書きしている（`scripts/make-icons.mjs`）。
    外周の白い余白は自動で `--bg` に塗りつぶし、maskable 版は 80% に縮めて中央配置
  - `data:validate` / `data:build` / `data:preview` は名前と終了コードだけ先に用意した空の実装（Phase 1 で中身を書く）
  - `npm test` は `--passWithNoTests` 付き（Phase 2 でテストが入るまで CI を止めないため）
  - `npm audit` は本番依存で 0 件。警告はすべて開発用依存（workbox-build 系）
- 2026-10-31 アイコンの権利方針を決定：いただいたシルエット画像をそのまま使う。
  これに合わせて `docs/05_content_guide.md` §4 と `CLAUDE.md` のコーディング規約を更新した
  （アプリ内コンテンツに画像を使わない方針は維持。アイコンのみ例外、個人・家族利用にとどめる条件つき）
