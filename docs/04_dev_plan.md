# 04 開発手順とプロンプト集

Claude Code に貼るプロンプトを、フェーズ順に用意してある。
**1 フェーズ = 1〜2 セッション** を目安に、完了条件を満たしてからコミットして次へ進む。
途中で止まっても `docs/PROGRESS.md` を見れば再開できる。

進め方のコツ：
- 各フェーズの最初は **Plan モード** で計画だけ出させ、納得してから実装させる。
- 「予測 → 実行 → 確認」。Claude Code が「確認してください」と言ったら、必ず実際に動かして見る。
- 完了条件を自分の目で確かめる。テストが通っていても実機で触る。
- 分からない用語が出たら、その場で「○○とは何か、2 行で」と聞く。

---

## Phase 0 — 環境構築と「空の PWA」を公開する

**目的**：何も機能がなくても、スマホのホーム画面から起動できる状態を最初に作る。以後は常に公開しながら育てる。

**事前準備（あなた）**
- Node.js LTS が入っているか：PowerShell で `node -v`。なければ `winget install OpenJS.NodeJS.LTS` を実行して PowerShell を開き直す。
- GitHub に空のリポジトリ `sw-dictionary` を作る（README なし）。

**貼るプロンプト**
```
Phase 0 を始めます。CLAUDE.md と docs/04_dev_plan.md の Phase 0 を読み、まず計画を 10 行以内で示してください。
やること：
1. Vite + React + TypeScript のプロジェクトをこのフォルダに作る（既存の CLAUDE.md, docs/, data/, README.md は残す）
2. vite-plugin-pwa を入れ、docs/03_ui_design.md §5 の manifest 設定と仮アイコン（単純図形を生成）を用意する
3. react-router を HashRouter で入れ、ホーム / 辞典 / 年表 / 設定 の 4 タブと空の画面を作る（デザインは最低限、トークンだけ docs/03 §4 のものを入れる）
4. GitHub Pages 用に vite.config の base を "/sw-dictionary/" にし、GitHub Actions で main に push したら自動デプロイされる workflow を作る
5. package.json に CLAUDE.md 記載のコマンド名を全部登録する（data:* は今は空でよいが名前は確保）
6. .gitignore に node_modules, dist, public/data/db.json を入れる
私は初心者なので、各ステップで何をしているか一言ずつ説明してください。コマンドは PowerShell 用に 1 行ずつ。
git の操作は私がやるので、コミットのタイミングとメッセージ例を教えてください。
```

**完了条件**
- `npm run dev` でローカルに 4 タブの空アプリが出る
- push 後、`https://tetsuf0605-rgb.github.io/sw-dictionary/` が開く（リポジトリ名を変えた場合はその名前）
- GitHub の Settings → Pages で Source が「GitHub Actions」になっている

**スマホで確認**
- iPhone Safari：共有 → ホーム画面に追加 → 起動したらブラウザの枠がない
- Android Chrome：メニュー → ホーム画面に追加（またはインストール）
- 機内モードにしてもう一度起動できる

---

## Phase 1 — データ基盤（型・検証・結合・プレビュー）

**目的**：アプリを作る前に、データの正しさを機械的に守る仕組みを先に作る。

**貼るプロンプト**
```
Phase 1 を始めます。docs/02_data_model.md を熟読してから計画を示してください。
やること：
1. src/types.ts に 02 §3〜§4, §12 の型を定義する
2. scripts/build-db.mjs：02 §9 の規則で data/ を結合し public/data/db.json を生成する（appearsIn の計算、sameAs の対称化、hasPack、公開順の通し番号）
3. scripts/validate-data.mjs：02 §10 のエラー E01〜E10 と警告 W01〜W06 を実装する。出力は「コード / パック / 項目ID / 説明 / 直し方」の形で日本語
4. scripts/preview.mjs：02 §10 末尾の data:preview を実装する
5. package.json の data:validate / data:build / data:preview を実装に結びつけ、predev と prebuild で data:build が自動で走るようにする（validate でエラーなら止まる）
6. サンプルデータ（data/packs/ep4, ep5）で validate がエラー 0 で通ることを確認する。警告が出たら内容を私に説明する
7. 確認のため、わざと壊したデータ（存在しない ID へのリンク、revealedBy 空、ラベルなしリンクの安全性違反）で E04 / E05 / E08 が出ることを見せる。見せ終わったら元に戻す
JSON スキーマ検証には zod を使ってよいです（理由と代替案を一言添えてください）。
```

