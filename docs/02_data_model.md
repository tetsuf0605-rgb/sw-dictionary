# 02 データ設計とネタバレ制御ルール

このドキュメントがプロジェクトの心臓部。**ここに書かれた判定規則以外でネタバレ制御をしてはいけない。**

## 1. 設計方針（なぜこうなっているか）

1. **作品単位で解放する**：視聴の最小単位を「作品（映画 1 本／1 シーズン）」にする。話数単位は管理が破綻するのでやらない。
2. **記述ごとに「明かされる作品」を持つ（OR 条件）**：同じ事実が複数の作品で明かされることがある
   （例：ベイダーの正体はエピソード 3 でも 5 でも分かる）。どれか 1 つでも視聴済みなら表示する。
   これにより公開順・時系列順どちらで見ている人にも正しく動く。
3. **正体の判明は項目を分けて `sameAs` でつなぐ**：「ダース・ベイダー」と「アナキン・スカイウォーカー」は
   エピソード 4 の時点で **両方の名前が別人として** 出てくる。1 つの項目に別名として入れると名前が並んだ瞬間にネタバレになるため、
   別項目にして「同一人物だと分かる作品」を持ったリンクで結ぶ。
4. **登場作品は記述から自動で導く**：項目に「この作品で明かされる記述」があれば、その作品に登場（または言及）しているとみなす。
   著者が `appearsIn` を手で全部書く必要はない（カメオ等は明示も可能）。
5. **パック方式**：作品ごとのフォルダにデータを置き、ビルド時に 1 つに結合する。新作対応 = パック追加。
6. **判定は 1 か所**：`src/lib/visibility.ts` の純粋関数だけが解放判定をする。UI・検索・年表はその結果を使うだけ。
7. **検証で守る**：人間の注意力に頼らず、`scripts/validate-data.mjs` がリンク切れや漏れの可能性を機械的に見つける。

## 2. ファイル構成

```
data/
├─ meta.json              # { "dataVersion": "0.1.0", "updatedAt": "2026-10-31" }
├─ works.json             # 作品マスタ（全作品。パック未作成の作品も含む）
├─ eras.json              # 年表の時代区分
├─ CHANGELOG.md           # データ更新履歴（アプリの設定画面に表示）
└─ packs/
   ├─ ep4/
   │   └─ entities.json   # Entity[]：新規項目と、既存項目への追記が混在してよい
   ├─ ep5/
   │   └─ entities.json
   └─ <work-id>/...
```

ビルド（`npm run data:build`）で `public/data/db.json` を生成し、アプリはそれだけを読む。
`db.json` は生成物なので git 管理しない（`.gitignore`）。

## 3. 作品（works.json）

```ts
type WorkId = string;   // 例: "ep4", "mando-s1", "tcw-s3"。英小文字・数字・ハイフンのみ

interface Work {
  id: WorkId;
  title: string;          // 日本語タイトル（Disney+ 日本の表記に合わせる。「スター・ウォーズ」の冠は省く）
  titleEn?: string;
  kind: "film" | "season" | "series" | "special";
                          // film=映画 / season=1シーズン / series=シーズン分けせず1単位で扱うシリーズ / special=特別編
  group: "film-skywalker" | "film-other" | "live-action" | "animation" | "kids" | "non-canon";
                          // 設定画面の大分類
  series?: string;        // シーズンをまとめる親 ID（例: "mandalorian"）。設定画面の中分類
  seriesTitle?: string;   // 親の表示名（例: "マンダロリアン"）
  seasonNo?: number;
  releaseDate: string;    // "YYYY-MM-DD"。未定なら "YYYY"。世界初公開日（米国）基準
  status?: "released" | "upcoming";   // 省略時 released
  timeline: { start: number; end?: number; approx?: boolean } | null;
                          // 作中年代。BBY は負、ABY は正、0 = ヤヴィンの戦いの年。非正史は null
  canon: boolean;         // false = 『ビジョンズ』など
  animated?: boolean;
  note?: string;          // 設定画面に出す補足（例: 「シーズン1の前に見る劇場版」）
}
```

### 作品の粒度ルール
- 映画は 1 本 = 1 作品。
- ドラマ・アニメは **1 シーズン = 1 作品**（`kind: "season"`、`series` で束ねる）。
- 全体で 1 単位として扱って差し支えないもの（単発ミニシリーズ、子ども向け、アンソロジー 1 巻）は `kind: "series"`。
- 公開順は `releaseDate` から build が計算する（手で通し番号を持たない）。

## 4. 項目（Entity）

