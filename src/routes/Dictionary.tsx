// 一覧（docs/03_ui_design.md §3「一覧」）。
// 種類タブ（横スクロール）＋五十音インデックス＋行。空状態では設定へ誘導する。
import { Link, useParams } from 'react-router-dom'
import { KANA_ROWS, kanaRow } from '../lib/kana'
import { TYPE_LABEL, TYPE_ORDER } from '../lib/labels'
import { displayName, sortByReading, sortKeyOf, unlockedEntities, visibleNames } from '../lib/visibility'
import { isNew } from '../lib/unlocks'
import { useApp, useDb } from '../store/app'
import type { EntityType } from '../types'

const isEntityType = (v: string): v is EntityType => (TYPE_ORDER as string[]).includes(v)

export default function Dictionary() {
  const { type = '' } = useParams()
  const { status, whatsNew } = useApp()
  const data = useDb()

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (!data || !isEntityType(type)) {
    return <p className="page__note">表示できる種類ではありません。</p>
  }

  const { index, watched } = data
  const list = sortByReading(
    unlockedEntities(index, watched).filter((e) => e.type === type),
    watched,
  )
  const groups = KANA_ROWS.map((row) => ({
    row,
    items: list.filter((e) => kanaRow(sortKeyOf(e, watched)) === row),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <h2 className="page__title">辞典</h2>

      <nav className="typeTabs" aria-label="種類">
        {TYPE_ORDER.map((t) => (
          <Link key={t} className={'typeTabs__item' + (t === type ? ' is-active' : '')} to={`/list/${t}`}>
            {TYPE_LABEL[t]}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="card">
          <p>まだ表示できる項目がありません。</p>
          <p className="page__note">視聴済み作品を追加すると、その作品で明かされた項目が増えます。</p>
          <Link className="button" to="/settings">
            視聴済み作品を設定する
          </Link>
        </div>
      ) : (
        <div className="listPage">
          <div className="listPage__body">
            {groups.map((group) => (
              <section key={group.row} id={`kana-${group.row}`} className="kanaGroup">
                <h3 className="kanaGroup__head">{group.row}</h3>
                {group.items.map((e) => {
                  const names = visibleNames(e, watched)
                  return (
                    <Link key={e.id} className="listRow" to={`/e/${e.id}`}>
                      <span className="listRow__name">
                        {displayName(e, watched)}
                        {isNew(e, whatsNew) && <span className="newBadge">NEW</span>}
                      </span>
                      {names.length > 1 && (
                        <span className="listRow__sub">別名：{names.slice(1).map((n) => n.text).join('、')}</span>
                      )}
                    </Link>
                  )
                })}
              </section>
            ))}
          </div>

          <nav className="kanaIndex" aria-label="五十音インデックス">
            {KANA_ROWS.map((row) => {
              const has = groups.some((g) => g.row === row)
              return (
                <button
                  key={row}
                  type="button"
                  className={'kanaIndex__item' + (has ? '' : ' is-empty')}
                  aria-label={`${row}行へ移動`}
                  disabled={!has}
                  onClick={() =>
                    document.getElementById(`kana-${row}`)?.scrollIntoView({ block: 'start' })
                  }
                >
                  {row}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
