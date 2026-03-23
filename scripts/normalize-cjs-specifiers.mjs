import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootUrl = new URL('../dist/cjs/', import.meta.url)
const rootPath = fileURLToPath(rootUrl)

const REQUIRE_SPECIFIER_RE = /(require\()(['"])(\.\.?\/[^'"\n]+)(\2\))/g

async function statSafe(targetPath) {
  return stat(targetPath).catch(() => null)
}

async function resolveSpecifierTarget(fromFilePath, specifier) {
  const absoluteBase = path.resolve(path.dirname(fromFilePath), specifier)

  if ((await statSafe(`${absoluteBase}.cjs`))?.isFile()) {
    return `${specifier}.cjs`
  }

  if ((await statSafe(path.join(absoluteBase, 'index.cjs')))?.isFile()) {
    return `${specifier}/index.cjs`
  }

  return specifier
}

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const childPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      await walk(childPath)
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.cjs')) {
      continue
    }

    const original = await readFile(childPath, 'utf8')
    let updated = original

    const matches = [...original.matchAll(REQUIRE_SPECIFIER_RE)]
    for (const match of matches) {
      const [fullMatch, prefix, quote, specifier, suffix] = match
      if (specifier.endsWith('.cjs') || specifier.endsWith('.json') || specifier.endsWith('.node')) {
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

await walk(rootPath)
