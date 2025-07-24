import { Item, Utils } from '../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import * as fs from 'fs'
import { wallet } from '@cityofzion/neon-js'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('It should run ops', function () {
  this.timeout(60000)
  let item: Item
  const node = 'http://127.0.0.1:50012'
  const account = new wallet.Account('')
  before(async function () {
    item = await Item.init({
      node,
      account,
    })
  })

  it('Should deploy', async function () {
    const pathToNEF = '../contract/item.nef'

    const rawManifest = fs.readFileSync(pathToNEF.replace('.nef', '.manifest.json'))

    const res = await Utils.deployContract(
      node,
      860833102,
      fs.readFileSync(pathToNEF),
      JSON.parse(rawManifest.toString()),
      account
    )
    console.log(res)
  })

  it('Should update', async function () {
    const pathToNEF = '../contract_N3_ITEM/contract/item.nef'

    const nef = Neon.sc.NEF.fromBuffer(fs.readFileSync(pathToNEF))
    const serializedNEF = Neon.u.HexString.fromHex(nef.serialize(), true)
    const rawManifest = fs.readFileSync(pathToNEF.replace('.nef', '.manifest.json'))

    const manifest = Neon.sc.ContractManifest.fromJson(JSON.parse(rawManifest.toString()))
    const stringifiedManifest = JSON.stringify(manifest.toJson())

    const res = await item.updateSync({
      script: serializedNEF.toBase64(true),
      manifest: stringifiedManifest,
      data: '',
    })
    console.log(res)
  })
})
