import { smartcard } from '@item-systems/item'

/**
 * Example: SIO Plugin Management
 *
 * Demonstrates registering, querying, updating, and delegating NDEF execution for
 * Shareable Interface Object (SIO) plugins over the secure tunnel using PluginManager.
 */
async function main() {
  const { CardReader, PcscTransport, SecureChannel, PluginManager, CommandApdu, StatusWord } = smartcard

  // 1. Connect and establish secure channel
  const transport = new PcscTransport()
  const reader = new CardReader(transport)
  await reader.connect()

  const ITEM_APPLET_AID = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x02, 0x01, 0x00, 0x00])
  const selectResp = await reader.sendCommand(new CommandApdu(0x00, 0xa4, 0x04, 0x00, ITEM_APPLET_AID))
  if (selectResp.getSW() !== StatusWord.OK) {
    throw new Error(`Failed to select ItemApplet: SW=0x${selectResp.getSW().toString(16)}`)
  }

  const channel = new SecureChannel(reader)
  await channel.open()

  // 2. Instantiate PluginManager
  const pluginManager = new PluginManager(reader)

  // 3. Register a new SIO plugin instance (e.g. EnclaveApplet or KeyRingCacheApplet)
  const PLUGIN_AID = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00, 0x02, 0x01])
  const uid = 10
  const gid = 1
  const posixMode = 0x01ed // 0755: rwxr-xr-x
  const quotaBlocks = 20 // 20 blocks * 2 KB = 40 KB Flash storage quota

  console.log('Registering SIO plugin...')
  const slotId = await pluginManager.register(PLUGIN_AID, uid, gid, posixMode, quotaBlocks)
  console.log(`Plugin registered successfully into Slot ${slotId}`)

  // 4. Query plugin status and metadata
  const info = await pluginManager.query(slotId)
  if (info) {
    console.log(`Plugin Slot ${info.slotId} Details:`)
    console.log(`  AID         : 0x${Buffer.from(info.aid).toString('hex')}`)
    console.log(`  UID/GID     : ${info.uid}/${info.gid}`)
    console.log(`  POSIX Mode  : 0${info.mode.toString(8)}`)
    console.log(`  Quota       : ${info.quotaBlocks} blocks (${info.quotaBlocks * 2} KB)`)
    console.log(`  H_code Hash : 0x${Buffer.from(info.codeHash).toString('hex')}`)
  }

  // 5. Update permissions / quota
  console.log('Updating plugin quota to 30 blocks (60 KB)...')
  await pluginManager.update(slotId, 0x01c0 /* 0700: rwx------ */, 30)

  // 6. Set as active NDEF provider (if plugin implements NDEF frontend)
  console.log(`Setting Slot ${slotId} as active NDEF provider...`)
  await pluginManager.setActiveNdefProvider(slotId)

  // 7. Cleanup / unregister plugin
  // console.log(`Unregistering plugin Slot ${slotId}...`)
  // await pluginManager.delete(slotId)
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in plugin management:', err)
    process.exit(1)
  })
}
