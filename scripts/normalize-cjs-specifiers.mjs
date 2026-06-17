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

function resolveSpecifier(file, specifier) {
  if (!specifier.startsWith('.') || path.extname(specifier)) return specifier

  const base = path.resolve(path.dirname(file), specifier)
  if (fs.existsSync(`${base}.cjs`)) return `${specifier}.cjs`
  if (fs.existsSync(path.join(base, 'index.cjs'))) return `${specifier}/index.cjs`
  return specifier
}

function normalizeFile(file) {
  let source = fs.readFileSync(file, 'utf8')
  const original = source
  source = source.replace(/(require\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => {
    return `${prefix}${resolveSpecifier(file, specifier)}${suffix}`
  })
  if (source !== original) fs.writeFileSync(file, source)
}

for (const file of walk(root).filter((file) => file.endsWith('.cjs'))) normalizeFile(file)