```ts
type EntityId = string;  // 例: "luke-skywalker", "battle-of-yavin"。英小文字・数字・ハイフン。Wookieepedia 風のスラッグ

type EntityType =
  | "character"     // 人物（ドロイド含む）
  | "place"         // 惑星・都市・施設
  | "organization"  // 組織・勢力・国家
  | "species"       // 種族
  | "vehicle"       // 乗り物・艦船・兵器施設
  | "item"          // 道具・武器
  | "concept"       // 用語・概念・制度
  | "event";        // 出来事（年表に載る）

interface Entity {
  id: EntityId;
  type: EntityType;        // 定義パックでのみ必須
  names: Name[];           // 定義パックでのみ必須。names[0] が主名称
  appearsIn?: WorkId[];    // 明示的な登場作品（任意）。実際の登場作品集合は §7 の式で求める
  facts: Fact[];           // 追記パックでは facts だけでもよい
  sameAs?: SameAs[];       // 同一人物・同一物リンク
  date?: EventDate;        // type === "event" のとき必須。それ以外は禁止
  tags?: string[];         // 検索補助。タグ自体がネタバレにならないものだけ（例: "ドロイド"）
}

interface Name {
  text: string;            // 表示名。例: "オビ＝ワン・ケノービ"
  reading?: string;        // ひらがな読み。五十音ソートと検索に使う。主名称は必須
  en?: string;             // 英語名（検索用）
  revealedBy?: WorkId[];   // この別名が明かされる作品（OR）。names[0] には書かない（常に表示）
  kind?: "alias" | "title" | "nickname";   // 別名 / 称号 / 愛称。表示上の区別用
}

interface Fact {
  id?: string;             // 任意。後から差し替えたいときの手がかり（例: "ep5-father"）
  text: string;            // 本文。1〜2 文。[[id]] / [[id|ラベル]] でリンク（§8）
  revealedBy: WorkId[];    // この記述が明かされる作品（OR）。必須、1 つ以上
  kind?: "summary" | "detail" | "trivia";   // summary は詳細画面の冒頭に太字で出す（項目に 1 つまで）
  order?: number;          // 表示順。省略時はパックの公開順 → ファイル内の順
  needsCheck?: boolean;    // 下書き段階で事実確認が必要な記述。アプリは無視、validate が件数を警告
}

interface SameAs {
  id: EntityId;            // 相手の項目
  revealedBy: WorkId[];    // 同一だと分かる作品（OR）
  note?: string;           // 表示用の短い補足。例: "正体"
}

interface EventDate {
  year: number;            // BBY は負、ABY は正。0 = ヤヴィンの戦いの年
  yearEnd?: number;        // 期間がある出来事
  precision: "exact" | "approx" | "unknown";   // unknown は order だけで並べる
  order?: number;          // 同じ年の中での並び順
}
```

### 項目に何を含めるか・含めないか
- **含める**：名前のある人物、名前のある惑星・都市・施設、組織・勢力、種族、固有名のある艦船・乗り物・兵器、
  作品理解に必要な用語（フォース、ハイパースペース、ライトセーバー…）、年表に載せたい出来事。
- **含めない**：画像、俳優・声優などの現実世界の情報（必要なら将来 `realWorld` フィールドを追加して分離する）、
  未公開作品の予告由来の情報。

## 5. 名前と別名の扱い

- `names[0]` = **主名称**。項目が解放されていれば常に表示される。`revealedBy` は書かない。
- `names[1..]` = **別名**。`revealedBy` のどれかが視聴済みのときだけ表示・検索対象になる。
- 同じ作品の中で明かされる別名は、同じ項目に入れてよい（例：「ベン・ケノービ」= オビ＝ワン、エピソード 4 内で判明）。
- **作品をまたいで判明する正体は別名にしない。** 別項目＋`sameAs` にする（§6）。
- 表示名の決め方：主名称を見出しに、解放済みの別名を「別名：…」として併記する。

## 6. 同一人物リンク（sameAs）— ベイダー問題

エピソード 4 だけ見た人は、「ダース・ベイダー（帝国の黒い実力者）」と「アナキン・スカイウォーカー（ルークの亡き父）」を
**別人として** 知っている。両方の名前が出てよいが、同一だと分かってはいけない。

```
darth-vader      : 主名称「ダース・ベイダー」。記述は ep4 で明かされたものだけ
anakin-skywalker : 主名称「アナキン・スカイウォーカー」。記述「ルークの父、優れたパイロット」[ep4]
sameAs           : darth-vader ⇄ anakin-skywalker, revealedBy: ["ep3", "ep5"]（該当パックができた時点で追記）
```

- `sameAs` が解放されると、両方の詳細画面の見出し直下に「＝ アナキン・スカイウォーカー（正体）」のように相手へのリンクを出す。
- 検索はそれぞれの項目名でヒットする（統合はしない）。
- 記述の統合表示（両項目の記述を 1 本の時系列で読む）は COULD。初版は相互リンクだけでよい。
- build は `sameAs` を **自動で対称化** する（片側に書けばよい。両側に書いた場合は `revealedBy` の和集合）。

