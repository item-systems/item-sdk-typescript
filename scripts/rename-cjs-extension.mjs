import { readdir, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootUrl = new URL('../dist/cjs/', import.meta.url)
const rootPath = fileURLToPath(rootUrl)

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

    const nextPath = childPath.replace(/\.js$/, '.cjs')
    await rename(childPath, nextPath)
    console.log(`renamed ${path.relative(rootPath, childPath)} -> ${path.relative(rootPath, nextPath)}`)
  }
}

await walk(rootPath)
