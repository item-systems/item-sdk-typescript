import { expect } from 'chai'
import { IdentityManager } from '../../src/smartcard/identity-manager'
import { MockTransport } from '../../src/smartcard/transport/mock'
import { Reader } from '../../src/smartcard/reader'
import { NativeNfcTransceiver } from '../../src/smartcard/transport/mobile'
import { GlobalPlatformProvisioner } from '../../src/smartcard/globalplatform/provisioner'
import { AuthPolicy, AuthCredentialType, UacCapability } from '../../src/smartcard/types'
import { hexToUint8 } from '../../src/smartcard/utils'

describe('User Access Control (UAC) IdentityManager and Mobile Transport', () => {
  it('creates, queries, updates, adds credentials, and deletes identities via Tunnel APDUs', async () => {
    // 1. IdentityCreateResponse: SW 9000
    const createResp = hexToUint8('9000')

    // 2. IdentityQueryResponse: [id(2B): 0001] [active(1B): 01] [policy(1B): 01] [thresh(1B): 01] [caps(2B): 0040] [numCreds(1B): 01]
    //    [credType(1B): 01] [algo(1B): 01] [vLen(1B): 04] [keyRef(2B): 0000] [owner(1B): 01] [vData(4B): 01020304] + SW 9000
    const queryResp = hexToUint8('0001010101004001010104000001010203049000')

    // 3. IdentityUpdateResponse: SW 9000
    const updateResp = hexToUint8('9000')

    // 4. AddCredentialResponse: SW 9000
    const addCredResp = hexToUint8('9000')

    // 5. RemoveCredentialResponse: SW 9000
    const remCredResp = hexToUint8('9000')

    // 6. DeleteIdentityResponse: SW 9000
    const deleteResp = hexToUint8('9000')

    const transport = new MockTransport([createResp, queryResp, updateResp, addCredResp, remCredResp, deleteResp])

    const reader = new Reader(transport)
    await reader.connect()
    const identityManager = new IdentityManager(reader)

    // 1. Create Identity
    await identityManager.createIdentity(1, UacCapability.MANAGE_IDENTITIES, AuthPolicy.ANY_OF, 1, [
      {
        type: AuthCredentialType.ASYMMETRIC,
        algorithmId: 1,
        verificationData: hexToUint8('01020304'),
      },
    ])

    // 2. Query Identity
    const info = await identityManager.queryIdentity(1)
    expect(info).to.not.equal(null)
    expect(info?.identityId).to.equal(1)
    expect(info?.active).to.equal(true)
    expect(info?.authPolicy).to.equal(AuthPolicy.ANY_OF)
    expect(info?.capabilities).to.equal(UacCapability.MANAGE_IDENTITIES)
    expect(info?.credentialCount).to.equal(1)
    expect(info?.credentials.length).to.equal(1)
    expect(info?.credentials[0].type).to.equal(AuthCredentialType.ASYMMETRIC)
    expect(info?.credentials[0].algorithmId).to.equal(1)

    // 3. Update Identity
    await identityManager.updateIdentity(1, UacCapability.ALL_PRIVILEGES, AuthPolicy.ALL_OF, 2)

    // 4. Add Credential
    await identityManager.addCredential(1, AuthCredentialType.PIN, 0, hexToUint8('12345678'))

    // 5. Remove Credential
    await identityManager.removeCredential(1, 0)

    // 6. Delete Identity
    await identityManager.deleteIdentity(1)

    // Dispose
    await reader.dispose()
    expect(reader.connected()).to.equal(false)
  })

  it('provisions GlobalPlatform over MobileNfcTransport and supports factory disposal', async () => {
    let closed = false
    const transceiver: NativeNfcTransceiver = {
      async transceive(commandApdu: Uint8Array): Promise<Uint8Array> {
        // SELECT ISD response
        if (commandApdu[1] === 0xa4) {
          return hexToUint8('9000')
        }
        return hexToUint8('6d00')
      },
      async close(): Promise<void> {
        closed = true
      },
    }

    const provisioner = GlobalPlatformProvisioner.forMobile(transceiver)
    const cardManager = provisioner.getCardManager()
    await provisioner.getReader().connect()

    const selectResp = await cardManager.selectCardManager()
    expect(selectResp[selectResp.length - 2]).to.equal(0x90)
    expect(selectResp[selectResp.length - 1]).to.equal(0x00)

    await provisioner.dispose()
    expect(closed).to.equal(true)
  })
})