## 7. 解放判定の規則（これ以外の判定を作らない）

```
watched            : その端末で視聴済みにした WorkId の集合
appearsIn(E)       : E.appearsIn
                   ∪ E.names[*].revealedBy
                   ∪ E.facts[*].revealedBy
                   ∪ E.sameAs[*].revealedBy          （build 時に計算して db.json に書き出す）

isUnlocked(E)      : appearsIn(E) ∩ watched ≠ ∅
visibleFacts(E)    : E.facts  で revealedBy ∩ watched ≠ ∅ のもの（order → パック公開順 → ファイル順）
visibleNames(E)    : names[0] ＋ names[1..] のうち revealedBy ∩ watched ≠ ∅ のもの
visibleSameAs(E)   : E.sameAs のうち revealedBy ∩ watched ≠ ∅ かつ isUnlocked(相手) のもの
shownWorks(E)      : appearsIn(E) ∩ watched  を公開順に並べたもの（「登場作品」欄。未視聴作品は絶対に出さない）
visibleEras        : eras のうち revealedBy ∩ watched ≠ ∅
timeline           : type=event かつ isUnlocked の項目を date で並べたもの
searchIndex        : isUnlocked な項目の visibleNames（text / reading / en）だけから作る
relatedEntities(E) : visibleFacts(E) 内のリンク先で isUnlocked なもの
backlinks(E)       : isUnlocked な他項目の visibleFacts に E へのリンクがあるもの
「すべて表示」設定  : watched = 全 WorkId として同じ関数を通す
```

実装は `src/lib/visibility.ts` に純粋関数として置き、`src/lib/visibility.test.ts` で
`docs/01_requirements.md` §8 のシナリオを全部テストする。

## 8. 本文リンク記法

記述の `text` の中で項目を参照する。

| 記法 | 表示 |
|---|---|
| `[[luke-skywalker]]` | リンク先が解放済み → リンク先の **現在の表示名**（主名称）でリンク。未解放 → 「？？？」（validate で防ぐ） |
| `[[luke-skywalker\|ルーク]]` | 解放済み → 「ルーク」でリンク。未解放 → 「ルーク」を文字として表示（リンクなし） |
| `[[battle-of-yavin]]` | 出来事も同じ。タップで項目詳細（年表位置へのジャンプは COULD） |

- リンク先 ID は項目のみ（作品や時代区分へのリンクは作らない。作品名を本文に書きたいときは普通の文字で書く）。
- レンダラーは `[[...]]` を正規表現 `\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]` でパースし、
  それ以外の Markdown 記法は解釈しない（太字などは使わない）。
- 「ラベルなしリンクの先が未解放」は **データの不備** であり、§10 の検証で見つける。

## 9. パックの結合規則（scripts/build-db.mjs）

1. `data/packs/*/entities.json` を、対応する作品の `releaseDate` 順に読み込む。
2. 同じ `id` が複数パックに出てきたら **結合** する：
   - `type` と `names` を持つパックを **定義パック** と呼ぶ。定義パックは **ちょうど 1 つ** でなければならない。
   - `facts`、`appearsIn`、`sameAs`、`names`（別名の追加のみ）、`tags` は連結（重複除去）。
   - `date` は定義パックのもの。追記パックに `date` があれば一致していること。
3. `appearsIn` を §7 の式で計算して書き出す。
4. `sameAs` を対称化する。
5. 各作品について「パックが存在するか」（`hasPack`）を計算して書き出す（設定画面の「データ準備中」表示に使う）。
6. `meta.json` の `dataVersion`、作品一覧（公開順の通し番号つき）、時代区分、項目一覧を 1 つの `db.json` にまとめる。

## 10. 検証規則（scripts/validate-data.mjs）

**エラー（終了コード 1、ビルド失敗）**

| コード | 内容 | 直し方 |
|---|---|---|
| E01 | 項目 ID の重複定義（定義パックが 2 つ以上）／定義パックが 1 つもない | 定義は 1 か所に。追記側から `type`/`names` を消す |
| E02 | ID の文字種違反（英小文字・数字・ハイフン以外） | ID を直す |
| E03 | 存在しない WorkId（revealedBy / appearsIn / eras） | works.json に追加するか ID を直す |
| E04 | 存在しない EntityId へのリンク／sameAs | 項目を作るか、リンクを外す |
| E05 | `fact.revealedBy` が空／未指定 | 明かされる作品を書く |
| E06 | `type: "event"` に `date` がない／event 以外に `date` がある | 直す |
| E07 | `names[0]` に `revealedBy` がある／`names[0].reading` がない | 主名称は常時表示。読みを書く |
| E08 | **リンク安全性違反**：ラベルなしリンク `[[X]]` を含む記述 F について、`F.revealedBy` のある作品 w が `appearsIn(X)` に含まれず、かつ w の **パックが存在する** | X に w で明かされる記述を足すか、`appearsIn` に w を加えるか、ラベル付きリンクにする |
| E09 | 同一パック内での fact.text の完全重複 | 片方を消す |
| E10 | JSON 構文エラー、スキーマ違反（未知のフィールド、型違い） | 直す |

