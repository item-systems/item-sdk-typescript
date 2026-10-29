import test from 'node:test'
import assert from 'node:assert/strict'
import { CardError, UacManager, UacCapability } from '@item-systems/item/mobile'

test('UAC query recognizes current and legacy absence without retrying', async () => {
  for (const status of [0x6a83, 0x6a88]) {
    const calls = []
    const manager = new UacManager({ tunnel: async (...args) => {
      calls.push(args)
      throw new CardError(status)
    } })
    assert.equal(await manager.query(127), null)
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].slice(0, 3), [0x81, 0, 127])
  }
})

test('UAC query preserves security and transport failures', async () => {
  for (const error of [new CardError(0x6982), new CardError(0x6f00), new Error('Disconnected')]) {
    let calls = 0
    const manager = new UacManager({ tunnel: async () => { calls++; throw error } })
    await assert.rejects(manager.query(127), e => e === error)
    assert.equal(calls, 1)
  }
})

test('UAC uses firmware capability bits and query-only current principal selector', async () => {
  const expected = { NONE: 0, CREATE_MASTER_KEY: 1, SELECT_TUNNEL_MASTERKEY: 2,
    PROVISION_ENCLAVE: 4, CONFIGURE_STORAGE: 8, CRYPTO_CREATE_ENGINE: 16,
    CRYPTO_LOAD_BYTECODE: 32, MANAGE_IDENTITIES: 64, KEYRING_PURGE_NONCES: 128,
    CONFIGURE_SYSTEM: 256, CRYPTO_EXECUTE: 512, CREATE_KEYRING: 1024,
    MANAGE_PLUGINS: 2048, ALL_PRIVILEGES: 65535 }
  for (const [name, mask] of Object.entries(expected)) assert.equal(UacCapability[name], mask, name)
  for (const obsolete of ['DERIVE_KEY', 'CRYPTO_DEPRECATE_ENGINE', 'CRYPTO_DELETE_ENGINE'])
    assert.equal(UacCapability[obsolete], undefined, 'must not assign an unrelated privilege')
  const calls = []
  const manager = new UacManager({ tunnel: async (...args) => {
    calls.push(args)
    return args[0] === 0x81 ? Uint8Array.of(0, 7, 0, 64, 1, 1, 1) : new Uint8Array()
  } })
  await manager.create(7, UacCapability.MANAGE_IDENTITIES)
  assert.deepEqual(calls[0], [0x80, 0, 1, Uint8Array.of(0, 7, 0, 64, 1)])
  assert.equal((await manager.current()).uid, 7)
  assert.deepEqual(calls[1].slice(0, 3), [0x81, 255, 255])
  assert.throws(() => manager.update(0xffff, 0, 1, 1))
  assert.throws(() => manager.create(128))
  assert.throws(() => manager.create(7, 0, 1, 2))
  assert.throws(() => manager.create(7, -1))
  assert.equal(calls.length, 2)
})

test('UAC rejects malformed or mismatched successful query responses', async () => {
  for (const data of [[], [0, 7, 0, 64, 1, 1], [0, 7, 0, 64, 1, 1, 1, 0],
    [0, 8, 0, 64, 1, 1, 1], [0, 7, 0, 64, 0, 1, 1], [0, 7, 0, 64, 1, 0, 1],
    [0, 7, 0, 64, 1, 1, 5]]) {
    const manager = new UacManager({ tunnel: async () => Uint8Array.from(data) })
    await assert.rejects(manager.query(7))
  }
})

test('UAC never invents an allocated credential slot after a malformed response', async () => {
  for (const data of [[], [4], [0, 1]]) {
    const manager = new UacManager({ tunnel: async () => Uint8Array.from(data) })
    await assert.rejects(manager.addCredential(7, 3, new Uint8Array(66)))
  }
})

test('valid UAC CRUD encodes exact firmware APDUs', async () => {
  const calls = []
  const manager = new UacManager({ tunnel: async (...args) => {
    calls.push(args)
    return args[0] === 0x84 ? Uint8Array.of(2) : new Uint8Array()
  } })
  await manager.update(127, 0x40, 3, 2)
  await manager.addCredential(127, 4, Uint8Array.of(0, 7))
  await manager.removeCredential(127, 2)
  await manager.delete(127)
  assert.deepEqual(calls, [
    [0x82, 0, 127, Uint8Array.of(0, 64, 3, 2)],
    [0x84, 0, 127, Uint8Array.of(4, 0, 7)],
    [0x85, 0, 127, Uint8Array.of(2)],
    [0x83, 0, 127, new Uint8Array()],
  ])
})
