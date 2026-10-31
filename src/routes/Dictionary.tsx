import { useParams } from 'react-router-dom'

// Phase 4 で種類タブ・五十音インデックス・検索を入れる（docs/03 §3）。
export default function Dictionary() {
  const { type } = useParams()
  return (
    <>
      <h2 className="page__title">辞典</h2>
      <p className="page__note">種類：{type}（Phase 4 で一覧を実装します）</p>
      <div className="card">
        <p>解放済みの項目が五十音順に並びます。</p>
      </div>
    </>
  )
}
