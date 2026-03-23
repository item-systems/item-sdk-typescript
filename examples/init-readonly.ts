import { Item, constants } from '@item-systems/item'

async function main() {
  const item = await Item.init({
    node: constants.NeoN3NetworkOptions.MainNet,
  })

  console.log('totalItems', await item.totalItems())
  console.log('item#1', await item.getItem({ localNfid: 1 }))
}

main().catch(console.error)
