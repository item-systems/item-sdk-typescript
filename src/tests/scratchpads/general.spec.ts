import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item } from '../../index'
import { ITEM_PRIVATENET } from '../common'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Stateless Item', function () {
  this.timeout(60000)
  const ACCOUNT = ''
  const scriptHash = ITEM_PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  it('Should iterate over all the epochs', async function () {
    const sdk = await getSDK()
    const totalEpochs = await sdk.totalEpochs()
    console.log(totalEpochs)
    for (let i = 1; i < totalEpochs; i++) {
      console.log(i)
      const epoch = await sdk.getEpochJSON({
        epochId: i,
      })
      console.log(epoch)
    }
  })

  it('Should iterate over all the tokens', async function () {
    const sdk = await getSDK({
      account: ACCOUNT,
    })

    for (let i = 100; i < 110; i++) {
      console.log(i)
      const epoch = await sdk.getItemJSON({
        tokenId: i,
      })
      console.log(epoch)
    }
  })
})
