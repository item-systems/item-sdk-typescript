import { Item, Utils } from '../dist/esm'
import { u, wallet } from '@cityofzion/neon-js'
import assert from 'assert'
import { NeoN3EllipticCurves } from '../dist/esm/constants'
import Neon from '@cityofzion/neon-core'

describe('Basic Tests', function () {
  this.timeout(60000)
  let item: Item
  const node = 'http://seed2.neo.org:10332'
  const account = new wallet.Account()
  const mockNFI = new wallet.Account('ce2905e4d3630a2628103661d8171b6174d1239e68dfcaf78017920fc126ed9c')
  before(async function () {
    item = await Item.init({
      node,
      account,
    })
  })
  describe('Manufacturing Tests', async () => {
    it('Should create configuration', async () => {
      console.log(account.address)

      const res = await item.createConfigurationSync()

      const config = await item.getConfiguration({
        localCid: res,
      })
      console.log(config)
      assert.equal(res, config.id)
    })

    it('Should get a user', async () => {
      const user = await item.getUser({
        localUid: 1,
      })

      console.log(user)
    })

    it('Should get a configuration', async () => {
      const config = await item.getConfiguration({
        localCid: 1,
      })

      console.log(config)
    })

    it('Should get all of an epoch items', async () => {
      const epoch = await item.getEpoch({
        localEid: 5,
      })
      const res = await item.getEpochItems({
        localEid: 5,
      })

      console.log(res.length)
    })

    it('should create a bunch of assets in a configuration', async () => {
      const b = new Neon.wallet.Account()
      const asid = await item.bindItemSync({
        localNfid: 16,
        localCid: 1,
        pubKey: mockNFI.publicKey,
        assetEllipticCurve: NeoN3EllipticCurves.SECP256R1SHA256,
      })

      console.log(asid)
    })
    it('should get an item', async () => {
      const nfi = await item.getItem({
        localNfid: 1,
      })
      console.log(nfi)
      console.log(nfi)

      const nfiTac = await item.getItemWithTac({
        tacScriptHash: nfi.epoch.binding_script_hash,
        tokenId: nfi.binding_token_id,
      })
      console.log(nfiTac)
    })

    it('should get an asset', async () => {
      const asset = await item.getAsset({
        localAsid: 1,
      })
      console.log(asset)
    })

    it('should get all of the assets in a configuration', async () => {
      const assets = await item.getConfigurationAssets({
        localCid: 1,
      })
      console.log(assets)
    })

    it('should auth', async () => {
      const decode = Utils.decodeNDEF(
        'https://blockspirits.coz.io/?d=BG9c75Iv3vGxeBshtdWKs5SOwZEH4rMSQmWnepL.v4YZReaoeOb3qb5PuZgj.YzqqT61XbYzUmw.G1SapwLunR8AAAAAFTBGAiEA0PHSaLgprzCCccrJcXaJP6i2mjNmBZECb3LAZtD9LK0CIQCQsgcuxhedI4CD7ZaXqcDcLKGB.luj4N5Kg9MgOz5D5Q--'
      )
      console.log(decode)

      const nfi = await item.getItemWithKey({
        pubKey: decode.pubKey
      })
      console.log(nfi)

      const res = await item.isAuthValid({
        localNfid: nfi.id,
        message: decode.msg,
        challenge: u.int2hex(1),
        proof: decode.proof,
      })
      console.log(res)



      /*
      console.log('light auth')
      const client = new Neon.rpc.RPCClient(node)
      const targetBlockHeight = await client.getBlockCount()
      //const targetBlockHeight = 1000
      const blockHash = await client.getBlockHash(targetBlockHeight - 1)

      const formattedBlockHash = u.reverseHex(blockHash.substring(2))

      const sig = Neon.wallet.sign(formattedBlockHash, mockNFI.privateKey)
      console.log(mockNFI.publicKey)
      console.log(sig)

      const res = await item.authItemSync({
        localNfid: 49,
        message: u.int2hex(targetBlockHeight - 1),
        challenge: u.int2hex(3),
        burn: false,
        proof: sig
      })

       */
    })

    it('should get the asset burn log', async () => {
      const assets = await item.getAssetBurnLog({
        localAsid: 3,
      })
      console.log(assets)
    })

    it('should get an item using the public key', async () => {
      const decode = Utils.decodeNDEF(
        'https://blockspirits.coz.io/?d=BG9c75Iv3vGxeBshtdWKs5SOwZEH4rMSQmWnepL.v4YZReaoeOb3qb5PuZgj.YzqqT61XbYzUmw.G1SapwLunR8AAAAAFTBGAiEA0PHSaLgprzCCccrJcXaJP6i2mjNmBZECb3LAZtD9LK0CIQCQsgcuxhedI4CD7ZaXqcDcLKGB.luj4N5Kg9MgOz5D5Q--'
      )
      console.log(decode)
      const nfi = await item.getItemWithKey({
        pubKey: decode.pubKey,
      })
      console.log(nfi)
    })

    it('should get token properties using the public key', async () => {
      const decode = Utils.decodeNDEF(
        'https://blockspirits.coz.io/?d=BG9c75Iv3vGxeBshtdWKs5SOwZEH4rMSQmWnepL.v4YZReaoeOb3qb5PuZgj.YzqqT61XbYzUmw.G1SapwLunR8AAAAAFTBGAiEA0PHSaLgprzCCccrJcXaJP6i2mjNmBZECb3LAZtD9LK0CIQCQsgcuxhedI4CD7ZaXqcDcLKGB.luj4N5Kg9MgOz5D5Q--'
      )
      console.log(decode)
      const nfi = await item.tokenProperties({
        pubKey: decode.pubKey,
      })
      console.log(nfi)
    })

    it('should get all of the remote tokens', async () => {
      const items = await item.itemsOf({
        address: 'NaZwraSdJv9BYwYzZryiZcydaPDof56beK'
      })
      console.log(items)
    })
  })
})
