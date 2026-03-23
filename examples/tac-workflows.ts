import { Item, types } from '@item-systems/item'

async function main() {
  const item = await Item.init()

  const byTac = await item.getItemWithTac({
    scriptHash: '0x1234...',
    tokenId: 'a1b2c3d4',
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
