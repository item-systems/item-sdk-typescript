import * as fs from 'fs'
import { smartcard } from '@item-systems/item'

/**
 * Example: In-Band CAP Bytecode Streaming
 *
 * Demonstrates streaming a compiled JavaCard CAP binary into on-card Flash memory
 * over the encrypted secure tunnel (INS 0x30) using InBandBytecodeLoader.
 */
async function main() {
  const { CardReader, PcscTransport, SecureChannel, InBandBytecodeLoader, CommandApdu, StatusWord } = smartcard

  // 1. Initialize reader and connect
  const transport = new PcscTransport()
  const reader = new CardReader(transport)
  await reader.connect()

  // 2. Select Microkernel ItemApplet (AID: FF6974656D73797302010000)
  const ITEM_APPLET_AID = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x02, 0x01, 0x00, 0x00])
  const selectResp = await reader.sendCommand(new CommandApdu(0x00, 0xa4, 0x04, 0x00, ITEM_APPLET_AID))

  if (selectResp.getSW() !== StatusWord.OK) {
    throw new Error(`Failed to select ItemApplet: SW=0x${selectResp.getSW().toString(16)}`)
  }

  // 3. Establish E2E Secure Channel v1 session
  const channel = new SecureChannel(reader)
  await channel.open()
  console.log('Secure tunnel established successfully.')

  // 4. Prepare CAP file and package AID
  const capFilePath = process.env.CAP_FILE_PATH || 'path/to/my-plugin.cap'
  if (!fs.existsSync(capFilePath)) {
    console.warn(`CAP file not found at ${capFilePath}. Provide valid CAP_FILE_PATH in environment.`)
    return
  }

  const capBytes = fs.readFileSync(capFilePath)
  const packageAid = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00, 0x05])

  // 5. Stream CAP file in-band
  const loader = new InBandBytecodeLoader(reader)
  console.log(`Streaming ${capBytes.length} bytes in-band...`)

  const verifiedCodeHash = await loader.streamCap(capBytes, packageAid, (streamed, total) => {
    const percent = Math.round((streamed / total) * 100)
    process.stdout.write(`\rProgress: ${streamed}/${total} bytes (${percent}%)`)
  })

  console.log('\nBytecode streaming committed successfully!')
  console.log(`Verified On-Card Bytecode Hash (H_code): 0x${Buffer.from(verifiedCodeHash).toString('hex')}`)
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in bytecode streaming:', err)
    process.exit(1)
  })
}