**警告（終了コード 0、ただし一覧表示）**

| コード | 内容 |
|---|---|
| W01 | リンク安全性：E08 と同条件だが、w の **パックがまだ存在しない**（将来そのパックを作るとき対処する） |
| W02 | 記述が 0 件の項目 |
| W03 | 別名に `reading` がない |
| W04 | `needsCheck: true` の記述の件数（パック別） |
| W05 | `sameAs` の相手にも `sameAs` があり `revealedBy` が食い違う（和集合にして出力した旨） |
| W06 | works.json にあるがパックのない作品（情報として一覧） |

`npm run data:preview -- --watched ep4 --entity darth-vader` で、指定した視聴状況でその項目がどう見えるかを
テキスト出力する（著者の目視確認用）。`--entity` を省くと解放される項目名の一覧を出す。

## 11. ID 命名規則

- 英小文字・数字・ハイフン。英語名のスラッグ（例：`luke-skywalker`, `millennium-falcon`, `battle-of-hoth`）。
- 同名の別物は接尾辞で区別（例：`death-star`, `death-star-2`）。
- 出来事は `battle-of-…`, `fall-of-…`, `founding-of-…` のように動詞句ではなく名詞句で。
- 一度公開した ID は変えない（閲覧履歴・お気に入りが壊れる）。どうしても変える場合は `redirects` を db に持つ（COULD）。

## 12. 年代の表記

- 内部値：`year` は整数。負 = BBY（ヤヴィンの戦いより前）、正 = ABY（後）、0 = ヤヴィンの戦いの年。
- 表示：`32 BBY（ヤヴィンの戦いの32年前）`、`0 BBY/ABY（ヤヴィンの戦いの年）`、`9 ABY（ヤヴィンの戦いの9年後）`。
  `approx` なら先頭に「約」、`unknown` なら年を出さず前後関係だけで並べる。
- 時代区分（eras.json）：

```ts
interface Era {
  id: string;              // "era-empire" など
  name: string;            // "帝国の時代"
  start: number;           // 開始年（BBY 負）
  end: number;             // 終了年
  approx?: boolean;
  revealedBy: WorkId[];    // この区分名を出してよい作品（OR）
  description?: string;    // 1 文。[[id]] リンク可。ネタバレ注意
}
```

## 13. 具体例（抜粋。完全版は data/packs/ep4, ep5）

```jsonc
// data/packs/ep4/entities.json（定義パック）
{
  "id": "obi-wan-kenobi",
  "type": "character",
  "names": [
    { "text": "オビ＝ワン・ケノービ", "reading": "おびわん・けのーび", "en": "Obi-Wan Kenobi" },
    { "text": "ベン・ケノービ", "reading": "べん・けのーび", "en": "Ben Kenobi", "revealedBy": ["ep4"], "kind": "alias" }
  ],
  "facts": [
    { "kind": "summary", "text": "[[tatooine]]の荒野で隠者として暮らしていた老ジェダイ。", "revealedBy": ["ep4"] }
  ]
}

// data/packs/ep5/entities.json（追記パック。type / names は書かない）
{
  "id": "darth-vader",
  "facts": [
    { "id": "ep5-father", "text": "[[luke-skywalker]]の実の父である。", "revealedBy": ["ep5"] }
  ],
  "sameAs": [ { "id": "anakin-skywalker", "revealedBy": ["ep5"], "note": "正体" } ]
}
```

エピソード 3 のパックを作るときに、`ep5-father` の `revealedBy` に `"ep3"` を追加し、
`sameAs.revealedBy` にも `"ep3"` を加える（手順は 05 の「既存記述の見直し」参照）。

## 14. 端末内に保存するもの（localStorage のキー）

| キー | 内容 |
|---|---|
| `sw.watched.v1` | `WorkId[]` |
| `sw.prefs.v1` | `{ fontSize: "s"\|"m"\|"l", showAll: boolean, ... }` |
| `sw.history.v1` | 閲覧履歴 `EntityId[]`（最大 50） |
| `sw.favorites.v1` | `EntityId[]`（COULD） |
| `sw.unlockSnapshot.v1` | 前回確認時に解放されていた `{ entities: EntityId[], facts: string[] }`（新着計算用。fact は `entityId#index` か `fact.id`） |
| `sw.notes.v1` | `{ [EntityId]: string }`（COULD） |

スキーマを変えるときはキー末尾の `v1` を上げ、旧キーからの移行コードを書く。
