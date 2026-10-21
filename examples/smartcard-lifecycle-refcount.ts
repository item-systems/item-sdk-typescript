import { smartcard } from '@item-systems/item'

/**
 * Example: v3.5 Microkernel Resource Lifecycle & RefCounting
 *
 * Demonstrates inspecting MasterKey statistics, monitoring reference counts across
 * derived KeyRings, and initiating graceful deprecation policies.
 */
async function main() {
  const {
    CardReader,
    PcscTransport,
    SecureChannel,
    MasterKeyStatsCommand,
    MasterKeyStatsResponse,
    MasterKeySetPolicyCommand,
    MasterKeyDeleteCommand,
    KeyRingSetPolicyCommand,
    MicrokernelResourceFlags,
    TunnelCommand,
    CommandApdu,
    ResponseAPDU,
    StatusWord,
  } = smartcard

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

  // Helper to send tunneled APDU (INS 0x30)
  async function sendTunneled(cmd: smartcard.CommandApdu): Promise<ResponseAPDU> {
    const tunnel = new TunnelCommand(cmd.toArray())
    const resp = await reader.sendCommand(tunnel)
    return new ResponseAPDU(resp.getData())
  }

  // 2. Query MasterKey statistics and reference counts
  console.log('Querying MasterKey statistics...')
  const statsResp = await sendTunneled(new MasterKeyStatsCommand())
  if (statsResp.getSW() !== StatusWord.OK) {
    throw new Error(`MasterKey stats query failed: SW=0x${statsResp.getSW().toString(16)}`)
  }

  const parsedStats = new MasterKeyStatsResponse(statsResp.toArray())
  console.log(`Found ${parsedStats.getKeyCount()} MasterKey(s) on-card:`)

  for (const key of parsedStats.getKeys()) {
    console.log(`\nMasterKey Slot ${key.slotId}:`)
    console.log(`  Reference Count   : ${key.refCount} (active derived rings / tunnel anchors)`)
    console.log(`  Policy Flags      : 0x${key.flags.toString(16).padStart(4, '0')}`)
    console.log(`  Is Deprecated     : ${key.isDeprecated}`)
    console.log(`  Is Tunnel Anchor  : ${key.isTunnelAnchor}`)
    console.log(`  Tunnel Crypto Slot: ${key.tunnelCryptoSlot}`)
    console.log(`  POSIX UID/GID     : ${key.ownerUid}/${key.ownerGid}`)
    console.log(`  POSIX Mode        : 0${key.posixMode.toString(8)}`)
    console.log(`  Bound KeyRings    : [${key.ringIds.join(', ')}]`)
  }

  // 3. Graceful Deprecation: Mark MasterKey 0 as DEPRECATED
  // (Existing active sessions remain valid, but new derivations will be rejected with SW_RESOURCE_DEPRECATED)
  const masterSlotToDeprecate = 0
  console.log(`\nDeprecating MasterKey Slot ${masterSlotToDeprecate}...`)
  const deprecateCmd = new MasterKeySetPolicyCommand(masterSlotToDeprecate, MicrokernelResourceFlags.FLAG_DEPRECATED)
  const deprecateResp = await sendTunneled(deprecateCmd)

  if (deprecateResp.getSW() === StatusWord.OK) {
    console.log(`MasterKey ${masterSlotToDeprecate} successfully marked DEPRECATED.`)
  }

  // 4. Verify Reference-Counted Invariant: Deletion Rejection
  // Attempting to delete a key with refCount > 0 is rejected fail-closed
  console.log(`\nAttempting deletion of MasterKey Slot ${masterSlotToDeprecate}...`)
  const deleteCmd = new MasterKeyDeleteCommand(masterSlotToDeprecate)
  const deleteResp = await sendTunneled(deleteCmd)

  if (deleteResp.getSW() === StatusWord.RESOURCE_IN_USE) {
    console.log(`Protected: Deletion correctly rejected with SW_RESOURCE_IN_USE (0x6A18) because refCount > 0.`)
  } else if (deleteResp.getSW() === StatusWord.OK) {
    console.log(`MasterKey ${masterSlotToDeprecate} deleted successfully (refCount was 0).`)
  } else {
    console.log(`Deletion response SW: 0x${deleteResp.getSW().toString(16)}`)
  }

  // 5. Deprecate a specific KeyRing
  const targetRingId = 1
  console.log(`\nDeprecating KeyRing ID ${targetRingId}...`)
  const ringDeprecateCmd = new KeyRingSetPolicyCommand(targetRingId, MicrokernelResourceFlags.FLAG_DEPRECATED)
  const ringDeprecateResp = await sendTunneled(ringDeprecateCmd)

  if (ringDeprecateResp.getSW() === StatusWord.OK) {
    console.log(`KeyRing ${targetRingId} successfully marked DEPRECATED.`)
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in lifecycle management:', err)
    process.exit(1)
  })
}