**完了条件**
- `npm run data:validate` がサンプルデータでエラー 0
- `npm run data:build` で `public/data/db.json` ができ、`darth-vader` の `appearsIn` が `["ep4","ep5"]` になっている
- `npm run data:preview -- --watched ep4 --entity darth-vader` に「ルークの父」が **出ない**、`--watched ep4,ep5` なら出る
- わざと壊すとエラーで止まる

---

## Phase 2 — 解放判定ロジックとテスト

**目的**：アプリの価値を決める判定関数を、UI より先に、テストつきで固める。

**貼るプロンプト**
```
Phase 2 を始めます。docs/02_data_model.md §7 と docs/01_requirements.md §8 を読んでから計画を示してください。
やること：
1. src/lib/visibility.ts に §7 の関数を純粋関数として実装する（isUnlocked, visibleFacts, visibleNames, visibleSameAs, shownWorks, visibleEras, buildTimeline, buildSearchIndex, relatedEntities, backlinks, resolveWatched（showAll 対応））
2. src/lib/links.ts に 02 §8 のリンク記法パーサーを実装する（[[id]] と [[id|ラベル]]、未解放時の扱い）
3. src/lib/search.ts に 03 §3「検索結果」の正規化と検索を実装する
4. Vitest で docs/01 §8 の S1〜S7 を全部テストにする（db.json ではなくサンプルパックを直接読み込んで build 関数を通す）
5. テストは npm test で実行。すべて緑になるまで直す
UI はまだ作りません。
```

**完了条件**
- `npm test` が緑。S1〜S7 に対応するテスト名が読める形である（例：`S2: ep4 のみでは父の記述が出ない`）
- `visibility.ts` 以外に watched を参照して表示可否を決めているコードがない

---

## Phase 3 — 設定画面とホーム

**目的**：視聴済み作品を端末に保存し、ホームにサマリーを出す。ここで初めて「使える」感触が出る。

**貼るプロンプト**
```
Phase 3 を始めます。docs/03_ui_design.md §3 の「設定」「ホーム」と §4 を読んでから計画を示してください。
やること：
1. db.json を起動時に読み込むストア（React Context でよい）と、localStorage の sw.watched.v1 / sw.prefs.v1 の読み書き（02 §14）
2. 設定画面：大分類 → シリーズ → 作品のチェックリスト、シリーズの「全シーズン」、クイック操作 4 つ、「データ準備中」ラベル、文字サイズ、「すべて表示」トグル（ON でヘッダーに警告帯）、データバージョン表示
3. ホーム：視聴状況サマリー、未設定時の誘導カード、種類別の入口（解放済み件数つき）、年表への入口
4. 下部タブとヘッダー（戻るボタンの枠だけ先に）
5. デザイントークンを適用し、Noto Sans JP を self-host する
```

**完了条件**
- 設定でチェック → アプリを閉じて再起動しても保持されている
- ホームの件数が設定に応じて変わる（ep4 だけなら人物 7 件、など）
- 「すべて表示」ON で警告帯が出る

**スマホで確認**：文字サイズ切替、タップしやすさ、下部タブがホームバーと重ならない

---

## Phase 4 — 辞典（一覧・検索・詳細・リンク・戻る）

**目的**：中核機能。リンクで飛んで戻れる体験を完成させる。

**貼るプロンプト**
```
Phase 4 を始めます。docs/03_ui_design.md §2〜§3 の「一覧」「検索結果」「項目詳細」を読んでから計画を示してください。
やること：
1. 一覧画面（種類タブ、五十音インデックス、空状態）
2. 検索画面（即時絞り込み、別名ヒットの表示）
3. 項目詳細（03 §3 の 1〜8 の順。出典ラベルは視聴済み作品の略称のみ）
4. 本文リンクのレンダリング（links.ts を使う。未解放はリンクにしない）
5. 戻るボタン、スクロール位置復元、足あとチップ、未解放ディープリンクの文言
6. 閲覧履歴の保存（sw.history.v1）
docs/01 §8 の S8 と S9 を手動で確認する手順も教えてください。
```

