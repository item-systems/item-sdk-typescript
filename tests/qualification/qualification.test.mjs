import test from 'node:test'
import assert from 'node:assert/strict'
import { QualificationRecorder, qualificationArtifact, qualificationSnapshot } from '@item-systems/item/qualification'

const context = () => ({
  artifact: qualificationArtifact('A000000001', Uint8Array.of(1, 2, 3)),
  sourceCommit: 'a'.repeat(40),
  configuration: {
    id: 'default',
    installParameters: '',
    cardModel: 'J3R180',
    javacardVersion: '3.0.5',
    reader: 'Omni',
    transport: 'PCSC',
    baseline: [],
  },
  requiredSteps: ['install', 'functional-check'],
})
const memory = (free = 10000) => ({
  persistentFreeBytes: free,
  transientResetFreeBytes: 1024,
  transientDeselectFreeBytes: 1024,
  unusedCommitBytes: 500,
  leasedBlocks: 2,
})
async function successful(recorder, before = memory()) {
  recorder.beginRun(before)
  await recorder.step('install', async () => {})
  recorder.sample(memory(8000))
  await recorder.step('functional-check', async () => {})
  recorder.endRun()
}
test('hashes CAP and records bounded public observations without promoting them to measured peaks', async () => {
  let now = 0
  const r = new QualificationRecorder(context(), () => ++now)
  await successful(r)
  const report = r.report()
  assert.equal(report.passed, true)
  assert.equal(report.artifact.sha256, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81')
  const profile = report.memoryProfile.configurations[0]
  assert.equal(profile.measurement.method, 'estimated')
  assert.equal(profile.requirements.peakAdditionalPersistentBytes, 2000)
  assert.equal(profile.requirements.peakTransactionBytes, undefined)
  assert.equal(profile.requirements.largestPersistentAllocationBytes, undefined)
  assert.equal(report.runs[0].steps[0].durationMs, 1)
  report.runs[0].steps[0].passed = false
  assert.equal(r.report().passed, true)
})
test('failed operations are not retried, retain no error text or return values, and prevent a profile', async () => {
  const r = new QualificationRecorder(context())
  r.beginRun(memory())
  let count = 0
  await assert.rejects(
    r.step('install', async () => {
      count++
      throw new Error('SECRET')
    })
  )
  r.endRun()
  assert.equal(count, 1)
  assert.equal(r.report().passed, false)
  assert.equal(r.report().memoryProfile, null)
  assert.ok(!JSON.stringify(r.report()).includes('SECRET'))
})
test('unknown baseline and missing samples stay unknown; mixed null samples omit the metric', async () => {
  const r = new QualificationRecorder(context())
  await successful(r, null)
  assert.equal(r.report().memoryProfile, null)
  const r2 = new QualificationRecorder(context())
  await successful(r2)
  r2.beginRun(memory())
  r2.sample({ ...memory(), persistentFreeBytes: null })
  for (const name of context().requiredSteps) await r2.step(name, async () => {})
  r2.endRun()
  assert.equal(r2.report().memoryProfile.configurations[0].requirements.peakAdditionalPersistentBytes, undefined)
})
test('required coverage cannot be bypassed by ending an empty run', () => {
  const r = new QualificationRecorder(context())
  r.beginRun(memory())
  assert.throws(() => r.report())
  assert.throws(() => r.beginRun(memory()))
  r.endRun()
  assert.equal(r.report().passed, false)
})
test('harness failure after completing functional steps still marks the report failed', async () => {
  const r = new QualificationRecorder(context())
  await successful(r)
  r.abortRun()
  assert.equal(r.report().passed, false)
  assert.equal(r.report().memoryProfile, null)
})
test('rejects invalid configuration and strips extra snapshot properties', () => {
  assert.throws(() => new QualificationRecorder({ ...context(), requiredSteps: [] }))
  assert.throws(() => new QualificationRecorder({ ...context(), sourceCommit: 'main' }))
  assert.throws(() => qualificationSnapshot({ ...memory(), persistentFreeBytes: NaN }))
  assert.deepEqual(qualificationSnapshot({ ...memory(), pin: 'SECRET' }), memory())
})
test('refuses concurrent steps, repeated names, and nonmonotonic timing', async () => {
  const r = new QualificationRecorder(context(), () => 5)
  r.beginRun(memory())
  let finish
  const pending = r.step(
    'install',
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )
  await assert.rejects(r.step('functional-check', async () => {}))
  assert.throws(() => r.endRun())
  finish()
  await pending
  await assert.rejects(r.step('install', async () => {}))
  let now = 10
  const bad = new QualificationRecorder(context(), () => --now)
  bad.beginRun(memory())
  await assert.rejects(
    bad.step('install', async () => {}),
    /clock/
  )
  bad.endRun()
  assert.equal(bad.report().passed, false)
})
