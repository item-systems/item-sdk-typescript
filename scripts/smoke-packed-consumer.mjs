import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repo = process.cwd()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'item-sdk-packed-consumer-'))
const run = (cmd, args, cwd = tmp) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })

const tarballName = execFileSync('npm', ['pack', '--silent'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').pop()
const tarball = path.join(repo, tarballName)

try {
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2))
  run('npm', ['install', '--silent', tarball])

  fs.writeFileSync(path.join(tmp, 'esm.mjs'), `
import { Item, Utils, SignResponse, constants, types } from '@item-systems/item'
if (!Item || !Utils || !SignResponse || !constants || !types) throw new Error('missing ESM public exports')
console.log('esm ok')
`)
  run('node', ['esm.mjs'])

  fs.writeFileSync(path.join(tmp, 'cjs.cjs'), `
const { Item, Utils, SignResponse, constants, types } = require('@item-systems/item')
if (!Item || !Utils || !SignResponse || !constants || !types) throw new Error('missing CJS public exports')
console.log('cjs ok')
`)
  run('node', ['cjs.cjs'])

  fs.writeFileSync(path.join(tmp, 'tscheck.ts'), `
import { Item, Utils, SignResponse, constants, types } from '@item-systems/item'
void Item
void Utils
void SignResponse
void constants
void types
`)
  run('npm', ['install', '--silent', '--save-dev', 'typescript@^5.0.0'])
  run('npx', ['tsc', 'tscheck.ts', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--noEmit'])
  run('npx', ['tsc', 'tscheck.ts', '--module', 'ES2022', '--moduleResolution', 'Bundler', '--target', 'ES2022', '--noEmit'])
  console.log(`packed consumer smoke passed in ${tmp}`)
} finally {
  if (fs.existsSync(tarball)) fs.rmSync(tarball)
}