**完了条件**
- S7〜S9 が実機で確認できる
- 未解放リンクが文字として表示され、タップしても何も起きない
- 10 回連続でリンクを飛んでも 10 回戻れる

---

## Phase 5 — 年表

**貼るプロンプト**
```
Phase 5 を始めます。docs/03_ui_design.md §3「年表」と docs/02 §12 を読んでから計画を示してください。
やること：時代区分のスティッキーヘッダー、年の目盛り、出来事カード、視聴済み作品の帯、作品チップでの絞り込み、作品一覧画面（公開順／時系列順）。
未視聴作品の名前や帯が一切出ないことをテストでも保証してください（S9 の年表版）。
```

**完了条件**：ep4 だけで「ヤヴィンの戦い」と帯 EP4 のみ、ep5 追加で「ホスの戦い」と帯 EP5 が増える

---

## Phase 6 — 新着・お気に入り・書き出し

**貼るプロンプト**
```
Phase 6 を始めます。docs/01 の F-06, F-09, F-10 と docs/03 §3「新着」を読んでから計画を示してください。
やること：sw.unlockSnapshot.v1 による新着計算、新着画面、NEW バッジ、設定変更時のトースト、お気に入り、設定の書き出し／取り込み（JSON テキスト）。
S5 をテストにしてください。
```

**完了条件**：S5 が実機で再現できる。書き出した JSON を別端末に貼り付けると同じ視聴状況になる

---

## Phase 7 — 仕上げ（デザイン・アイコン・オフライン・更新）

**貼るプロンプト**
```
Phase 7 を始めます。docs/03 §4〜§5 を読んでから計画を示してください。
やること：
1. 全画面のデザインをトークンに沿って整える（星空背景、カード、見出しのアクセント、種類バッジ）
2. 私が用意したアイコン（public/icons/ に置きます）を manifest と index.html に組み込む
3. オフライン動作の確認（db.json を含めてキャッシュ。更新があれば「更新があります」→ 再読み込み）
4. about 画面（非公式・個人利用の明記、出典・ライセンス、CHANGELOG 表示）
5. Lighthouse の PWA / アクセシビリティ項目を確認して直す
```

**完了条件**：機内モードで全機能、アイコン差し替え反映、Lighthouse の PWA 項目が緑

---

## Phase 8 — コンテンツ投入（作品ごと、継続）

**目的**：ここからが本番。自分が視聴済みの作品から順にパックを作る。手順は `docs/05_content_guide.md`。

**貼るプロンプト（作品 1 つぶん）**
```
docs/05_content_guide.md の手順で、作品 <work-id>（<タイトル>）のパックを作ります。
1. まず、この作品に登場・言及する項目の候補を種類別に一覧にして見せてください（まだファイルは作らない）
2. 私が残す候補を選んだら、data/packs/<work-id>/entities.json を書いてください。既存項目への追記は id だけで。
   事実に自信がない記述には needsCheck: true を付けてください
3. 既存のパックの記述で、この作品でも明かされるものがないか grep で探し、revealedBy に <work-id> を足す候補を一覧にしてください（私が承認してから変更）
4. npm run data:validate を通し、npm run data:preview -- --watched <work-id> で見え方を見せてください
5. data/CHANGELOG.md と data/meta.json の dataVersion を更新してください
```

**完了条件（パックごと）**：validate エラー 0、`needsCheck` を自分で確認して外した、CHANGELOG に 1 行

---

## 運用 — 新作が出たら

1. `data/works.json` に作品を追加（または `status` を `released` に）
2. Phase 8 のプロンプトでパックを作る
3. `dataVersion` を上げ、CHANGELOG に書く
4. push → 数分後にスマホで「更新があります」→ 再読み込み → 設定で視聴済みにチェック → 新着を見る

---

## docs/PROGRESS.md の書式（Claude Code が更新する）

```
# 進捗

## 現在のフェーズ
Phase 3（設定画面とホーム）— 設定画面まで完了、ホームの件数表示が未実装

## 完了したフェーズ
- Phase 0（2026-11-02）公開 URL: https://…
- Phase 1（2026-11-03）
- Phase 2（2026-11-05）テスト 14 件

## 次にやること
- [ ] ホームの種類別件数
- [ ] 「すべて表示」の警告帯

## メモ・決めたこと
- フォントは self-host にした（外部読み込みなし）
- リポジトリ名は sw-dictionary のまま
```
