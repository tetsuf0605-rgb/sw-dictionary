// 設定画面の「視聴済み作品」チェックリスト（docs/03_ui_design.md §3「設定」）。
// 大分類 → シリーズ → 作品 の 3 段。シリーズ行でまとめてチェックできる。
import { GROUP_LABEL, GROUP_ORDER, releaseYear } from '../lib/labels'
import { useApp } from '../store/app'
import type { DbWork, WorkGroup } from '../types'

type Entry = { kind: 'series'; id: string; title: string; works: DbWork[] } | { kind: 'work'; work: DbWork }

/** 公開順を保ったまま、シリーズ単位にまとめる */
function groupWorks(works: DbWork[]): { group: WorkGroup; entries: Entry[] }[] {
  return GROUP_ORDER.map((group) => {
    const inGroup = works.filter((w) => w.group === group)
    const entries: Entry[] = []
    const seriesIndex = new Map<string, number>()
    for (const work of inGroup) {
      if (!work.series) {
        entries.push({ kind: 'work', work })
        continue
      }
      const at = seriesIndex.get(work.series)
      if (at === undefined) {
        seriesIndex.set(work.series, entries.length)
        entries.push({
          kind: 'series',
          id: work.series,
          title: work.seriesTitle ?? work.series,
          works: [work],
        })
      } else {
        const entry = entries[at]
        if (entry.kind === 'series') entry.works.push(work)
      }
    }
    return { group, entries }
  }).filter((g) => g.entries.length > 0)
}

export default function WorkChecklist({ works }: { works: DbWork[] }) {
  const { watchedIds, toggleWork, toggleWorks } = useApp()
  const checked = new Set(watchedIds)

  return (
    <>
      {groupWorks(works).map(({ group, entries }) => (
        <section key={group} className="settings__group">
          <h3 className="settings__groupTitle">{GROUP_LABEL[group]}</h3>
          {entries.map((entry) =>
            entry.kind === 'work' ? (
              <WorkRow
                key={entry.work.id}
                work={entry.work}
                checked={checked.has(entry.work.id)}
                onChange={(on) => toggleWork(entry.work.id, on)}
              />
            ) : (
              <div key={entry.id} className="series">
                <label className="row row--series">
                  <input
                    type="checkbox"
                    checked={entry.works.every((w) => checked.has(w.id))}
                    ref={(el) => {
                      if (el) {
                        const some = entry.works.some((w) => checked.has(w.id))
                        el.indeterminate = some && !entry.works.every((w) => checked.has(w.id))
                      }
                    }}
                    onChange={(e) => toggleWorks(entry.works.map((w) => w.id), e.target.checked)}
                  />
                  <span className="row__title">{entry.title}</span>
                  <span className="row__sub">
                    {entry.works.every((w) => w.kind === 'film') ? '全作品' : '全シーズン'}
                  </span>
                </label>
                {entry.works.map((work) => (
                  <WorkRow
                    key={work.id}
                    work={work}
                    nested
                    checked={checked.has(work.id)}
                    onChange={(on) => toggleWork(work.id, on)}
                  />
                ))}
              </div>
            ),
          )}
        </section>
      ))}
    </>
  )
}

function WorkRow({
  work,
  checked,
  nested = false,
  onChange,
}: {
  work: DbWork
  checked: boolean
  nested?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <label className={'row' + (nested ? ' row--nested' : '')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="row__body">
        <span className="row__title">
          {work.title}
          <span className="row__year">{releaseYear(work)}</span>
          {!work.hasPack && <span className="badge badge--pending">データ準備中</span>}
          {work.status === 'upcoming' && <span className="badge">未公開</span>}
        </span>
        {work.note && <span className="row__sub">{work.note}</span>}
      </span>
    </label>
  )
}
