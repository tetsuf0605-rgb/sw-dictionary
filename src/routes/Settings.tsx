// 設定画面（docs/03_ui_design.md §3「設定」）。
// 視聴済み作品・表示設定・データ情報の 3 つ。保存はチェックした瞬間に行う。
import { Link } from 'react-router-dom'
import SettingsTransfer from '../components/SettingsTransfer'
import WorkChecklist from '../components/WorkChecklist'
import { useApp, useDb } from '../store/app'
import type { Prefs } from '../types'

const FONT_SIZES: { value: Prefs['fontSize']; label: string }[] = [
  { value: 's', label: '小' },
  { value: 'm', label: '中' },
  { value: 'l', label: '大' },
]

export default function Settings() {
  const { status, prefs, watchedIds, updatePrefs, toggleWorks, history, clearHistory } = useApp()
  const data = useDb()

  if (status.kind === 'loading') return <p className="page__note">読み込み中…</p>
  if (status.kind === 'error' || !data) {
    return (
      <>
        <h2 className="page__title">設定</h2>
        <p className="page__note">データを読み込めませんでした。</p>
      </>
    )
  }

  const { db } = data
  const films = db.works.filter((w) => w.group === 'film-skywalker').map((w) => w.id)
  const liveAction = db.works.filter((w) => w.group === 'live-action').map((w) => w.id)
  const allWorks = db.works.map((w) => w.id)

  return (
    <>
      <h2 className="page__title">設定</h2>

      <section className="section">
        <h3 className="section__title">視聴済み作品</h3>
        <p className="page__note">
          チェックした作品の範囲でだけ、項目と記述が表示されます。{watchedIds.length} 作品を選択中。
        </p>

        <div className="quick">
          <button type="button" className="chip" onClick={() => toggleWorks(films, true)}>
            映画 {films.length} 作
          </button>
          <button type="button" className="chip" onClick={() => toggleWorks(liveAction, true)}>
            実写ドラマ全部
          </button>
          <button type="button" className="chip" onClick={() => toggleWorks(allWorks, true)}>
            すべて視聴済み
          </button>
          <button type="button" className="chip" onClick={() => toggleWorks(allWorks, false)}>
            すべて解除
          </button>
        </div>

        <p className="chipList">
          <Link className="chip" to="/works">
            視聴済みの作品を一覧で見る
          </Link>
        </p>

        <WorkChecklist works={db.works} />
      </section>

      <section className="section">
        <h3 className="section__title">表示</h3>

        <div className="field">
          <span className="field__label">文字サイズ</span>
          <div className="segmented" role="group" aria-label="文字サイズ">
            {FONT_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                className={'segmented__item' + (prefs.fontSize === size.value ? ' is-active' : '')}
                aria-pressed={prefs.fontSize === size.value}
                onClick={() => updatePrefs({ fontSize: size.value })}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <label className="row row--toggle">
          <input
            type="checkbox"
            checked={prefs.showAll}
            onChange={(e) => updatePrefs({ showAll: e.target.checked })}
          />
          <span className="row__body">
            <span className="row__title">すべて表示（ネタバレ全開放）</span>
            <span className="row__sub">
              視聴済みの設定を無視して、すべての項目と記述を表示します。画面上部に警告が出ます。
            </span>
          </span>
        </label>
      </section>

      <section className="section">
        <h3 className="section__title">データ</h3>
        <dl className="meta">
          <dt>データバージョン</dt>
          <dd>{db.dataVersion}</dd>
          <dt>最終更新</dt>
          <dd>{db.updatedAt || '—'}</dd>
          <dt>収録</dt>
          <dd>
            作品 {db.works.length} 件（データあり {db.works.filter((w) => w.hasPack).length} 件） / 項目{' '}
            {db.entities.length} 件
          </dd>
        </dl>
        <p className="chipList">
          <Link className="chip" to="/about">
            更新履歴とこのアプリについて
          </Link>
        </p>
      </section>

      <section className="section">
        <h3 className="section__title">設定の書き出し・取り込み</h3>
        <SettingsTransfer />
      </section>

      <section className="section">
        <h3 className="section__title">その他</h3>
        <button
          type="button"
          className="button button--quiet"
          disabled={history.length === 0}
          onClick={clearHistory}
        >
          閲覧履歴を消す（{history.length} 件）
        </button>
      </section>
    </>
  )
}
