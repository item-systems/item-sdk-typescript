import { expect } from 'chai'
import { Scp02Session, GpSecurityLevel } from '../../src/smartcard/globalplatform/scp02'
import { Scp03Session } from '../../src/smartcard/globalplatform/scp03'
import { GlobalPlatformCardManager } from '../../src/smartcard/globalplatform/card-manager'
import { Reader } from '../../src/smartcard/reader'
import { MockTransport } from '../../src/smartcard/transport/mock'

describe('GlobalPlatform INSTALL response-length framing', () => {
  for (const protocol of ['SCP02', 'SCP03']) {
    for (const level of [GpSecurityLevel.C_MAC, GpSecurityLevel.C_DECRYPTION_AND_C_MAC]) {
      const session = () => {
        const key = () => Uint8Array.from({ length: 16 }, (_, i) => 0x40 + i)
        return protocol === 'SCP02'
          ? new Scp02Session(key(), key(), key(), level)
          : new Scp03Session(key(), key(), key(), key(), level)
      }
      it(protocol + ' preserves Le outside MAC/encryption at level ' + level, () => {
        const command = new Uint8Array([0x80, 0xe6, 0x0c, 0, 2, 0xc9, 0])
        const without = session().wrap(command)
        for (const le of [0, 0x20]) {
          const withLe = session().wrap(new Uint8Array([...command, le]))
          expect(Array.from(withLe)).to.deep.equal([...without, le])
          expect(withLe.length).to.equal(6 + withLe[4])
        }
      })
    }
  }
  it('constructs INSTALL as case 4 with Le=00 and unchanged C9 parameters', async () => {
    let sent = new Uint8Array(0)
    class Capture extends MockTransport {
      async transmit(bytes: Uint8Array): Promise<Uint8Array> {
        sent = bytes
        return new Uint8Array([0x90, 0])
      }
    }
    const reader = new Reader(new Capture([]))
    await reader.connect()
    const manager = new GlobalPlatformCardManager(reader)
    await manager.installAndMakeSelectable(
      'FF6974656D737973030000',
      'FF6974656D73797303000000',
      'FF6974656D73797303000000',
      '00',
      '08'
    )
    expect(sent.length).to.equal(6 + sent[4])
    expect(Array.from(sent.slice(-6))).to.deep.equal([3, 0xc9, 1, 8, 0, 0])
    const key = new Uint8Array(16).fill(0x40)
    const wrapped = new Scp02Session(key, key, key).wrap(sent)
    expect(wrapped.length).to.equal(59)
    expect(wrapped[wrapped.length - 1]).to.equal(0)
  })
})
