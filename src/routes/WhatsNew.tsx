// 新着（docs/03_ui_design.md §3「新着」、docs/01 F-06）。
// 「設定を変更して新しく読めるようになったもの」を、新規解放と追記に分けて出す。
import { Link } from 'react-router-dom'
import TypeBadge from '../components/TypeBadge'
import { TYPE_LABEL, TYPE_ORDER } from '../lib/labels'
import { displayName, sortByReading } from '../lib/visibility'
import { useApp, useDb } from '../store/app'

export default function WhatsNew() {
  const { status, whatsNew, markAllRead } = useApp()
  const data = useDb()

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (!data) return <p className="page__note">データを読み込めませんでした。</p>

  const { watched } = data

  if (whatsNew.total === 0) {
    return (
      <>
        <h2 className="page__title">新着</h2>
        <div className="card">
          <p>新しく読めるようになったものはありません。</p>
          <p className="page__note">
            設定で視聴済み作品を追加すると、新しく解放された項目がここに出ます。
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
      <h2 className="page__title">新着</h2>
      <p className="page__note">設定を変更して新しく読めるようになったものです（{whatsNew.total} 件）。</p>

      <button type="button" className="button button--quiet" onClick={markAllRead}>
        すべて既読にする
      </button>

      {whatsNew.newEntities.length > 0 && (
        <>
          <h3 className="section__title">新しく読めるようになった項目（{whatsNew.newEntities.length}）</h3>
          {TYPE_ORDER.map((type) => {
            const list = sortByReading(
              whatsNew.newEntities.filter((e) => e.type === type),
              watched,
            )
            if (list.length === 0) return null
            return (
              <section key={type} className="kanaGroup">
                <h4 className="kanaGroup__head">{TYPE_LABEL[type]}</h4>
                {list.map((e) => (
                  <Link key={e.id} className="listRow" to={`/e/${e.id}`}>
                    <span className="listRow__name">
                      {displayName(e, watched)}
                      <span className="newBadge">NEW</span>
                    </span>
                  </Link>
                ))}
              </section>
            )
          })}
        </>
      )}

      {whatsNew.updatedEntities.length > 0 && (
        <>
          <h3 className="section__title">記述が増えた項目（{whatsNew.updatedEntities.length}）</h3>
          <div className="listPage__body">
            {whatsNew.updatedEntities.map(({ entity, count }) => (
              <Link key={entity.id} className="listRow" to={`/e/${entity.id}`}>
                <span className="listRow__name">
                  {displayName(entity, watched)}
                  <TypeBadge type={entity.type} />
                </span>
                <span className="listRow__sub">{count} 件の記述が増えました</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
