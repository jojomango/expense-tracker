#!/usr/bin/env node
/**
 * 架構警察 — 強制執行 SPEC.md §2 P1：業務邏輯與框架完全分離。
 *
 * src/domain/ 內不得出現任何非相對路徑的 import / export-from / require /
 * 動態 import。違反即 exit 1，CI 失敗。
 *
 * 這條規則的存在理由：未來要把 src/domain/ 原封不動搬到 Android 版本。
 * 一旦被污染，可攜性就沒了，而且通常在你發現時已經太晚。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const DOMAIN_DIR = 'src/domain'
const ALLOWED_TYPE_ONLY = new Set([]) // 需要時可白名單化純型別套件

/** 掃出所有模組來源字串 */
const PATTERNS = [
  // import ... from 'x' / export ... from 'x'
  /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g,
  // import 'x'  (side-effect)
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  // import('x')
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // require('x')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) yield p
  }
}

const violations = []
let fileCount = 0

for await (const file of walk(DOMAIN_DIR)) {
  fileCount++
  const src = await readFile(file, 'utf8')
  const found = new Set()
  for (const re of PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(src)) !== null) found.add(m[1])
  }
  for (const spec of found) {
    const isRelative = spec.startsWith('./') || spec.startsWith('../')
    if (isRelative) continue
    if (ALLOWED_TYPE_ONLY.has(spec)) continue
    violations.push({ file: relative(process.cwd(), file), spec })
  }
}

if (fileCount === 0) {
  console.error(`✗ 找不到任何 ${DOMAIN_DIR} 檔案 — 檢查器可能沒有真的在把關。`)
  process.exit(1)
}

if (violations.length > 0) {
  console.error('\n✗ 架構違規：src/domain/ 必須是純 TypeScript，不得依賴任何外部模組。\n')
  for (const v of violations) {
    console.error(`  ${v.file}\n    → import "${v.spec}"`)
  }
  console.error(`
  參見 SPEC.md §2 P1。

  怎麼修：
    - 需要 React / Dexie / 任何套件的邏輯，不屬於 domain 層。
      請把它移到 src/persistence/、src/ui/ 或 src/app/。
    - domain 需要外部能力時，在 domain 內「定義介面」，
      由外層注入實作（依賴反轉）。
    - 需要目前時間？不要 import 任何東西，把 Date 當參數傳進來。
`)
  process.exit(1)
}

console.log(`✓ 架構檢查通過 — ${fileCount} 個 domain 檔案，零外部依賴。`)
