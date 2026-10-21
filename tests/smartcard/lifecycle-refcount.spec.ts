import { expect } from 'chai'
import { StatusWord } from '../../src/smartcard/statusword'
import {
  MasterKeyStatsCommand,
  MasterKeySetPolicyCommand,
  MasterKeyDeleteCommand,
  KeyRingSetPolicyCommand,
  KeyRingDeleteCommand,
  KeyRingDeriveCommand,
} from '../../src/smartcard/command-apdu'
import { MasterKeyStatsResponse } from '../../src/smartcard/reponse-apdu'
import { MicrokernelResourceFlags } from '../../src/smartcard/types'

describe('Smartcard v3.5 Lifecycle, RefCounting, and Deprecation APDUs', () => {
  describe('StatusWord enum extensions', () => {
    it('defines correct status words for refcounting and deprecation', () => {
      expect(StatusWord.RESOURCE_IN_USE).to.equal(0x6a18)
      expect(StatusWord.RESOURCE_DEPRECATED).to.equal(0x6a19)
      expect(StatusWord.COMMAND_NOT_ALLOWED).to.equal(0x6986)
      expect(StatusWord.POSIX_PERMISSION_DENIED).to.equal(0x6987)
      expect(StatusWord.CAPABILITY_REQUIRED).to.equal(0x6988)
      expect(StatusWord.AUTHENTICATION_POLICY_FAILED).to.equal(0x6989)
    })
  })

  describe('Microkernel Command APDUs', () => {
    it('constructs MasterKeyStatsCommand correctly', () => {
      const cmd = new MasterKeyStatsCommand()
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80)
      expect(arr[1]).to.equal(0x15)
      expect(arr[2]).to.equal(0x00)
      expect(arr[3]).to.equal(0x00)
      expect(arr[4]).to.equal(0x00)
    })

    it('constructs MasterKeySetPolicyCommand with deprecation flag', () => {
      const cmd = new MasterKeySetPolicyCommand(1, MicrokernelResourceFlags.DEPRECATED)
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80) // CLA
      expect(arr[1]).to.equal(0x24) // INS_MASTERKEY_SET_POLICY
      expect(arr[2]).to.equal(1) // P1 (slotId)
      expect(arr[3]).to.equal(0) // P2
      expect(arr[4]).to.equal(2) // Lc
      expect(arr[5]).to.equal(0x80) // flags MSB
      expect(arr[6]).to.equal(0x00) // flags LSB
    })

    it('constructs MasterKeyDeleteCommand correctly', () => {
      const cmd = new MasterKeyDeleteCommand(2)
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80)
      expect(arr[1]).to.equal(0x19) // INS_MASTERKEY_DELETE
      expect(arr[2]).to.equal(2) // slotId
      expect(arr[3]).to.equal(0)
      expect(arr[4]).to.equal(0)
    })

    it('constructs KeyRingSetPolicyCommand with deprecation flag', () => {
      const cmd = new KeyRingSetPolicyCommand(3, MicrokernelResourceFlags.DEPRECATED)
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80)
      expect(arr[1]).to.equal(0x6b) // INS_KEYRING_SET_POLICY
      expect(arr[2]).to.equal(3) // ringId
      expect(arr[3]).to.equal(0)
      expect(arr[4]).to.equal(2)
      expect(arr[5]).to.equal(0x80)
      expect(arr[6]).to.equal(0x00)
    })

    it('constructs KeyRingDeleteCommand correctly', () => {
      const cmd = new KeyRingDeleteCommand(4)
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80)
      expect(arr[1]).to.equal(0x6a) // INS_KEYRING_DELETE
      expect(arr[2]).to.equal(4)
      expect(arr[3]).to.equal(0)
      expect(arr[4]).to.equal(0)
    })

    it('constructs KeyRingDeriveCommand correctly', () => {
      const path = new Uint8Array([0x80, 0x00, 0x00, 0x2c]) // m/44'
      const cmd = new KeyRingDeriveCommand(1, 0, path)
      const arr = cmd.toArray()
      expect(arr[0]).to.equal(0x80)
      expect(arr[1]).to.equal(0x13) // INS_KEYRING_DERIVE
      expect(arr[2]).to.equal(1) // cryptoEngine
      expect(arr[3]).to.equal(0) // masterSlot
      expect(arr[4]).to.equal(4) // Lc
      expect(arr.slice(5)).to.deep.equal(path)
    })
  })

  describe('MasterKeyStatsResponse', () => {
    it('parses MasterKeyStats with refCount, flags, and deprecation status', () => {
      // Mock response: 1 record
      // count (1B) = 1
      // Record: slotId(1)=0, isAnchor(1)=1, anchorSlot(1)=1, uid(2)=0, gid(2)=0, mode(2)=0x01ED, refCount(2)=3, flags(2)=0x8000 (deprecated), ringCount(1)=2, ringIds=[0, 1]
      // SW(2) = 0x9000
      const payload = new Uint8Array([
        1, // count
        0, // slotId = 0
        1, // isAnchor = true
        1, // anchorSlot = 1
        0x00,
        0x00, // uid = 0
        0x00,
        0x00, // gid = 0
        0x01,
        0xed, // mode = 0x01ED
        0x00,
        0x03, // refCount = 3
        0x80,
        0x00, // flags = 0x8000 (deprecated)
        2, // ringCount = 2
        0,
        1, // ringIds = [0, 1]
        0x90,
        0x00, // SW_SUCCESS
      ])

      const resp = new MasterKeyStatsResponse(payload)
      expect(resp.getSW()).to.equal(StatusWord.OK)
      const stats = resp.getStats()
      expect(stats).to.have.lengthOf(1)
      expect(stats[0]).to.deep.equal({
        slotId: 0,
        isTunnelAnchor: true,
        tunnelCryptoSlot: 1,
        ownerUid: 0,
        ownerGid: 0,
        posixMode: 0x01ed,
        refCount: 3,
        flags: 0x8000,
        isDeprecated: true,
        ringCount: 2,
        ringIds: [0, 1],
      })
    })

    it('handles empty MasterKeyStats response when no master keys are present', () => {
      const payload = new Uint8Array([0x6a, 0x10]) // SW_NO_MASTER_KEY_PRESENT
      const resp = new MasterKeyStatsResponse(payload)
      expect(resp.getSW()).to.equal(StatusWord.NO_MASTER_KEY_PRESENT)
      expect(resp.getStats()).to.deep.equal([])
    })
  })
})
