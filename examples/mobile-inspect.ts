import { ItemSecureTunnel, MicrokernelClient, type CardTransport, type RandomSource } from '@item-systems/item/mobile'

/** Read-only authenticated inspection. The caller supplies the expected application UID and stored key. */
export async function inspectCard(
  transport: CardTransport,
  random: RandomSource,
  pairingKey: Uint8Array,
  expectedUid: string
) {
  const tunnel = new ItemSecureTunnel(transport, random)
  try {
    const info = await tunnel.connect()
    if (info.uid !== expectedUid.toLowerCase()) throw new Error('Unexpected card')
    if (!info.paired) throw new Error('Card needs separately authorized pairing')
    await tunnel.open(pairingKey)
    const client = new MicrokernelClient(tunnel)
    return { info, diagnostics: await client.getDiagnostics(), masters: await client.masterkeys.getStats() }
  } finally {
    await tunnel.close()
  }
}
