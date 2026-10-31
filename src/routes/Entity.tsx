// 項目詳細（docs/03_ui_design.md §3「項目詳細」）。
// 並びは 1 種類バッジ → 2 見出し → 3 別名 → 4 同一人物 → 5 年代 → 6 記述 → 7 登場作品 → 8 関連項目。
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import FactText from '../components/FactText'
import Footprints from '../components/Footprints'
import TypeBadge from '../components/TypeBadge'
import { formatEventYear, shortWorkLabel } from '../lib/labels'
import {
  displayName,
  relatedAndBacklinks,
  shownWorks,
  visibleFacts,
  visibleNames,
  visibleSameAs,
  visibleSources,
  isUnlocked,
} from '../lib/visibility'
import { useApp, useDb } from '../store/app'

export default function Entity() {
  const { id = '' } = useParams()
  const { status, pushHistory } = useApp()
  const data = useDb()
  const entity = data?.index.entities.get(id)
  const unlocked = data && entity ? isUnlocked(entity, data.watched) : false

  useEffect(() => {
    if (unlocked) pushHistory(id)
  }, [id, unlocked, pushHistory])

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (!data) {
    return <p className="page__note">データを読み込めませんでした。</p>
  }

  // 未解放のディープリンク。名前は見せない（docs/03 §2）
  if (!entity || !unlocked) {
    return (
      <>
        <h2 className="page__title">表示できません</h2>
        <div className="card">
          <p>この項目はまだ表示できません。</p>
          <p className="page__note">視聴済み作品を設定で追加してください。</p>
          <Link className="button" to="/settings">
            設定を開く
          </Link>
        </div>
      </>
    )
  }

  const { index, watched } = data
  const names = visibleNames(entity, watched)
  const aliases = names.slice(1)
  const facts = visibleFacts(entity, watched)
  const sameAs = visibleSameAs(entity, watched, index)
  const works = shownWorks(entity, watched)
  const related = relatedAndBacklinks(entity, watched, index)

  return (
    <>
      <Footprints currentId={entity.id} />

      <TypeBadge type={entity.type} />
      <h2 className="entity__name">{names[0].text}</h2>
      <p className="entity__reading">
        {names[0].reading}
        {names[0].en && <span className="entity__en">{names[0].en}</span>}
      </p>

      {aliases.length > 0 && (
        <p className="entity__aliases">別名：{aliases.map((n) => n.text).join('、')}</p>
      )}

      {sameAs.map((s) => {
        const other = index.entities.get(s.id)
        if (!other) return null
        return (
          <p key={s.id} className="entity__sameAs">
            ＝{' '}
            <Link to={`/e/${s.id}`}>{displayName(other, watched)}</Link>
            {s.note && <span className="page__note">（{s.note}）</span>}
          </p>
        )
      })}

      {entity.date && <p className="entity__date">{formatEventYear(entity.date)}</p>}

      <section className="facts">
        {facts.length === 0 && <p className="page__note">この視聴状況で読める記述はまだありません。</p>}
        {facts.map((fact, i) => (
          <p key={fact.id ?? i} className={'fact' + (fact.kind === 'summary' ? ' fact--summary' : '')}>
            <FactText text={fact.text} index={index} watched={watched} />
            {visibleSources(fact, watched).map((workId) => {
              const work = index.works.get(workId)
              return work ? (
                <span key={workId} className="fact__source">
                  {shortWorkLabel(work)}
                </span>
              ) : null
            })}
          </p>
        ))}
      </section>

      {works.length > 0 && (
        <>
          <h3 className="section__title">登場作品</h3>
          <p className="chipList">
            {works.map((workId) => {
              const work = index.works.get(workId)
              return work ? (
                <span key={workId} className="chip chip--static">
                  {work.title}
                </span>
              ) : null
            })}
          </p>
        </>
      )}

      {related.length > 0 && (
        <>
          <h3 className="section__title">関連項目</h3>
          <p className="chipList">
            {related.map((other) => (
              <Link key={other.id} className="chip" to={`/e/${other.id}`}>
                {displayName(other, watched)}
              </Link>
            ))}
          </p>
        </>
      )}
    </>
  )
}
