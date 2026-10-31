// 指定した視聴状況での見え方をテキスト出力する（docs/02 §10 末尾）。
// 例: npm run data:preview -- --watched ep4,ep5 --entity darth-vader
// Phase 1 で実装する。
const args = process.argv.slice(2)
console.log('[data:preview] Phase 1 で実装します。受け取った引数:', args.join(' ') || '(なし)')
