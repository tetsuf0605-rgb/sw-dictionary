// 検索結果（docs/03_ui_design.md §3「検索結果」）。入力ごとに即時絞り込む。
// 検索対象は解放済み項目の解放済みの名前だけ（buildSearchIndex が担保する）。
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TypeBadge from '../components/TypeBadge'
import { search } from '../lib/search'
import { buildSearchIndex } from '../lib/visibility'
import { useApp, useDb } from '../store/app'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { status } = useApp()
  const data = useDb()

  const entries = useMemo(
    () => (data ? buildSearchIndex(data.index, data.watched) : []),
    [data],
  )
  const results = useMemo(() => search(entries, query), [entries, query])

  return (
    <>
      <h2 className="page__title">検索</h2>

      <input
        className="searchInput"
        type="search"
        value={query}
        autoFocus
        placeholder="名前・読み・英語名で検索"
        aria-label="検索語"
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
      />

      {status.kind === 'loading' && <p className="page__note">読み込み中…</p>}

      {query !== '' && results.length === 0 && (
        <p className="page__note">見つかりません。未視聴作品の項目は表示されません。</p>
      )}

      {query === '' && (
        <p className="page__note">
          解放済みの {entries.length} 件から探します。ひらがな・カタカナ・英語名のどれでも引けます。
        </p>
      )}

      <div className="listPage__body">
        {results.map((r) => (
          <Link key={r.id} className="listRow" to={`/e/${r.id}`}>
            <span className="listRow__name">
              {r.display}
              <TypeBadge type={r.type} />
            </span>
            {r.hitAlias && <span className="listRow__sub">別名：{r.hitAlias}</span>}
          </Link>
        ))}
      </div>
    </>
  )
}
