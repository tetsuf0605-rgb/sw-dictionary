// ホーム（docs/03_ui_design.md §3「ホーム」）。
// 視聴状況のサマリーと、種類別・年表への入口。件数はすべて watched で絞ったもの。
import { Search, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TYPE_LABEL, TYPE_ORDER } from '../lib/labels'
import { displayName, resolveUnlocked, unlockedEntities } from '../lib/visibility'
import { useApp, useDb } from '../store/app'

export default function Home() {
  const { status, watchedIds, prefs, history, whatsNew, favorites } = useApp()
  const data = useDb()

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (status.kind === 'error' || !data) {
    return (
      <>
        <h2 className="page__title">ホーム</h2>
        <div className="card">
          <p>データを読み込めませんでした。</p>
          <p className="page__note">
            {status.kind === 'error' ? status.message : ''}
            <br />
            通信できる状態でもう一度開いてみてください。
          </p>
        </div>
      </>
    )
  }

  const { db, index, watched } = data
  const unlocked = unlockedEntities(index, watched)
  const counts = new Map(TYPE_ORDER.map((t) => [t, unlocked.filter((e) => e.type === t).length]))
  const withData = watchedIds.filter((id) => db.works.find((w) => w.id === id)?.hasPack).length
  const recent = resolveUnlocked(index, history, watched).slice(0, 5)
  const favoriteItems = resolveUnlocked(index, favorites, watched).slice(0, 8)

  if (watchedIds.length === 0 && !prefs.showAll) {
    return (
      <>
        <h2 className="page__title">ホロクロン</h2>
        <div className="card card--invite">
          <p className="card__lead">まず、視聴済みの作品を選んでください。</p>
          <p className="page__note">
            選んだ作品で明かされた情報だけが表示されます。まだ見ていない作品のネタバレは出ません。
          </p>
          <Link className="button" to="/settings">
            視聴済み作品を設定する
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 className="page__title">ホロクロン</h2>

      <Link className="searchEntry" to="/search">
        <Search size={18} aria-hidden="true" />
        名前・読み・英語名で検索
      </Link>

      <div className="card">
        <p className="card__lead">
          {prefs.showAll ? 'すべて表示中（ネタバレ全開放）' : `視聴済み ${watchedIds.length} 作品`}
          {!prefs.showAll && <span className="page__note">（データあり {withData} 作品）</span>}
        </p>
        <p className="page__note">読める項目は {unlocked.length} 件です。</p>
        <Link className="button button--quiet" to="/settings">
          視聴済み作品を変更する
        </Link>
      </div>

      {whatsNew.total > 0 && (
        <Link className="card card--link card--new" to="/whats-new">
          <span className="card__lead">新しく読めるようになった項目（{whatsNew.total} 件）</span>
          <span className="page__note">
            新規 {whatsNew.newEntities.length} 件 ／ 記述が増えた項目 {whatsNew.updatedEntities.length} 件
          </span>
        </Link>
      )}

      <h3 className="section__title">辞典</h3>
      <nav className="tiles" aria-label="種類別の一覧">
        {TYPE_ORDER.map((type) => {
          const count = counts.get(type) ?? 0
          return (
            <Link
              key={type}
              className={'tile' + (count === 0 ? ' tile--empty' : '')}
              to={`/list/${type}`}
              style={{ ['--tile-accent' as string]: `var(--type-${type})` }}
            >
              <span className="tile__label">{TYPE_LABEL[type]}</span>
              <span className="tile__count">{count}</span>
            </Link>
          )
        })}
      </nav>

      {favoriteItems.length > 0 && (
        <>
          <h3 className="section__title">
            <Star size={14} aria-hidden="true" /> お気に入り
          </h3>
          <p className="chipList">
            {favoriteItems.map((e) => (
              <Link key={e.id} className="chip" to={`/e/${e.id}`}>
                {displayName(e, watched)}
              </Link>
            ))}
          </p>
        </>
      )}

      {recent.length > 0 && (
        <>
          <h3 className="section__title">最近見た項目</h3>
          <p className="chipList">
            {recent.map((e) => (
              <Link key={e.id} className="chip" to={`/e/${e.id}`}>
                {displayName(e, watched)}
              </Link>
            ))}
          </p>
        </>
      )}

      <Link className="card card--link" to="/timeline">
        <span className="card__lead">年表</span>
        <span className="page__note">
          読める出来事 {counts.get('event') ?? 0} 件を、作中の年代順に並べます。
        </span>
      </Link>
    </>
  )
}
