/** Opt-in hardware adapter; public diagnostic cards only. No automatic retry. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

export function createTransport({ passwordQualification = false } = {}) {
  const uid = process.env.ITEM_TEST_UID?.toUpperCase()
  assert.match(uid ?? '', /^(?:[0-9A-F]{2}){4,10}$/, 'Set ITEM_TEST_UID to the authorized physical card UID')
  let child = null
  let pending = null
  let exited = null
  function fail(error) {
    if (pending) {
      clearTimeout(pending.timer)
      pending.reject(error)
      pending = null
    }
  }
  function receive() {
    assert.equal(pending, null, 'Bridge commands must be serialized')
    return new Promise((resolve, reject) => {
      pending = { resolve, reject, timer: setTimeout(() => {
        fail(new Error('PC/SC response timed out; outcome unknown, do not replay'))
        child?.kill()
      }, 45000) }
    })
  }
  const transport = {
    async connect() {
      assert.equal(child, null)
      child = spawn(process.env.ITEM_TEST_PYTHON || 'python3', [
        fileURLToPath(new URL('./omni-bridge.py', import.meta.url)), '--uid', uid,
        '--reader', process.env.ITEM_TEST_READER || 'Identiv uTrust 3700 F CL Reader',
        ...(passwordQualification ? ['--password-qualification'] : []),
      ], { stdio: ['pipe', 'pipe', 'inherit'] })
      const ready = receive()
      exited = new Promise(resolve => child.once('close', resolve))
      child.on('error', fail)
      child.stdin.on('error', fail)
      child.on('exit', code => fail(new Error(`PC/SC bridge exited (${code})`)))
      const lines = createInterface({ input: child.stdout })
      lines.on('line', line => {
        try {
          const message = JSON.parse(line)
          assert.ok(pending, 'Unexpected bridge message')
          const waiter = pending
          pending = null
          clearTimeout(waiter.timer)
          waiter.resolve(message)
        } catch (error) { fail(error); child?.kill() }
      })
      const response = await ready
      assert.equal(response.ready, true)
      assert.equal(response.uid, uid)
      return true
    },
    async transmit(bytes) {
      assert.ok(child)
      const answer = receive()
      child.stdin.write(JSON.stringify({ command: Buffer.from(bytes).toString('hex') }) + '\n')
      const { response } = await answer
      assert.match(response, /^(?:[0-9a-f]{2}){2,}$/)
      return new Uint8Array(Buffer.from(response, 'hex'))
    },
    async assertAbsent(aid) {
      // JCOP can forward an unmatched SELECT to the currently selected ITEM
      // applet, which answers 6A86. Select the ISD first so an absent target is
      // reported by the platform, not inferred from an applet handler's error.
      // This is SELECT only: no GP authentication, LOAD, INSTALL or DELETE.
      const isd = Buffer.from('00a4040008a000000151000000', 'hex')
      const selected = await this.transmit(isd)
      assert.equal(Buffer.from(selected).subarray(-2).toString('hex'), '9000', 'Cannot select ISD for absence check')
      const bytes = Buffer.from(aid, 'hex')
      const response = await this.transmit(Buffer.concat([Buffer.from([0, 0xA4, 4, 0, bytes.length]), bytes]))
      assert.equal(Buffer.from(response).toString('hex'), '6a82',
        'Cannot prove r1 is absent (require 6A82); a preinstalled applet would invalidate this test')
    },
    async disconnect() {
      if (!child) return
      child.stdin.end()
      const timer = setTimeout(() => child?.kill(), 2000)
      try { await exited } finally { clearTimeout(timer); child = null }
    },
  }
  return transport
}
