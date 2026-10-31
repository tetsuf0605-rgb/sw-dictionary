// assets/icon-source.png から PWA 用アイコン一式を生成する（docs/03 §5）。
//
// 追加パッケージを入れずに済ませるため、Node 標準の zlib だけで PNG を読み書きしている。
//   1. 元画像を読む（8bit / RGB または RGBA / 非インターレース）
//   2. 外周の白い余白と角丸の外側を背景色 --bg (#0a0a0f) で塗りつぶし、四角いアイコンにする
//   3. 面積平均で縮小して各サイズを書き出す
//   4. maskable 版は Android に角を削られても主役が残るよう、80% に縮めて中央に置く
//
// 使い方: npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'assets/icon-source.png')
const OUT_DIR = resolve(root, 'public/icons')
const BG = [0x0a, 0x0a, 0x0f] // tokens.css の --bg
const WHITE_THRESHOLD = 220 // これ以上明るく、かつ外周とつながっている画素を余白とみなす

/* ---------- PNG の基本部品 ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** PNG を読んで { data: RGB, width, height } を返す（アルファは背景色に合成する） */
function decodePng(buf) {
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('PNG ではありません')
  let pos = 8
  let ihdr = null
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + len
  }
  if (!ihdr) throw new Error('IHDR が見つかりません')
  if (ihdr.bitDepth !== 8 || ![2, 6].includes(ihdr.colorType) || ihdr.interlace !== 0) {
    throw new Error(
      `対応していない PNG です（bitDepth=${ihdr.bitDepth} colorType=${ihdr.colorType} interlace=${ihdr.interlace}）。` +
        '8bit・RGB または RGBA・非インターレースで書き出し直してください。',
    )
  }

  const w = ihdr.width
  const h = ihdr.height
  const ch = ihdr.colorType === 2 ? 3 : 4
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = new Uint8Array(w * h * 3)
  let prev = new Uint8Array(stride)
  const line = new Uint8Array(stride)
  let p = 0

  for (let y = 0; y < h; y++) {
    const filter = raw[p++]
    line.set(raw.subarray(p, p + stride))
    p += stride
    if (filter === 1) {
      for (let i = ch; i < stride; i++) line[i] = (line[i] + line[i - ch]) & 255
    } else if (filter === 2) {
      for (let i = 0; i < stride; i++) line[i] = (line[i] + prev[i]) & 255
    } else if (filter === 3) {
      for (let i = 0; i < stride; i++) {
        const a = i >= ch ? line[i - ch] : 0
        line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i++) {
        const a = i >= ch ? line[i - ch] : 0
        const c = i >= ch ? prev[i - ch] : 0
        line[i] = (line[i] + paeth(a, prev[i], c)) & 255
      }
    } else if (filter !== 0) {
      throw new Error(`未知のフィルタ種別: ${filter}`)
    }

    for (let x = 0; x < w; x++) {
      const s = x * ch
      const d = (y * w + x) * 3
      if (ch === 4) {
        const a = line[s + 3] / 255
        out[d] = Math.round(line[s] * a + BG[0] * (1 - a))
        out[d + 1] = Math.round(line[s + 1] * a + BG[1] * (1 - a))
        out[d + 2] = Math.round(line[s + 2] * a + BG[2] * (1 - a))
      } else {
        out[d] = line[s]
        out[d + 1] = line[s + 1]
        out[d + 2] = line[s + 2]
      }
    }
    prev = Uint8Array.from(line)
  }
  return { data: out, width: w, height: h }
}

/** RGB を不透明 PNG（colorType 2）として書き出す */
function encodePng(img) {
  const stride = img.width * 3
  const raw = Buffer.alloc((stride + 1) * img.height)
  for (let y = 0; y < img.height; y++) {
    raw[y * (stride + 1)] = 0 // フィルタなし
    const row = Buffer.from(img.data.buffer, img.data.byteOffset + y * stride, stride)
    row.copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(img.width, 0)
  ihdr.writeUInt32BE(img.height, 4)
  ihdr[8] = 8 // bitDepth
  ihdr[9] = 2 // colorType: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- 画像処理 ---------- */

/** 外周からつながっている明るい画素（白い余白・角丸の外側）を背景色で塗る */
function fillBorderWhite(img) {
  const { data, width, height } = img
  const seen = new Uint8Array(width * height)
  const stack = []
  const isWhite = (i) => {
    const d = i * 3
    return (
      data[d] >= WHITE_THRESHOLD && data[d + 1] >= WHITE_THRESHOLD && data[d + 2] >= WHITE_THRESHOLD
    )
  }
  const push = (x, y) => {
    const i = y * width + x
    if (!seen[i] && isWhite(i)) {
      seen[i] = 1
      stack.push(i)
    }
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  let filled = 0
  while (stack.length) {
    const i = stack.pop()
    const x = i % width
    const y = (i / width) | 0
    const d = i * 3
    data[d] = BG[0]
    data[d + 1] = BG[1]
    data[d + 2] = BG[2]
    filled++
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }
  return filled
}

/** 面積平均で正方形に縮小する（大きく縮めてもギザギザが出ない） */
function resize(src, size) {
  const { data, width: sw, height: sh } = src
  const out = new Uint8Array(size * size * 3)
  for (let y = 0; y < size; y++) {
    const y0 = Math.floor((y * sh) / size)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / size))
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor((x * sw) / size)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / size))
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const d = (yy * sw + xx) * 3
          r += data[d]
          g += data[d + 1]
          b += data[d + 2]
          n++
        }
      }
      const d = (y * size + x) * 3
      out[d] = Math.round(r / n)
      out[d + 1] = Math.round(g / n)
      out[d + 2] = Math.round(b / n)
    }
  }
  return { data: out, width: size, height: size }
}

/** 背景色のキャンバスの中央に画像を置く（maskable の安全領域を確保する） */
function center(inner, size) {
  const out = new Uint8Array(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    out[i * 3] = BG[0]
    out[i * 3 + 1] = BG[1]
    out[i * 3 + 2] = BG[2]
  }
  const off = Math.round((size - inner.width) / 2)
  for (let y = 0; y < inner.height; y++) {
    for (let x = 0; x < inner.width; x++) {
      const s = (y * inner.width + x) * 3
      const d = ((y + off) * size + (x + off)) * 3
      out[d] = inner.data[s]
      out[d + 1] = inner.data[s + 1]
      out[d + 2] = inner.data[s + 2]
    }
  }
  return { data: out, width: size, height: size }
}

/* ---------- 実行 ---------- */

const source = decodePng(readFileSync(SRC))
console.log(`元画像: ${source.width}x${source.height}`)
console.log(`外周の余白を背景色で塗りました: ${fillBorderWhite(source)} 画素`)

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-512.png', resize(source, 512)],
  ['icon-192.png', resize(source, 192)],
  ['apple-touch-icon.png', resize(source, 180)], // iOS 用。透過不可なので不透明 PNG
  // Android の形状マスクで角が削られる前提。絵柄を 80%(410px) に縮めて中央へ（docs/03 §5）
  ['icon-512-maskable.png', center(resize(source, 410), 512)],
]
for (const [name, img] of targets) {
  const buf = encodePng(img)
  writeFileSync(resolve(OUT_DIR, name), buf)
  console.log(`  public/icons/${name}  ${img.width}x${img.height}  ${(buf.length / 1024).toFixed(0)} KB`)
}

const favicon = encodePng(resize(source, 48))
writeFileSync(resolve(root, 'public/favicon.png'), favicon)
console.log(`  public/favicon.png  48x48  ${(favicon.length / 1024).toFixed(0)} KB`)
