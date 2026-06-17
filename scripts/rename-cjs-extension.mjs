import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('dist/cjs')

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

for (const file of walk(root).filter((file) => file.endsWith('.js'))) {
  fs.renameSync(file, file.replace(/\.js$/, '.cjs'))
}
