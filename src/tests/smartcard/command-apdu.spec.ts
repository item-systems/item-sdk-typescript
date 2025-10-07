import { CommandApdu } from '../../smartcard/command-apdu'
import { expect } from 'chai'
import { Uint8 } from '../../smartcard/byte'

export class TestCommand extends CommandApdu {
  static readonly CLA = 0x00
  static readonly INS = 0xa4
  static readonly P1 = 0x11
  static readonly P2 = 0x22

  constructor(data: Uint8Array) {
    super(TestCommand.CLA, TestCommand.INS, TestCommand.P1, TestCommand.P2, data.length as Uint8, data)
  }
}

describe('CommandAPDU', () => {
  it('can be constructed', () => {
    const data = Uint8Array.from([55, 66])
    const tc = new TestCommand(data)
    expect(tc.getHeader()).to.deep.equal(
      Uint8Array.from([TestCommand.CLA, TestCommand.INS, TestCommand.P1, TestCommand.P2])
    )
    expect(tc.getData()).to.deep.equal(data)
  })

  it('can be created from an array', async () => {
    const rawAPDU = new TestCommand(Uint8Array.from([55, 66])).toArray()
    const command = CommandApdu.fromArray(rawAPDU)
    expect(command.toArray()).to.deep.equal(rawAPDU)
  })
})
