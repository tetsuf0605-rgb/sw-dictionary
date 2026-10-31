# 進捗

## 現在のフェーズ
Phase 1 完了。次は Phase 2（解放判定ロジックとテスト）

## 完了したフェーズ
- Phase 0（2026-10-31）公開 URL: https://tetsuf0605-rgb.github.io/sw-dictionary/
- Phase 1（2026-10-31）型・検証・結合・プレビュー。サンプルデータで validate エラー 0

## 次にやること
- [ ] スマホで実機確認（ホーム画面に追加 → 枠なしで起動 → 機内モードでも起動）
- [ ] Phase 2（解放判定ロジックとテスト）へ
- [ ] Phase 2 で `src/lib/visibility.ts` を作ったら、`scripts/preview.mjs` の判定を
      そちらの import に置き換える（判定を 2 か所に持たないため。Node 24 は .ts を直接読める）

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
- 2026-10-31 公開完了。Pages の Source は `gh api` で build_type=workflow に設定済み
  （初回 push 時は Pages 未有効で configure-pages が失敗した。リポジトリ作成直後は先に有効化が必要）
  - 公開後の確認：index / manifest / sw.js / 各アイコンが 200、Service Worker が
    scope `…/sw-dictionary/` で activated、コンソールエラーなし
- 2026-10-31 Phase 1 実装
  - **zod は入れなかった**。エラー出力を「コード / パック / 項目ID / 説明 / 直し方」の独自形式にする以上
    zod のメッセージは捨てることになり、変換コードが手書き検証と大差ないため。
    将来に備え、スキーマ（許可キーと型）は `scripts/lib/data-core.mjs` の 1 か所に表として持たせてある
  - 読み込み・結合・計算は `scripts/lib/data-core.mjs` に集約し、validate / build / preview が共有する
  - 仕様になかったので決めたこと（docs に未記載の判断）:
    - **定義パックの判定は `type` を持つかどうか**。追記パックも `names` に別名を足せるため（02 §9）、
      `names` の有無では判定していない
    - **別名（names[1..] と追記パックの names）に `revealedBy` がなければ E07 でエラー**にした。
      常時表示になってネタバレになるため。02 §10 の表には明記がないが §5 の趣旨から拡張した
    - `fact.order` を省略したときは **0 として扱う**（順序は order → パック公開順 → ファイル順）
    - `releaseDate` が "YYYY" だけの作品は、公開順ではその年の最後に置く
    - 同じ記述が複数パックに書かれていたら、`id` があれば `id`、なければ本文で突き合わせて
      1 つにまとめ、`revealedBy` を和集合にする
  - 確認した受け入れシナリオ: S1（空＝0 件）、S2（ep4 のみ＝人物 7 件・時代区分 2 件・ヨーダなし）、
    S4（ep5 のみ＝オルデランとデス・スターが出ない）
  - わざと壊したコピーで E04 / E05 / E08 / W01 が出ること、終了コード 1 で止まることを確認済み
