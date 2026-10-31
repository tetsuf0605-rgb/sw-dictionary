# 進捗

## 現在のフェーズ
Phase 5 完了。次は Phase 6（新着・お気に入り・書き出し）

## 完了したフェーズ
- Phase 0（2026-10-31）公開 URL: https://tetsuf0605-rgb.github.io/sw-dictionary/
  実機確認済み（ホーム画面に追加・枠なし起動・オフライン起動）
- Phase 1（2026-10-31）型・検証・結合・プレビュー。サンプルデータで validate エラー 0
- Phase 2（2026-10-31）解放判定・リンク・検索とテスト 49 件
- Phase 3（2026-10-31）設定画面・ホーム・端末内保存
- Phase 4（2026-10-31）辞典（一覧・検索・詳細・リンク・戻る・履歴）。テスト 55 件
- Phase 5（2026-10-31）年表と作品一覧。テスト 75 件

## 次にやること
- [ ] Phase 6（新着・お気に入り・書き出し）へ

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
- 2026-10-31 Phase 2 実装
  - `src/lib/visibility.ts` が **watched を見る唯一の場所**。links.ts / search.ts は watched を知らず、
    links.ts には「解放済みか答える関数」を外から渡す形にした（02 §6 の「判定は 1 か所」）
  - 出典ラベルの絞り込みも `visibleSources()` として visibility.ts に入れた
    （preview.mjs が自前で `revealedBy.filter(watched.has)` していたのを移した）
  - `scripts/preview.mjs` は visibility.ts / links.ts を直接 import する形に変更。
    Node 24 が .ts の型注釈を読み飛ばせるため、ビルドなしで共有できる。
    そのため `src/lib/` 内の値 import には拡張子 `.ts` を付けている（Node の解決規則に合わせるため）
  - TypeScript 設定を 3 つに分けた: app（アプリ）/ node（vite.config）/ **test（テスト。node の型を使う）**。
    アプリ側に Node の型が混ざらないようにするため。あわせて `tsconfig.app.json` の `strict` を有効化した
  - テストはサンプルパックを直接読んで build 関数を通す（`src/lib/testdb.ts`）。db.json には依存しない
  - 仕様になかったので決めたこと:
    - 年表で `precision: "unknown"` の出来事は年を持たないものとして**末尾**に置き、`order` だけで並べる
    - 一覧・関連項目の五十音順は `reading`（なければ表示名）を `localeCompare(..., 'ja')` で比較する
    - `resolveWatched` は works.json にない作品 ID を無視する（作品を消したときに壊れないように）
- 2026-10-31 Phase 3 実装（フォント以外）
  - `src/store/app.tsx`: db.json の読み込みと localStorage の同期。**判定はしない**（watched を作って渡すだけ）
  - `src/lib/storage.ts`: 02 §14 のキー。localStorage が使えない環境でも落ちないよう try/catch で包む
  - 設定画面: 大分類 → シリーズ → 作品。シリーズ行は一部だけ選ぶと中間状態（indeterminate）になる
  - 文字サイズは `html[data-font-size]` → CSS 変数 `--font-base` → 文字まわりを rem で表現。
    タップ領域（44px）とヘッダー・タブバーの高さは px のままにして、指に対する当たり判定を保つ
  - 仕様になかったので決めたこと:
    - シリーズ行のラベルは、全部が映画なら「全作品」、そうでなければ「全シーズン」
    - ホームの検索窓は置かなかった（Phase 4 で検索画面を作るまで押せない入口を出さないため）
    - 設定の「更新履歴を見る」「アプリの更新を確認」「閲覧履歴を消す」は Phase 4・7 で追加する
    - 設定変更後の「新着 N 件」トーストは Phase 6（新着の計算と同時）に回した
  - **フォントは self-host せず OS 標準の日本語ゴシックを使う**ことに決定（2026-10-31）。
    Noto Sans JP は全サブセットで約 5.8MB あり、オフライン用に precache すると
    配信量が約 0.9MB → 約 6.7MB になるため。docs/01 §6・docs/03 §4・CLAUDE.md を実態に合わせて更新した
  - 確認: ep4 をチェック → 再読み込みで保持 → ホームが人物 7 件、
    「すべて表示」ON で警告帯＋全 23 件、文字サイズ 小14/中16/大18px、最小タップ高 44px
