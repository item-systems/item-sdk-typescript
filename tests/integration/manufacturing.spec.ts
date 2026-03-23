import { Item, Utils } from '../../src'
import { u, wallet } from '@cityofzion/neon-js'
import assert from 'assert'
import { NeoN3EllipticCurves } from '../../src/constants'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { dirname } from 'path'
import * as fs from 'fs'
import { IsAuthValid, RemoteToken } from '../../src/types'

describe('Basic Manufacturing Tests', function () {
  this.timeout(0)
  const environment = 'prod'

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  dotenv.config({
    path: __dirname + `/../../.env/${environment}.env`,
  })

  let item: Item

  const node = process.env.NODE
  const account = new wallet.Account(process.env.ADMIN_KEY)
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

    it('Should get the total item supply', async () => {
      const ts = await item.totalItems()
      console.log(ts)
    })

    it('Should get a configuration', async () => {
      const config = await item.getConfiguration({
        localCid: 1,
      })

      console.log(config)
    })

    it('Should get an epoch', async () => {
      const res = await item.getEpoch({
        localEid: 16,
      })

      console.log(res)
    })

    it('Should get all of an epoch items', async () => {
      const res = await item.getEpochItems({
        localEid: 15,
      })

      console.log(res)
    })

    it('should create an asset in a configuration', async () => {
      const asid = await item.bindItemSync({
        localNfid: 4003,
        localCid: 1,
        pubKey: '035ef151e815baf091c949f2ff887eae456bcb5de01d620113df1f63306245c61c',
        assetEllipticCurve: NeoN3EllipticCurves.SECP256R1SHA256,
      })

      console.log(asid)
    })

    it('should get an item with the tac', async () => {
      const nfi = await item.getItem({
        localNfid: 4973,
      })
      console.log(nfi)

      const params: RemoteToken = {
        scriptHash: nfi.epoch.binding_script_hash,
        tokenId: nfi.binding_token_id,
      }

      const nfiTac = await item.getItemWithTac(params)
      console.log(nfiTac)
    })

    it('should get an item', async () => {
      const nfi = await item.getItem({
        localNfid: 1,
      })
      console.log(nfi)
      console.log(nfi)

      const params: RemoteToken = {
        scriptHash: nfi.epoch.binding_script_hash,
        tokenId: nfi.binding_token_id,
      }
      const nfiTac = await item.getItemWithTac(params)
      console.log(nfiTac)
    })

    it('should get the owner of an item', async () => {
      const owner = await item.ownerOf({
        localNfid: 1,
      })
      console.log(owner)
    })

    it('should get all of the assets in a configuration', async () => {
      const assets = await item.getConfigurationAssets({
        localCid: 1,
      })
      console.log(assets)
    })

    it('should verify an proof', async () => {
      const params: IsAuthValid = {
        localNfid: 190,
        auth: {
          message: '0000000008',
          proof:
            '7a811313f7de6c2a00c16716a99ed53b0c0208813fb8e65c6166a5f45012512edf6e7535cb54bfc01e4dea5c671005a7b069aa1ef621efd34b7a4dcbef3303f6',
          challenge: '01',
        },
      }
      const res = await item.isAuthValid(params)
      console.log(res)
    })

    it('should auth', async () => {
      const decode = Utils.decodeNDEF(
        'https://itm.st/en/login/?d=BBjZiL.q9cX846XS4ufdyBVciBayTpncGnIb8c9Cw2XRo8.b.q58aa4_MTJ_085VBhiOrCidbmnv7ndqHxaSIqYAAAAAADBFAiAAjFYfc45TqzDpzdNK5S7F8Vdv99koqPo6UHOu1cQuhwIhAKy3cqnaRYlPW8Hb_fryMJm_yutaeeqU3_hmTLS9wCky'
      )
      console.log(decode.pubKey)
      const nfi = await item.getItemWithKey({
        pubKey: decode.pubKey,
      })
      console.log(nfi)

      const params: IsAuthValid = {
        localNfid: nfi.id,
        auth: {
          message: decode.message,
          challenge: u.int2hex(1),
          proof: decode.proof,
        },
      }
      const res = await item.isAuthValid(params)
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
        'https://itm.st/pt-br/login/?d=BM5_q9XMsndzfnnq8Jh2fD9.Si4oPiGIyjk.B5l4smDWa9NgJFMaeFWsysMzmPW00EfYxy63ltr88eecHCGvHfMAAAAAETBGAiEAywbyGrNsQ2Gg9vmZAkCA151Nafi4fLrq4mkbVVVreHsCIQD4uky7KROiPwqjU9dNbQcuqseUEKmN1SLS5Nxl_pDYkw--'
      )
      console.log(decode)
      const nfi = await item.getItemWithKey({
        pubKey: decode.pubKey,
      })
      console.log(nfi)

      assert.equal(nfi.id, 615)
      assert.equal(nfi.binding_token_id, '6702')
    })

    it('should get token properties using the public key', async () => {
      const decode = Utils.decodeNDEF(
        'https://itm.st/en/login/?d=BC6LgFZDGELHFKCeep7ZGpkp7MnQv8A3GUyxY.9e2G0n60gdGBpp2uYQP5sL0cxG3ktgZM2.v7deofFKIrUCrDQAAAAAADBFAiAvdWGhsT0uby0iiInGyqdMfL9_nG2_QjH1y8r3689W2AIhAPaKBXNogHv0NijU.MF9ttRitBIt5qeYAIsb0q2It7kD'
      )
      console.log(decode)
      const nfi = await item.tokenProperties({
        pubKey: decode.pubKey,
      })
      console.log(nfi)
    })

    it('should get all of the remote tokens', async () => {
      const items = await item.itemsOf({
        address: 'NaZwraSdJv9BYwYzZryiZcydaPDof56beK',
      })
      console.log(items)
    })

    it('should look up an item using the tac', async () => {
      const params: RemoteToken = {
        scriptHash: '0x556117a2631950659167a40a1852a2c0ce58bef4',
        tokenId: u.reverseHex(u.int2hex(125)),
      }

      const nfiTac = await item.getItemWithTac(params)
      console.log(nfiTac)
    })

    it('should bind an item using the tac', async () => {
      const params: RemoteToken = {
        scriptHash: '0x556117a2631950659167a40a1852a2c0ce58bef4',
        tokenId: Utils.numToHexComplement(300),
      }

      const nfiTac = await item.getItemWithTac(params)
      console.log(nfiTac)

      const asid = await item.bindItem({
        localNfid: nfiTac.id,
        localCid: 1,
        pubKey: '03ce7fabd5ccb277737e79eaf098767c3f7e4a2e283e2188ca393e079978b260d6',
        assetEllipticCurve: NeoN3EllipticCurves.SECP256R1SHA256,
      })
      console.log(asid)
    })

    /*
    Evaluates a list of public keys against a TAC and binds assets.
     */
    it('should bind items using the tac', async () => {
      const filePath = './is_batman.csv'
      const targetScriptHash = '0x556117a2631950659167a40a1852a2c0ce58bef4'
      const targetEpoch = 12
      const startToken = 1

      const keys = fs
        .readFileSync(filePath)
        .toString()
        .split('\n')
        .slice(1)
        .map(row => {
          return row.split(',')[7]
        })

      for (let i = 0; i < keys.length; i++) {
        const tokenId = startToken + i
        const pubKey = keys[i].split(';')[0].slice(2)

        const params: RemoteToken = {
          scriptHash: targetScriptHash,
          tokenId: Utils.numToHexComplement(tokenId),
        }

        // console.log(tokenId, params)
        const nfiTac = await item.getItemWithTac(params)
        console.log(nfiTac.id, tokenId, parseInt(u.reverseHex(nfiTac.binding_token_id), 16), pubKey)
        assert.equal(tokenId, parseInt(u.reverseHex(nfiTac.binding_token_id), 16))
        assert.equal(nfiTac.epoch.id, targetEpoch)

        if (nfiTac.assets.length === 0) {
          console.log('Binding')

          const txid = await item.bindItem({
            localNfid: nfiTac.id,
            localCid: 1,
            pubKey,
            assetEllipticCurve: NeoN3EllipticCurves.SECP256R1SHA256,
          })
          console.log(txid)
        }
      }
    })

    /*
    Evaluates a list of public keys to ensure that every one has been bound.
     */
    it('should verify a public key list', async () => {
      const filePath = './is_batman.csv'
      const targetScriptHash = '0x556117a2631950659167a40a1852a2c0ce58bef4'
      const targetEpoch = 12
      const keys = fs
        .readFileSync(filePath)
        .toString()
        .split('\n')
        .slice(1)
        .map(row => {
          return row.split(',')[7]
        })

      for (let i = 0; i < keys.length; i++) {
        const pubKey = keys[i].split(';')[0].slice(2)
        try {
          const nfi = await item.getItemWithKey({
            pubKey,
          })
          console.log(i, nfi.id, parseInt(u.reverseHex(nfi.binding_token_id), 16))
          assert.equal(nfi.epoch.id, targetEpoch, pubKey)
          assert.equal(nfi.epoch.binding_script_hash, targetScriptHash, pubKey)
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          console.log('  missing', i, pubKey, message)
        }
      }
    })

    /*
    Evaluates an entire tokenized asset contract to confirm that every token is bound.
     */
    it('should evaluate an entire TAC', async () => {
      const targetScriptHash = '0x556117a2631950659167a40a1852a2c0ce58bef4'
      let i = 0
      let tokenId = 1
      const epochId = 12
      while (true) {
        const params: RemoteToken = {
          scriptHash: targetScriptHash,
          tokenId: Utils.numToHexComplement(tokenId),
        }
        const nfi = await item.getItemWithTac(params)
        assert.equal(epochId, nfi.epoch.id)
        console.log(i, tokenId, nfi.epoch.id, nfi.id, nfi.assets.length)
        if (nfi.assets.length === 0) {
          console.log('  missing')
        }
        i += 1
        tokenId += 1
      }
    })
  })
})
