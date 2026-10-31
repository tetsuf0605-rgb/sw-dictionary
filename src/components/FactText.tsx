// 記述の本文を描画する（docs/02_data_model.md §8）。
// リンクにするかどうかは links.ts が決め、その判定材料は visibility.ts が作る。
// 未解放のリンクは <span> にするので、タップしても何も起きない。
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { renderFactText } from '../lib/links'
import { displayNameResolver, unlockedChecker, type Index, type Watched } from '../lib/visibility'

export default function FactText({
  text,
  index,
  watched,
}: {
  text: string
  index: Index
  watched: Watched
}) {
  const tokens = useMemo(
    () =>
      renderFactText(text, {
        isUnlocked: unlockedChecker(index, watched),
        displayName: displayNameResolver(index, watched),
      }),
    [text, index, watched],
  )

  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === 'link') {
          return (
            <Link key={i} className="factLink" to={`/e/${token.id}`}>
              {token.text}
            </Link>
          )
        }
        if (token.kind === 'locked') {
          return (
            <span key={i} className="factLocked">
              {token.text}
            </span>
          )
        }
        return <span key={i}>{token.text}</span>
      })}
    </>
  )
}
