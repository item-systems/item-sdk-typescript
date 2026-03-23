import { Item, constants } from '@item-systems/item'
import { wallet } from '@cityofzion/neon-js'

async function main() {
  const account = new wallet.Account(process.env.NEO_PRIVATE_KEY!)

  const item = await Item.init({
    node: constants.NeoN3NetworkOptions.TestNet,
    account,
  })

  const txid = await item.setConfigurationProperty({
    localCid: 1,
    globalPid: '01',
    state: '01',
  })

  console.log('txid', txid)
}

main().catch(console.error)
