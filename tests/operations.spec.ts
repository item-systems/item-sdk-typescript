import { Item, Utils } from '../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import * as fs from 'fs'
import { NeonInvoker } from "@cityofzion/neon-invoker";
import { NeonParser } from "@cityofzion/neon-parser";

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('It should deploy', function () {
  this.timeout(60000)

  // contract admin
  const ACCOUNT = new Neon.wallet.Account('')

  const NODE = 'http://127.0.0.1:50012'
  const scriptHash = Item.PRIVATENET

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  it('Should deploy', async function () {
    const pathToNEF = '../contract/item.nef'

    const NEFRaw = fs.readFileSync(pathToNEF)
    const manifestRaw = fs.readFileSync(pathToNEF.replace('.nef', '.manifest.json'))
    const manifestJSON = JSON.parse(manifestRaw.toString())

    const txid = await Utils.deployContract(NODE, 860833102, NEFRaw, manifestJSON, ACCOUNT)
    const res = await Utils.transactionCompletion(txid)
    console.log(res)
  })

  it ('Should update', async function () {
    const pathToNEF = '../contract/item.nef'

    const sdk = await getSDK(ACCOUNT)
    const nef = Neon.sc.NEF.fromBuffer(
      fs.readFileSync(
        pathToNEF
      )
    )
    const serializedNEF = Neon.u.HexString.fromHex(nef.serialize(), true)
    const rawManifest = fs.readFileSync(pathToNEF.replace('.nef', '.manifest.json'))

    const manifest = Neon.sc.ContractManifest.fromJson(
      JSON.parse(rawManifest.toString())
    )
    const stringifiedManifest = JSON.stringify(manifest.toJson())

    const txid = await sdk.update({
      script: serializedNEF.toBase64(true),
      manifest: stringifiedManifest,
      data: ''
  })

    /*
    const NEFRaw = fs.readFileSync(pathToNEF)
    const manifestRaw = fs.readFileSync(pathToNEF.replace('.nef', '.manifest.json'))
    const manifestJSON = JSON.parse(manifestRaw.toString())
     */
    const res = await Utils.transactionCompletion(txid)
    console.log(res)
  })

})