- 2026-10-31 Phase 4 実装
  - 画面: 一覧（種類タブ・五十音インデックス・空状態）/ 検索 / 項目詳細 / 未解放ディープリンクの文言
  - `src/components/ScrollMemory.tsx` でスクロール位置を復元する。**つまずいた点を 2 つ記録**:
    1. `requestAnimationFrame` で位置を動かすとタブが非表示のあいだ発火しない。
       `useLayoutEffect` で同期的に動かす形に変えた
    2. 保存を別の `useEffect` に分けると、スクロール実行の**後**に保存が走って 0 が記録される。
       保存は同じ `useLayoutEffect` のクリーンアップに置く（次の画面の移動より先に走るため）
    3. `history.scrollRestoration = 'manual'` にしないと、ブラウザ自身の復元と競合する
  - 閲覧履歴（`sw.history.v1`、最大 50 件）を保存し、足あとチップとホームの「最近見た項目」に使う
  - ID 列から解放済み項目だけを取り出す `resolveUnlocked()` を visibility.ts に追加（履歴・お気に入り共用）
  - 仕様になかったので決めたこと:
    - 五十音インデックスは あ/か/さ/た/な/は/ま/や/ら/わ/他 の 11 行。
      濁点・半濁点・小書き文字は清音の行にまとめる（「が」→ か行、「っ」→ た行）
    - 検索語は URL の `?q=` に入れる（`replace` で履歴を汚さない）
    - NEW バッジは Phase 6（新着計算と同時）に回した
  - 確認: 10 回リンクを飛んで 10 回戻る往復が完全一致、スクロール位置の復元、
    ep4 の全 17 項目を開いて出典ラベル・登場作品・本文リンクに未視聴作品由来のものがゼロ（S9）、
    S7 の表記ゆれ 5 パターン、未解放ディープリンクで名前が出ないこと
- 2026-10-31 Phase 5 実装
  - 年表: 時代区分のスティッキーヘッダー、左に年の目盛りと視聴済み作品の帯、右に出来事カード、
    作品チップでの絞り込み。作品一覧（`#/works`）は公開順／作中時系列順を切り替えられる
  - visibility.ts に `watchedWorks()` / `timelineBands()` を追加し、`buildTimeline()` に
    作品での絞り込み引数を足した（絞り込みも watched にかかわる判断なので visibility.ts に置く）
  - 年代の表記を `labels.ts` の `formatYearShort` / `formatEventYear` / `formatWorkTimeline` に集約し、
    項目詳細と年表で共有した（それまで Entity.tsx に自前の実装があった）
  - 仕様になかったので決めたこと:
    - **時代区分の見出しは、その区分に出来事が 1 件以上あるときだけ出す**。
      解放済みでも中身が空の見出しだけが並ぶのは不自然なため。
      「どの時代区分が解放されているか」はテスト（visibleEras）で担保している
    - 年 0 のように 2 つの時代区分にまたがる年は、開始が遅いほうの区分に入れる
      （ヤヴィンの戦い＝0 年は「銀河内戦」側）
    - 作品の帯の略称は、その作品が最初に出てくる行にだけ付ける（毎行に出すとうるさいため）
    - 作中年代を持たない作品（『ビジョンズ』など）は、時系列順では末尾に置く
  - 確認: ep4 のみ →「ヤヴィンの戦い」と帯 EP4 だけ、ep5 追加 →「ホスの戦い」と帯 EP5 が増える、
    EP5 チップで絞ると「ホスの戦い」だけ、作品一覧の公開順／時系列順、
    年表・作品一覧の画面テキストに未視聴作品名・未解放項目名がゼロ（S9 の年表版）
