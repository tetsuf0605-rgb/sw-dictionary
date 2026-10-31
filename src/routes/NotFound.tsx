import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <h2 className="page__title">ページが見つかりません</h2>
      <p className="page__note">
        <Link to="/">ホームへ戻る</Link>
      </p>
    </>
  )
}
