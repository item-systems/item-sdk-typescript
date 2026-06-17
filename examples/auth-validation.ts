import { Item, types } from '@item-systems/item'

// Illustrative example only.
// Replace placeholder ITEM ids and auth payload values with real values from your environment.
async function main() {
  const item = await Item.init()

  const auth = {
    message: '00112233', // placeholder hex payload
    proof: 'aabbccdd', // placeholder proof/signature payload
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  }

  const validation = await item.isAuthValid({
    localNfid: 42,
    auth,
  })

  console.log('validation', validation)

  // Requires an authorized signer in real usage.
  // const ok = await item.authItemSync({ localNfid: 42, auth, burn: false })
  // console.log('auth result', ok)
}

main().catch(console.error)
