// このアプリについて（docs/03_ui_design.md §1、docs/05_content_guide.md §4）。
// 非公式・個人利用であることの明記、出典とライセンス、データの更新履歴。
import { useDb } from '../store/app'

/** CHANGELOG.md の最小限の描画。「## 見出し」と「- 箇条書き」だけを解釈する */
function Changelog({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: { heading: string; items: string[] }[] = []
  for (const line of lines) {
    if (line.startsWith('## ')) blocks.push({ heading: line.slice(3).trim(), items: [] })
    else if (line.startsWith('- ') && blocks.length > 0) blocks.at(-1)!.items.push(line.slice(2).trim())
  }
  if (blocks.length === 0) return <p className="page__note">更新履歴はまだありません。</p>
  return (
    <>
      {blocks.map((b) => (
        <section key={b.heading} className="changelog">
          <h4 className="changelog__head">{b.heading}</h4>
          <ul className="changelog__list">
            {b.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

export default function About() {
  const data = useDb()

  return (
    <>
      <h2 className="page__title">このアプリについて</h2>

      <div className="card">
        <p className="card__lead">非公式のファン制作・個人利用のアプリです</p>
        <p className="page__note">
          ルーカスフィルム、ディズニー、その他の権利者とは一切関係がありません。公式のものではありません。
          作成者と家族が調べものに使うために作られたものです。
        </p>
      </div>

      <h3 className="section__title">このアプリの特徴</h3>
      <p>
        設定で選んだ「視聴済み作品」の範囲で明かされた情報だけを表示します。
        まだ見ていない作品のネタバレは、項目名・記述・年表・検索結果のどこにも出ません。
      </p>

      <h3 className="section__title">文章と画像について</h3>
      <ul className="bullets">
        <li>収録している文章は、作成者が自分の言葉で書いたものです。公式サイト・書籍・字幕からの転載はしていません。</li>
        <li>事実関係の確認にファンサイトを参照することはありますが、文章は引き写していません。</li>
        <li>作中の画像・動画・音声は一切収録していません。</li>
        <li>ホーム画面用のアイコンのみ作成者が用意した画像を使っています。配布や収益化はしません。</li>
      </ul>

      <h3 className="section__title">使っているもの</h3>
      <ul className="bullets">
        <li>アイコン：lucide（ISC ライセンス）</li>
        <li>文字：端末に入っている日本語フォント（Web フォントの読み込みはありません）</li>
        <li>外部への通信・解析・広告はありません。設定や閲覧履歴は端末の中だけに保存されます。</li>
      </ul>

      <h3 className="section__title">データの更新履歴</h3>
      {data ? (
        <>
          <p className="page__note">
            データバージョン {data.db.dataVersion}
            {data.db.updatedAt && `（${data.db.updatedAt}）`}
          </p>
          <Changelog text={data.db.changelog} />
        </>
      ) : (
        <p className="page__note">読み込み中…</p>
      )}
    </>
  )
}
