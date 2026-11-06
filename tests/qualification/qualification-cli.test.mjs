import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sdk = path.join(root, 'dist/esm/qualification.js')
// All adapters in these tests are public-data mocks: no reader/card is accessed.
function fixture(t, failing = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-qualification-cli-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const context = {
    schemaVersion: 1,
    packageAid: 'A000000001',
    requiredSteps: ['verify'],
    configuration: {
      id: 'default',
      installParameters: '',
      cardModel: 'mock',
      javacardVersion: 'mock',
      reader: 'mock',
      transport: 'mock',
      baseline: [],
    },
  }
  fs.writeFileSync(path.join(dir, 'context.json'), JSON.stringify(context))
  fs.writeFileSync(path.join(dir, 'fixture.cap'), 'not a hardware CAP')
  fs.writeFileSync(
    path.join(dir, 'adapter.mjs'),
    `export async function run({recorder}) {
    recorder.beginRun(null);
    await recorder.step('verify', async () => { ${failing ? "throw new Error('SECRET')" : ''} });
    recorder.endRun();
  }`
  )
  const output = path.join(dir, 'report.json')
  const args = [
    path.join(root, 'examples/qualification/run.mjs'),
    '--cap',
    path.join(dir, 'fixture.cap'),
    '--context',
    path.join(dir, 'context.json'),
    '--adapter',
    path.join(dir, 'adapter.mjs'),
    '--output',
    output,
    '--sdk-module',
    sdk,
    '--runs',
    '1',
  ]
  return { args, output, dir, context }
}
test('CLI requires explicit opt-in and refuses output overwrite', t => {
  const f = fixture(t)
  let result = spawnSync(process.execPath, f.args, { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.ok(!fs.existsSync(f.output))
  result = spawnSync(process.execPath, [...f.args, '--allow-card-mutation'], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const report = fs.readFileSync(f.output, 'utf8')
  assert.equal(JSON.parse(report).passed, true)
  result = spawnSync(process.execPath, [...f.args, '--allow-card-mutation'], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.equal(fs.readFileSync(f.output, 'utf8'), report)
})
test('CLI retains redacted failure evidence and exits unsuccessfully', t => {
  const f = fixture(t, true)
  const result = spawnSync(process.execPath, [...f.args, '--allow-card-mutation'], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  const report = fs.readFileSync(f.output, 'utf8')
  assert.equal(JSON.parse(report).passed, false)
  assert.ok(!report.includes('SECRET'))
  assert.ok(!result.stderr.includes('SECRET'))
})
test('SDK report is structurally stable for offline consumers', async t => {
  const f = fixture(t)
  const { QualificationRecorder, qualificationArtifact } = await import(pathToFileURL(sdk))
  const r = new QualificationRecorder({
    ...f.context,
    sourceCommit: 'a'.repeat(40),
    artifact: qualificationArtifact(f.context.packageAid, Uint8Array.of(1)),
  })
  r.beginRun(null)
  await r.step('verify', async () => {})
  r.endRun()
  assert.deepEqual(
    Object.keys(r.report()).sort(),
    [
      'schemaVersion',
      'artifact',
      'sourceCommit',
      'configuration',
      'requiredSteps',
      'passed',
      'runs',
      'memoryProfile',
      'measurementBasis',
    ].sort()
  )
})
