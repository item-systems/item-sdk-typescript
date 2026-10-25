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
  run('npm', ['install', '--silent', '--install-strategy=nested', '--ignore-scripts', '--omit=optional', tarball])

  const installed = path.join(tmp, 'node_modules/@item-systems/item')
  for (const file of [
    'skills/item-sdk-typescript/SKILL.md',
    'skills/item-sdk-typescript/references/firmware-workflows.md',
    'docs-src/DOCS_INDEX.md',
    'CHANGELOG.md',
  ]) {
    if (!fs.readFileSync(path.join(installed, file), 'utf8').trim()) throw new Error(`Missing bundled guide: ${file}`)
  }
  fs.copyFileSync(path.join(installed, 'examples/mobile-inspect.ts'), path.join(tmp, 'mobile-inspect.ts'))

  fs.writeFileSync(
    path.join(tmp, 'esm.mjs'),
    `
import { Item, Utils, constants, types, smartcard } from '@item-systems/item'
import { ItemSecureTunnel, MicrokernelClient } from '@item-systems/item/mobile'
import * as gp from '@item-systems/item/globalplatform'
import * as sc from '@item-systems/item/smartcard'
if (!Item || !Utils || !constants || !types || !smartcard) throw new Error('missing ESM public exports')
if (!ItemSecureTunnel || !MicrokernelClient) throw new Error('missing mobile ESM exports')
if (!gp.GlobalPlatformCardManager || !gp.GlobalPlatformProvisioner || !gp.Scp02Session || !gp.Scp03Session) throw new Error('missing ./globalplatform subpath exports')
if (!sc.IdentityManager || !sc.PluginManager || !sc.InBandBytecodeLoader) throw new Error('missing ./smartcard subpath exports')
console.log('esm ok')
`
  )
  run('node', ['esm.mjs'])

  fs.writeFileSync(
    path.join(tmp, 'cjs.cjs'),
    `
const { Item, Utils, constants, types, smartcard } = require('@item-systems/item')
const { ItemSecureTunnel, MicrokernelClient } = require('@item-systems/item/mobile')
const gp = require('@item-systems/item/globalplatform')
const sc = require('@item-systems/item/smartcard')
if (!Item || !Utils || !constants || !types || !smartcard) throw new Error('missing CJS public exports')
if (!ItemSecureTunnel || !MicrokernelClient) throw new Error('missing mobile CJS exports')
if (!gp.GlobalPlatformCardManager || !gp.GlobalPlatformProvisioner || !gp.Scp02Session || !gp.Scp03Session) throw new Error('missing ./globalplatform subpath exports')
if (!sc.IdentityManager || !sc.PluginManager || !sc.InBandBytecodeLoader) throw new Error('missing ./smartcard subpath exports')
console.log('cjs ok')
`
  )
  run('node', ['cjs.cjs'])

  fs.writeFileSync(
    path.join(tmp, 'tscheck.ts'),
    `
import { Item, Utils, constants, types, smartcard } from '@item-systems/item'
import { ItemSecureTunnel, MicrokernelClient, type CardTransport } from '@item-systems/item/mobile'
import { GlobalPlatformCardManager, GlobalPlatformProvisioner } from '@item-systems/item/globalplatform'
import { IdentityManager, PluginManager } from '@item-systems/item/smartcard'
void Item
void Utils
void constants
void types
void smartcard
void ItemSecureTunnel
void MicrokernelClient
const transport: CardTransport | undefined = undefined
void transport
void GlobalPlatformCardManager
void GlobalPlatformProvisioner
void IdentityManager
void PluginManager
`
  )
  // Release workflows set NODE_ENV=production. Explicitly retain compiler dev
  // dependencies and execute that installed compiler; never let npx fetch "tsc".
  run('npm', [
    'install',
    '--silent',
    '--include=dev',
    '--ignore-scripts',
    '--save-dev',
    'typescript@^5.0.0',
    '@types/node@^22.0.0',
  ])
  const compiler = path.join(tmp, 'node_modules/typescript/bin/tsc')
  run(process.execPath, [
    compiler,
    'tscheck.ts',
    'mobile-inspect.ts',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2022',
    '--noEmit',
  ])
  run(process.execPath, [
    compiler,
    'tscheck.ts',
    'mobile-inspect.ts',
    '--module',
    'ES2022',
    '--moduleResolution',
    'Bundler',
    '--target',
    'ES2022',
    '--noEmit',
  ])
  console.log(`packed consumer smoke passed in ${tmp}`)
} finally {
  if (fs.existsSync(tarball)) fs.rmSync(tarball)
}
