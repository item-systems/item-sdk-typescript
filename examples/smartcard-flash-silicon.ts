import { smartcard } from '../src'
import { MockTransport } from '../src/smartcard/transport/mock'

/**
 * Example demonstrating how to use the GlobalPlatform Card Manager and Provisioner
 * subsystem in TypeScript to provision raw silicon (or simulated transport).
 */
async function main() {
  console.log('--- ITEM Smartcard: GlobalPlatform Silicon Provisioning Example ---')

  // Setup KeySet (standard test key set 40..4F)
  const keySet: smartcard.globalplatform.GpKeySet = {
    version: 0x01,
    encKey: smartcard.hexToUint8('404142434445464748494A4B4C4D4E4F'),
    macKey: smartcard.hexToUint8('404142434445464748494A4B4C4D4E4F'),
    dekKey: smartcard.hexToUint8('404142434445464748494A4B4C4D4E4F'),
  }

  // In real deployments on Node.js Desktop with PC/SC reader:
  // import { PcscTransport } from '@item-systems/item/smartcard/transport/desktop'
  // const reader = new smartcard.Reader(new PcscTransport())

  // For illustrative/mock execution:
  const seqCounter = smartcard.hexToUint8('0001')
  const cardChallenge = smartcard.hexToUint8('AABBCCDDEEFF')
  const hostChallenge = smartcard.hexToUint8('1122334455667788')

  const { sEnc } = smartcard.globalplatform.Scp02Session.deriveSessionKeys(
    keySet.encKey,
    keySet.macKey,
    keySet.dekKey,
    seqCounter
  )

  const cardChallenge8 = new Uint8Array(8)
  cardChallenge8.set(seqCounter, 0)
  cardChallenge8.set(cardChallenge, 2)
  const cardCryptogram = smartcard.globalplatform.Scp02Session.calculateCardCryptogram(
    sEnc,
    hostChallenge,
    cardChallenge8
  )

  const initUpdateResp = new Uint8Array([
    ...smartcard.hexToUint8('01020304050607080910'),
    0x01,
    0x02,
    ...seqCounter,
    ...cardChallenge,
    ...cardCryptogram,
    0x90,
    0x00,
  ])

  const transport = new MockTransport([
    new Uint8Array([0x90, 0x00]), // 1. SELECT Card Manager
    initUpdateResp, // 2. INITIALIZE UPDATE
    new Uint8Array([0x90, 0x00]), // 3. EXTERNAL AUTHENTICATE
    new Uint8Array([0x90, 0x00]), // 4. DELETE
    new Uint8Array([0x90, 0x00]), // 5. INSTALL [for load]
    new Uint8Array([0x90, 0x00]), // 6. LOAD
    new Uint8Array([0x90, 0x00]), // 7. INSTALL [for install]
  ])

  const reader = new smartcard.Reader(transport)
  await reader.connect()

  const provisioner = new smartcard.globalplatform.GlobalPlatformProvisioner(reader)

  const topology: smartcard.globalplatform.CapTopologyEntry[] = [
    {
      name: '01_item-javacard',
      packageAid: 'FF6974656D737973030000',
      capBytes: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
      appletAid: 'FF6974656D73797303000000',
      instanceAid: 'FF6974656D73797303000000',
      privileges: '00',
      installParams: '0108100800',
    },
  ]

  console.log('Starting Silicon Provisioning Sequence...')

  await provisioner.provisionTopology(topology, {
    keySet,
    hostChallenge,
    cleanWipeExisting: true,
    existingAidsToDelete: ['FF6974656D737973030000'],
    onProgress: (step, current, total) => {
      console.log(`[${current}/${total}] ${step}`)
    },
  })

  console.log('Silicon Provisioning completed successfully!')
}

main().catch(err => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
