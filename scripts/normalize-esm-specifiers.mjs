import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootUrl = new URL('../dist/esm/', import.meta.url)
const rootPath = fileURLToPath(rootUrl)

const RELATIVE_SPECIFIER_RE = /((?:import|export)\s+(?:[^'";]+?\s+from\s+)?|import\s*\()(['"])(\.\.?\/[^'"\n]+)(\2)/g

async function resolveSpecifierTarget(fromFilePath, specifier) {
  const absoluteBase = path.resolve(path.dirname(fromFilePath), specifier)

  if ((await statSafe(`${absoluteBase}.js`))?.isFile()) {
    return `${specifier}.js`
  }

  if ((await statSafe(path.join(absoluteBase, 'index.js')))?.isFile()) {
    return `${specifier}/index.js`
  }

  return specifier
}

async function statSafe(targetPath) {
  return stat(targetPath).catch(() => null)
}

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const childPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      await walk(childPath)
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) {
      continue
    }

    const original = await readFile(childPath, 'utf8')
    let updated = original

    const matches = [...original.matchAll(RELATIVE_SPECIFIER_RE)]
    for (const match of matches) {
      const [fullMatch, prefix, quote, specifier, suffix] = match
      if (specifier.endsWith('.js') || specifier.endsWith('.json') || specifier.endsWith('.node')) {
        continue
      }

      const resolvedSpecifier = await resolveSpecifierTarget(childPath, specifier)
      const replacement = `${prefix}${quote}${resolvedSpecifier}${suffix}`
      updated = updated.replace(fullMatch, replacement)
    }

    if (updated !== original) {
      await writeFile(childPath, updated, 'utf8')
      console.log(`normalized ${path.relative(rootPath, childPath)}`)
    }
  }
}

const rootStats = await statSafe(rootPath)
if (!rootStats?.isDirectory()) {
  throw new Error(`ESM output directory not found: ${rootPath}`)
}

await walk(rootPath)
