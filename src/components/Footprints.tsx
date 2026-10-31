// 足あと（docs/01 F-04 / docs/03 §2）。直前に見た項目を最大 5 件、チップで出す。
// 表示名は「現在の watched で解放されている名前」。未解放になった項目は出さない。
import { Link } from 'react-router-dom'
import { displayName, resolveUnlocked } from '../lib/visibility'
import { useApp, useDb } from '../store/app'
import type { EntityId } from '../types'

const MAX = 5

export default function Footprints({ currentId }: { currentId: EntityId }) {
  const { history } = useApp()
  const data = useDb()
  if (!data) return null

  const { index, watched } = data
  const items = resolveUnlocked(
    index,
    history.filter((id) => id !== currentId),
    watched,
  ).slice(0, MAX)

  if (items.length === 0) return null

  return (
    <nav className="footprints" aria-label="直前に見た項目">
      {items.map((e) => (
        <Link key={e.id} className="footprints__item" to={`/e/${e.id}`}>
          {displayName(e, watched)}
        </Link>
      ))}
    </nav>
  )
}
