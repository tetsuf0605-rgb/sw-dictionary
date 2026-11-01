// Service Worker の登録を 1 か所に持っておき、設定画面の「アプリの更新を確認」から使えるようにする。
// 登録そのものは UpdatePrompt の useRegisterSW が行う。

let registration: ServiceWorkerRegistration | undefined

export function setRegistration(reg: ServiceWorkerRegistration | undefined): void {
  registration = reg
}

export type UpdateCheck = 'unsupported' | 'checking' | 'found' | 'latest' | 'failed'

/**
 * サーバーに新しい版がないか問い合わせる。
 * 新しい版が見つかったら UpdatePrompt が「更新があります」を出す。
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'unsupported'
  try {
    await registration.update()
    return registration.waiting || registration.installing ? 'found' : 'latest'
  } catch {
    return 'failed'
  }
}
