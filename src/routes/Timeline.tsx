// 年表（docs/03_ui_design.md §3「年表」）。
// 時代区分のスティッキーヘッダー、左に年の目盛りと視聴済み作品の帯、右に出来事カード。
// 未視聴作品の名前・帯・略称は一切出さない（出すもとになる配列を visibility.ts が先に絞る）。
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatYearShort, shortWorkLabel } from '../lib/labels'
import { plainFactText } from '../lib/links'
import {
  buildTimeline,
  displayName,
  displayNameResolver,
  timelineBands,
  unlockedChecker,
  visibleEras,
  visibleFacts,
} from '../lib/visibility'
import { useApp, useDb } from '../store/app'
import type { DbEntity, DbWork, Era } from '../types'

type Row = { kind: 'era'; era: Era } | { kind: 'event'; event: DbEntity; year: number }

/** 年順に並べた出来事に、時代区分の見出しを差し込む */
function buildRows(events: DbEntity[], eras: Era[]): Row[] {
  const rows: Row[] = []
  let currentEra: string | null = null
  for (const event of events) {
    const date = event.date
    if (!date) continue
    const year = date.year
    // 解放済みの時代区分のうち、この年を含むもの（複数あれば開始が遅いほうを採る）
    const era =
      date.precision === 'unknown'
        ? undefined
        : [...eras].reverse().find((x) => year >= x.start && year <= x.end)
    if (era && era.id !== currentEra) {
      rows.push({ kind: 'era', era })
      currentEra = era.id
    }
    rows.push({ kind: 'event', event, year })
  }
  return rows
}

export default function Timeline() {
  const { status } = useApp()
  const data = useDb()
  const [onlyWork, setOnlyWork] = useState<string | null>(null)

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (!data) return <p className="page__note">データを読み込めませんでした。</p>

  const { db, index, watched } = data
  const bands = timelineBands(db, watched)
  // 絞り込み中の作品が視聴済みでなくなったら、絞り込みを無視する
  const activeWork = onlyWork && bands.some((w) => w.id === onlyWork) ? onlyWork : undefined
  const events = buildTimeline(index, watched, activeWork)
  const rows = buildRows(events, visibleEras(db, watched))

  const bandsAt = (year: number): DbWork[] =>
    bands.filter((w) => {
      const t = w.timeline
      if (!t) return false
      return year >= t.start && year <= (t.end ?? t.start)
    })

  return (
    <>
      <h2 className="page__title">年表</h2>
      <p className="page__note">ヤヴィンの戦いの年を 0 として、前を BBY、後を ABY と数えます。</p>

      {bands.length > 0 && (
        <nav className="chipList" aria-label="作品でしぼりこむ">
          <button
            type="button"
            className={'chip' + (activeWork === undefined ? ' is-active' : '')}
            onClick={() => setOnlyWork(null)}
          >
            すべて
          </button>
          {bands.map((w) => (
            <button
              key={w.id}
              type="button"
              className={'chip' + (activeWork === w.id ? ' is-active' : '')}
              onClick={() => setOnlyWork(activeWork === w.id ? null : w.id)}
            >
              {shortWorkLabel(w)}
            </button>
          ))}
        </nav>
      )}

      {events.length === 0 ? (
        <div className="card">
          <p>まだ表示できる出来事がありません。</p>
          <p className="page__note">視聴済み作品を追加すると、その作品で明かされた出来事が並びます。</p>
          <Link className="button" to="/settings">
            視聴済み作品を設定する
          </Link>
        </div>
      ) : (
        <ol className="timeline">
          {rows.map((row, i) =>
            row.kind === 'era' ? (
              <li key={`era-${row.era.id}`} className="timeline__era">
                {row.era.name}
              </li>
            ) : (
              <li key={row.event.id} className="timeline__row">
                <div className="timeline__gutter">
                  <span className="timeline__year">{formatYearShort(row.event.date!)}</span>
                  <span className="timeline__bands">
                    {bandsAt(row.year).map((w) => {
                      // 略称はその作品の帯が最初に出てくる行だけに付ける
                      const first = !rows
                        .slice(0, i)
                        .some((r) => r.kind === 'event' && bandsAt(r.year).some((x) => x.id === w.id))
                      return (
                        <span key={w.id} className="timeline__band">
                          {first && <span className="timeline__bandLabel">{shortWorkLabel(w)}</span>}
                        </span>
                      )
                    })}
                  </span>
                </div>
                <Link className="timeline__card" to={`/e/${row.event.id}`}>
                  <span className="timeline__name">{displayName(row.event, watched)}</span>
                  <span className="timeline__summary">
                    {plainFactText(
                      visibleFacts(row.event, watched).find((f) => f.kind === 'summary')?.text ?? '',
                      {
                        isUnlocked: unlockedChecker(index, watched),
                        displayName: displayNameResolver(index, watched),
                      },
                    )}
                  </span>
                </Link>
              </li>
            ),
          )}
        </ol>
      )}

      <Link className="button button--quiet" to="/works">
        作品の時系列を見る
      </Link>
    </>
  )
}
