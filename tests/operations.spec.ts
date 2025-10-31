import { Item, Utils } from '../src'
// @ts-ignore
import * as fs from 'fs'
import * as Neon from '@cityofzion/neon-js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
import assert from 'assert'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('It should run ops', function () {
  this.timeout(60000)
  const environment = 'prod'

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  dotenv.config({
    path: __dirname + `/../.env/${environment}.env`,
  })

  let item: Item

  const node = process.env.NODE
  const account = new Neon.wallet.Account(process.env.ADMIN_KEY)
  const pathToNEF = process.env.PATH_TO_NEF
  before(async function () {
    item = await Item.init({
      node,
      account,
    })
  })

  it('Should deploy', async function () {
    assert.ok(node, 'node env not set')
    assert.ok(pathToNEF, 'path to NEF not set')
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
    assert.ok(pathToNEF, 'path to NEF not set')
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
