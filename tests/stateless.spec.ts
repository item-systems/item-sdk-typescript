import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item } from '../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Stateless Item', function () {
  this.timeout(60000)

  const scriptHash = Item.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({

    })
  }

  it('should get the NFT token symbol', async function () {
    const sdk = await getSDK()
    const res = await sdk.symbol()
    assert.equal(res, 'ITEM')
  })

  it('should get the NFT token decimals', async function () {
    const sdk = await getSDK()
    const res = await sdk.decimals()
    assert.equal(res, 0)
  })

  it('should get the NFT total supply', async function () {
    const sdk = await getSDK()
    const res = await sdk.totalSupply()
    assert.isAbove(res, 1500)
  })

  it('should get the balance of a new account', async function () {
    const account = new Neon.wallet.Account()
    const sdk = await getSDK()
    const res = await sdk.balanceOf({
      address: account.address,
    })
    console.log(res)
    assert.equal(res, 0)
  })

  it('should get the balance of an existing account', async function () {
    const account = new Neon.wallet.Account('NaZwraSdJv9BYwYzZryiZcydaPDof56beK')
    const sdk = await getSDK()
    const res = await sdk.balanceOf({
      address: account.address,
    })
    console.log(res)
    assert.isAtLeast(res, 7)
  })

  // TODO - verify all fields
  it('should get all of the epochs', async function () {
    const sdk = await getSDK()
    const totalEpochs = await sdk.totalEpochs()
    assert.isAbove(totalEpochs, 8)
    for (let i = 1; i <= totalEpochs; i++) {
      const epoch = await sdk.getEpochJSON({
        epochId: i,
      })
      console.log(epoch)
      assert.equal(epoch.epochId, i)
    }
  })

  it('should get the tokens', async function () {
    const sdk = await getSDK()
    const totalTokens = await sdk.totalSupply()
    console.log(totalTokens)
    assert.isAbove(totalTokens, 8)
    for (let i = 1; i <= totalTokens; i++) {
      try {
        const item = await sdk.getItemJSON({
          tokenId: i,
        })
        console.log(item)
      } catch (e) {
        console.log(i, e)
      }
    }
  })
  it('should get the tokens of an account', async function () {
    const account = new Neon.wallet.Account('NaZwraSdJv9BYwYzZryiZcydaPDof56beK')
    const sdk = await getSDK()
    const res = await sdk.tokensOf({
      address: account.address,
    })
    assert.isAbove(res.length, 5)
    console.log(res)
    for (let i = 0; i < res.length; i++) {
      console.log(res[i])
      const item = await sdk.getItemJSON({
        tokenId: res[i],
      })
      console.log(item)
    }
  })

  it('should get the token ids', async function () {
    const sdk = await getSDK()
    const res = await sdk.tokens()
    console.log(res)
    assert.isAbove(res.length, -1)
  })

  it('should get the owner of a null token', async function () {
    const sdk = await getSDK()
    try {
      await sdk.ownerOf({
        tokenId: 100000000000,
      })
      assert.fail()
    } catch (err) {}
  })

  it('should get the owner of a token', async function () {
    const sdk = await getSDK()
    const owner = await sdk.ownerOf({
      tokenId: 1,
    })
    assert.isNotEmpty(owner)
  })

  it('should get the total number of accounts', async function () {
    const sdk = await getSDK()
    const res = await sdk.totalAccounts()
    console.log(res)
    assert.isAbove(res, 1660)
  })

  it('should get the origin account', async function () {
    const account = new Neon.wallet.Account('NaZwraSdJv9BYwYzZryiZcydaPDof56beK')
    const sdk = await getSDK()
    const res = await sdk.getUserJSON(account)
    console.log(res)
    assert.equal(
      JSON.stringify(res),
      JSON.stringify({
        balance: 7,
        account_id: '\x02',
        permissions: {
          offline_mint: true,
          contract_upgrade: true,
          set_mint_fee: true,
          create_epoch: true,
          set_permissions: true,
          bind_item: true,
        },
      })
    )
  })

  it('should get a token using a public key', async function () {
    const sdk = await getSDK()

    const someTokenByAsset = await sdk.getAssetItemJSON({
      assetPubKey: '031b228b6aa2c9caebca782d81acd708fae5a794a1bd46de65fb3eaa64e4c7b2fc',
    })
    console.log(someTokenByAsset)
  })
})
