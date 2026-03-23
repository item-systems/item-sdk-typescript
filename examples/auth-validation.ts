import { Item, types } from '@item-systems/item'

async function main() {
  const item = await Item.init()

  const auth = {
    message: '00112233',
    proof: 'aabbccdd',
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
