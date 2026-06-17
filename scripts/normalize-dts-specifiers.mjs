import fs from 'node:fs'
import path from 'node:path'

const roots = [path.resolve('dist/esm'), path.resolve('dist/cjs')]

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
  if (fs.existsSync(`${base}.d.ts`) || fs.existsSync(`${base}.js`) || fs.existsSync(`${base}.cjs`)) {
    return `${specifier}.js`
  }
  if (
    fs.existsSync(path.join(base, 'index.d.ts')) ||
    fs.existsSync(path.join(base, 'index.js')) ||
    fs.existsSync(path.join(base, 'index.cjs'))
  ) {
    return `${specifier}/index.js`
  }
  return specifier
}

function normalizeFile(file) {
  let source = fs.readFileSync(file, 'utf8')
  const original = source
  source = source.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
    return `${prefix}${resolveSpecifier(file, specifier)}${suffix}`
  })
  source = source.replace(/(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => {
    return `${prefix}${resolveSpecifier(file, specifier)}${suffix}`
  })
  if (source !== original) fs.writeFileSync(file, source)
}

for (const root of roots) {
  for (const file of walk(root).filter((file) => file.endsWith('.d.ts'))) normalizeFile(file)
}
