import { Item, types } from '@item-systems/item'

// Illustrative example only.
// Replace placeholder script hashes, token ids, and accounts with values from your deployment.
async function main() {
  const item = await Item.init()

  const byTac = await item.getItemWithTac({
    scriptHash: '0x1234...', // placeholder TAC script hash
    tokenId: 'a1b2c3d4', // placeholder token id
  })

  console.log('item from TAC', byTac)

  // Example auth payload for claim flows:
  console.log(types.AuthChallenge.ILS_PERMISSIVE)

  // Requires an authorized signer in real usage.
  // const claimed = await item.claimItemSync({
  //   pubKey: '03abc123...',
  //   auth,
  //   receiverAccount: 'NXYZ...',
  // })
  // console.log('claimed', claimed)
}

main().catch(console.error)
