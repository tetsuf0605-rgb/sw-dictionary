// アプリの更新案内（docs/01_requirements.md F-07、docs/04 Phase 7）。
//
// Service Worker は「勝手に更新しない」設定（vite.config の registerType: 'prompt'）にしてある。
// 新しい版が用意できたらここで知らせ、ユーザーが押したときだけ切り替える。
// 黙って入れ替えると、読んでいる途中で画面が作り直される事故が起きるため。
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // 1 時間ごとに更新を確認する（開いたままのときのため）
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="updateBar" role="status">
      <span>更新があります</span>
      <button type="button" className="updateBar__apply" onClick={() => void updateServiceWorker(true)}>
        再読み込み
      </button>
      <button
        type="button"
        className="updateBar__later"
        aria-label="あとで"
        onClick={() => setNeedRefresh(false)}
      >
        あとで
      </button>
    </div>
  )
}
