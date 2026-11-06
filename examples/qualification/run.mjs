#!/usr/bin/env node
// Explicit opt-in local harness. Nothing in GitHub Actions invokes this file.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { execFileSync } from 'node:child_process'

const { values } = parseArgs({
  options: {
    cap: { type: 'string' },
    context: { type: 'string' },
    adapter: { type: 'string' },
    output: { type: 'string' },
    runs: { type: 'string', default: '3' },
    'sdk-module': { type: 'string' },
    'allow-card-mutation': { type: 'boolean', default: false },
  },
})
for (const name of ['cap', 'context', 'adapter', 'output']) {
  if (!values[name]) throw new Error(`Required: --${name}`)
}
if (!values['allow-card-mutation'])
  throw new Error('Local qualification may erase a test card. Explicit --allow-card-mutation is required.')
if (!/^[1-9][0-9]{0,3}$/.test(values.runs)) throw new Error('Runs must be 1..9999')
const sdk = await import(
  values['sdk-module'] ? pathToFileURL(resolve(values['sdk-module'])).href : '@item-systems/item/qualification'
)
const context = JSON.parse(await readFile(values.context, 'utf8'))
if (context.schemaVersion !== 1) throw new Error('Unsupported qualification context schema')
const cap = new Uint8Array(await readFile(values.cap))
// Reserve the filename before any hardware access. Never overwrite old evidence.
const output = await import('node:fs/promises').then(fs => fs.open(values.output, 'wx', 0o600))
try {
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const recorder = new sdk.QualificationRecorder({
    artifact: sdk.qualificationArtifact(context.packageAid, cap),
    sourceCommit,
    configuration: context.configuration,
    requiredSteps: context.requiredSteps,
  })
  // Adapter owns card identity checking, exclusive reader lock, baseline restore,
  // GP keys/tunnel auth and real functional assertions. It must never guess keys.
  const adapter = await import(pathToFileURL(resolve(values.adapter)).href)
  if (typeof adapter.run !== 'function')
    throw new Error('Adapter must export run({recorder, cap, configuration, iteration})')
  let aborted = false
  try {
    for (let iteration = 0; iteration < Number(values.runs); iteration++) {
      await adapter.run({ recorder, cap, configuration: context.configuration, iteration })
    }
  } catch {
    recorder.abortRun()
    aborted = true
  }
  const report = recorder.report()
  await output.writeFile(JSON.stringify(report, null, 2) + '\n')
  if (aborted || !report.passed)
    throw new Error('Qualification failed; redacted report retained but cannot be published as qualified')
} finally {
  await output.close()
}
