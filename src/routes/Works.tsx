// 作品一覧（docs/01_requirements.md F-11、docs/03_ui_design.md §1）。
// 視聴済み作品を公開順／作中時系列順で並べる。未視聴作品は出さない。
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatWorkTimeline, releaseYear, shortWorkLabel } from '../lib/labels'
import { watchedWorks } from '../lib/visibility'
import { useApp, useDb } from '../store/app'

export default function Works() {
  const { status } = useApp()
  const data = useDb()
  const [order, setOrder] = useState<'publish' | 'timeline'>('publish')

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (!data) return <p className="page__note">データを読み込めませんでした。</p>

  const works = watchedWorks(data.db, data.watched, order)

  return (
    <>
      <h2 className="page__title">視聴済みの作品</h2>

      <div className="field">
        <span className="field__label">並び順</span>
        <div className="segmented" role="group" aria-label="並び順">
          <button
            type="button"
            className={'segmented__item' + (order === 'publish' ? ' is-active' : '')}
            aria-pressed={order === 'publish'}
            onClick={() => setOrder('publish')}
          >
            公開順
          </button>
          <button
            type="button"
            className={'segmented__item' + (order === 'timeline' ? ' is-active' : '')}
            aria-pressed={order === 'timeline'}
            onClick={() => setOrder('timeline')}
          >
            作中の時系列順
          </button>
        </div>
      </div>

      {works.length === 0 ? (
        <div className="card">
          <p>まだ視聴済みの作品がありません。</p>
          <Link className="button" to="/settings">
            視聴済み作品を設定する
          </Link>
        </div>
      ) : (
        <div className="listPage__body">
          {works.map((w) => (
            <div key={w.id} className="listRow listRow--static">
              <span className="listRow__name">
                {w.title}
                <span className="badge">{shortWorkLabel(w)}</span>
              </span>
              <span className="listRow__sub">
                公開 {releaseYear(w)} 年 ／ 作中 {formatWorkTimeline(w)}
                {!w.hasPack && ' ／ データ準備中'}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link className="button button--quiet" to="/timeline">
        年表に戻る
      </Link>
    </>
  )
}
