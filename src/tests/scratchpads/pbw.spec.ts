import { NeonParser } from '@cityofzion/neon-parser'
import { constants, Item, Utils } from '../../index'
import { Generator } from '@cityofzion/props'
import Neon, { u } from '@cityofzion/neon-core'
import { assert } from 'chai'
import { NetworkOption } from '@cityofzion/props/dist/interface'
import axios from 'axios'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Consensus 2023', function () {
  this.timeout(0)

  // populate with contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const node = constants.NetworkOption.MainNet
  const network = NetworkOption.MainNet

  it('should get the generator', async function () {
    const generator = new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network,
    })
    await generator.init()
    const res = await generator.getGeneratorJSON(16)
    console.log(res)
  })

  it('should create a new generator instance', async function () {
    console.log(ACCOUNT.address)
    const generator = new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network,
    })
    await generator.init()

    const txid = await generator.createInstance(16, ACCOUNT)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node,
      timeout: 30000,
    })
    const generatorInstanceId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log('generator instance id: ', generatorInstanceId)
    assert.isAbove(generatorInstanceId, 0)
  })

  it('Should create an item epoch using the new generator instance', async function () {
    const maxSupply = 350
    const generatorInstanceId = 22

    const item = new Item({
      account: ACCOUNT,
      node,
    })

    const txid = await item.createEpoch({
      label: 'Neo x Paris Blockchain Week 2024',
      generatorInstanceId,
      mintFee: 1000 * 10 ** 8,
      sysFee: 0.25 * 10 ** 8,
      maxSupply,
      authAge: 20,
    })
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node,
      timeout: 30000,
    })
    const epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    log.executions[0].notifications!.forEach(notif => {
      console.log(NeonParser.parseRpcResponse(notif.state))
    })
    console.log(epochId)
    console.log(txid)
    assert.isAbove(epochId, 0)
  })

  it('Should get the epochs', async function () {
    const item = new Item({
      node,
    })

    const total = await item.totalEpochs()
    console.log(total)
    for (let i = 1; i <= total; i++) {
      const epoch = await item.getEpochJSON({
        epochId: i,
      })
      console.log(epoch)
    }
  })

  it('Should set use permissions for the generator instance', async function () {
    const epochId = 16
    const generatorInstanceId = 22

    const authorizedContracts = [
      {
        scriptHash: '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840',
        code: epochId,
      },
    ]
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network,
    })
    await generator.init()

    const txid = await generator.setInstanceAuthorizedContracts(generatorInstanceId, authorizedContracts, ACCOUNT)
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node,
      timeout: 30000,
    })
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(res)
    assert.equal(res, 1)

    const r = await generator.getGeneratorInstanceJSON(generatorInstanceId)
    console.log(r)
  })
  /*

  it('it should get the item with the public key', async function () {
    const sdk = await getSDK()
    const item = await sdk.getAssetItemJSON({
      assetPubKey: '03d4dbc966d4e2c43be0beab56859c1dd04bb1f542d1562d6531064574023dfad5',
    })
    console.log(item)
  })

  it('should get the user', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getUserJSON({
      address: ACCOUNT.address,
    })
    console.log(res)
  })

   */
  it('Should decode NDEF', async function () {
    const draw = `https://itm.st/pp/1cf8?d=BAIKMzXwzSAgtb6Un_xeWVBhVbxtuf8Ubb4CRiCNgzWGBAeIqApEao8feFWbXcmBYbjjJfFJ5a22OkRIJ_Hc16wAAAAABjBFAiALD0WzOTRT4WG5UqAS_.E4.qmljDWNmNiPBKLe1FYLkgIhAISJ_jBP9FzR3FRrDYuYwxUa98zt5SgzQ98cp4RzJTYC`
    draw.split('\n').forEach(d => {
      const res = Utils.decodeNDEF(d)
      console.log(res.pubKey, res.validSignature)
    })
  })

  it('Should mint', async function () {
    const epochId = 10

    const item = new Item({
      account: ACCOUNT,
      node,
    })
    const admin = await item.getUserJSON({
      address: ACCOUNT.address,
    })
    console.log(admin)

    for (let i = 0; i < 1; i++) {
      const txid = await item.offlineMint({
        epochId,
        address: ACCOUNT.address,
        bindOnPickup: true,
      })
      console.log(i, txid)
    }

    const log = await Utils.transactionCompletion('txid', {
      node,
      period: 1000,
      timeout: 30000,
    })
    console.log(log)
    /*

    const tokens = await item.tokensOf({
      address: ACCOUNT.address,
    })
    console.log('tokens: ', tokens)

    const token = await item.getItemJSON({
      tokenId: tokens[tokens.length - 1],
    })

    console.log(token)


     */
  })

  /*
  it('Should load wallets', async function() {
      this.timeout(0)

    const addressRaw = `NWiURaGxJUz9PdrmMvtn2MUxdfd1eZmsu1
Nj2Wk6kqAwvsWXvFpv6riWvQpfdLe5ZsMX
NebvAv8qN7uH7KCFhFzB6eDPdb7ArLfbjc
NNDHvq9x9LnmY1qMkPd9wjB9eG7U798GWd
NUhztgvYfcZf25mvP911S5rj8YeUU5dn9K
NaMutD9EgmmaBKTtKhuK7GoBEnqRDLoqAi
NWLUY8dZnzXcg7CHYoeL2BEBke6ibT235J
NfTYNMNm8c4fRQsfExTuJfFFfwNC6hV3SH
NSFPfBz9bbXMbJp4xvCGDzh6ZN9mBnETip
NQxQ692W2os4oXrS3JJ1kCJXwNDLeFkfFt
NLaKzRLwU8mh3rowjThCYQKmaDUxDDG6Hn
NTFX2CAzwj6kz9Cto93Pgc7z6KzFt9TsXo
NachLS3Ay2qHfo8zPjMFS8qNdhAayGGiPz
NNhPsRv7pbYqwvW2awETLW6v26CSmY6KCU
NSdszSEREupskT2sr8isiDFgKvZHRiVcR1
NYj4b47TAoewYMATxXCkuSvDmDgWSrEBoV
NdwS6ZiUaoYKbZvdAF2ZE4xcBSFWoJfFKo
NXApRt41FgASxMQcqo7quEDzL8W5i8YA9B
NMHsQHHtQVFphauh4KhgnvYifryP3WwEJs
NbRTTLz52ME4V3WVzZM6T5xncwnEbhrTVF
NiLB1RptqkPXRKYpxVrdJi27FsuUBzpFPT
NhPgpfULjVSj9SYhJtYAhPsqsC2HAZwhU5
NZSBpWQET4xEqzCGtTNjGPwZZ7nqzLTvnZ
NVNcG2Uwsu1eJLf94jCuMuu8Ssc4uNX6F2
NXb8HTCfjwtCSLk89UbFY5hv1Dnc9DUKur
NMsz48fGSxMVLh6FDDtJsie2Aycmky2ew4
NaAGYhs6PNzU7yrWhztrz6c6cRMiDg9gmy
Niagt7Y5xnrVfHrXfWEgpfdAYV3SSJVDfQ
NVqcJBEmRqXN9kiRpSRQsdWmjjiCDibCS7
NdYZ78nd6UykXxqrwLWtiB3LfmVVgxGrfw
NXqXFmcWUEbPRqUryqq7RSNwxXWQmp1kjZ
NhxnAVNQ3pcY55oJMCjTrHPApveubBCjeW
NM6Xv6fwv9KoaXpAhpFkUMzo3cJcNrajk4
NYJu8b3tgr6p6tnXF941k8BR8M7Rkd9HVZ
NSTrD9SP4KRrKyg7MS31nLsg8b49C34nwG
NZCLrhJnuAkGSeUVtYNqrMDVcEDPRqKMgp
NeMderEVyDbDMRJL5NTXJA56pAgNGE8Ybp
NMfLLeH8rmj5vLnMsHdy1vDLER7WDaj7FW
Nj1JK6Ep1qU68XaHiHjVGv9jjtzfeaEDKa
NZ4f6vh9bXshyUMCJCzma7c9QT5U9LSitU
NSaLEdRiW3GpxCC6AkoLKXGBGdf8NAvfc6
NUJMN3uF51PhJsssRL5diT62aNUMNTDviU
NQ2dUV3Z9cBkF2G1FDehXs31uovtK9Ho7D
NWG5cEVPb6ApJmMW1VJqN4DENWNSaKqBAt
NPyRe18gnQ8NSmTdrFT2a9Bgwa6ZYFnWmX
NXbBhoHn8Z9c26yJ75mbY5aXCya8nMNH8M
NQfHuW1FX4EB53xHmTg4U69c4X41cUA9yh
NdQMmXXperWVh5vgYD71poykJNa7hHojn8
NNqjcpUKQR1KSpDThWjvu2LjG9Kj4tUbRg
NNY9t8W6i6Mj5XbXWU5BhPNhUU8S1PPEPQ
NUgrdGSn5XMyPPUZ1myTCwGsqstRy352WL
NNiWvA1eZHWBBMysYDgjwL3AnBQ4Tcrbqn
NMYXrrH5KPrET5rDSgkrsV9E9ojjhPgBrX
NNKPTx4hyh8zJxFNTQFhAH4A3MqjwXM1rc
NXPJuRYeaHSKmkSxcqq6Vqhd8pVtwFCAE6
Nek5Ki2HZbo91gnzHBdVFdDAxVL1r3HPyZ
NQ9DXSUfbACkKCM3G3jfi5F2vzt5giASfc
NfTeLgoh5r5nfqcwPxA53vLiQ9ADDQwYMZ
NTX8F1tGVVhEuABEQNsUSpJ1oLHKgGbC1f
NXMreEkwMT8mFjeoUvP7wFnwPMeznmfutt
Ni6kSNT96sZaGHRbgxcKVjE9gfsEbbgDHV
NZ1umLZuwtfrMsNo7dYFBnLeivPPbyywb1
Ne172c2jWxqXHpADCxNhVNcgAK8ZGA2RB6
NQJv1QGMtEewSJcvjtTNV2Fo9XM3n8XHQ3
NZgKCSPyTGuETjCkfP6dzBGJxMcGZQTFUz
NZWiZ64c45A74g3UUYafnVo9tuxYPXEyGW
NetG4Sp2Sbo8ke4hEp3QTiC5Ay2o7kxBZ1
NW8cWiECSEWehPib4kFGU7TB6ZcgoKLUyJ
Ncm9uPU5Wz68uZWhbD7idwG3gwuYfwpbm2
NYHTB25pVPVyQGVHuZuwDLCm6i9xSb1nAj
NWF6qxRvWutTeJeupy69NqyDzWGJLsWynD
NUCjwwpLWkm9D9wpmf7ostL73Pw3vfMamf
Naxd8bV7KNDysgn6GEtzjdbCZ9j2Xdnn8N
NNPnUi1GJR9svcbBXtQtPHtUpwJQnjvaag
NgwXCBF58MQ1yKrwX1VuRh74FJumLue2BC
NUj2x2zKybLA4fU2ZkzRmJYQzWy91SgVKQ
NN3trFkfuEa5mGdoUUHbpxXeEBupZMkxDf
NbZuy1Pb1DB7BEpSRWoYJfNuzPhokm4zvg
NUsKpHkBh3WiNvUDJpW8nD5NbcNKh3iafU
NRetNm5BnbTwXwppN7sZpWSir12eESAzz5
NSHH7rZNeSwvbR6JErMit5xQjGtxuowrq9
NZeRZyLuWn5Ryqv3B8FiCYSqXsTEeXJQNG
NYsSEDpupLMZDC6ZnZNVjA75xyiEbKoD8C
NfQmQWhiCikHjnbEonAHadpbDH5mycTD4u
NU2UBtPvtrzzBb1HTJjunCZvinxHa2UMc8
NZvJR1vFwuDVCXBTZJs4qasUSDfALAwKPz
NfbRHtL7WGZFyms54is4gVDzKGVAkKDxHe
NREzGhQnxAQy6kLYZk7xBhDMXaBGXw76NS
NUBEVgGcD86icSdpV6UeY3FgWM5SVMAkNy
NT2veKwiH2BaPJyihfKQJGtFNXZMgJaaEU
NXfasRZ4jTxme4EzaPhiLJro83Rb2FtfRL
NMVg7Yqh3zxjNZnAmn3WSi8KcQMyfdBB1q
NVH4iRaF9F5b86JTAv3SRQDeUWBFmDT7U6
NXHw4QtN2ud6YcV43idEp3BEUBDs2nXthG
NbyC52NA36MdwkNfXvvondA1Kfwa2sLuCJ
NQciWy5R8qFoWcLmFQQi8NVBPpAGtDQx7r
NQkS4UwaEQuMx84gAKFwGzhnuVzLBQ1zxR
NQb4hLz7ELHLsXTaArHDopPPfh4KGfuQtb
NQ3wFf4qZMKoCZpQQ5Tqxg4i3MH4t9dRWJ
NcEWjVT2WPn7qpkftnm3vivxUu1nbRNcpz
Na8YN7buJZ8bsvPUByU1ajGBaHvYxoqygf
NaHvGhnHYJ98a3NYRGx2cLYrg2dgSgZ6mE
NQ6hsmqk8hK4UP58t96iRbzW9rzkcS8CBk
NaMKBdqgf2XHdeZMz7mJVamYTa3E2RqweQ
NUAPgcY3Wpo1oxiXWxBN1djyCuQmKUpJKo
NLs12W7WGaTwRe9R4HVF8NMhDQPcb3oiL9
NNL7ActmtYq1t1EEf7tvLxiyuRLWHdQLaN
NWSAKyCS6JPDaBeLdE7poCCCDxrKC1MKvh
NLavhi7mP7QPwWXwe7fUgmZPL5KrquWdpm
NVRMUgcWoGx2vFqDA4FMFo3ufrks8Pkn1X
NMmULcWmkEvegU1zFSHA49fMkwnGi7ZUJr
NRCGaSFFg2M9cCmSckZBndJdxst4uory56
NdSWFye2kZH7QLK39g7efUCcUVVsYwohYL
NVH3BnsUdDF8LbkyWPnKEvFZd8w2mV43Ju
NegAGR1MMpb9jx3QzMuk8Cvv6P3cALkDfx
NZ9xafH8krEwZqzMoZd9cAqwCWNvFjrX5S
NLM4fGpxtDhhUvD2g7es9DoxCGQT8CtGqC
NddBWot9irYWe4oTyisvNweGvPv93dJATh
Nb97YLcKf5og8dwqH83HKjWNYLAhR9BRbL
NdCZJ7CeniNVLsQDt1aukEHnavpcos4PG1
NakeLPw8EWeRqsa5zgfR7qHZ56RkXtRgEU
NN7u9WMQf2SWLkYUzcUJi75gd6QrrMP7iW
NbokHU6EsdFmA8kBxBdYTbuvY5UamBhxNx
NW7ikRNuziTRzcGuZDAvumGAJtBu6xV9ME
NiYfALvuwZKPZb6MxY1qoZy3YafP82jEvr
NMLRbgXtjNuPgHgvLLFDniiTdPK8neME4y
NPtYgLaGcARc9ptSfVi33m7LGopHaA6NgJ
NgWpGf8jcb9q6hb376DpYxmeCUxh8mnyYP
NZksLLKJPmA6dEpUid1aYxNPKcCoe5nciC
NSNQoH6ZsEr8HNPc2pW68gw1xryr5Zs1Z7
NZaN2tMxSLFrqyr5jVuy4Up7GfLrAF6hme
NeHH3qRjfNBPu17xgF2B7y8yG42Pn1wL5v
NbukNpKTDuWPAcjr39hRFkXY4smWxady3Q
NhvoCDD1uC96z8y98krdvaZLuiBCHFPsym
NUZNSALxzBzMprPQuSBEaxHn5qEX7chrcL
NhaBSjBcufABDxF5nid4dXgU2KTUrEpZyU
NNtKyZgLJxvSfqqTz9s6KSd6S2TefP8iRK
NYpBP2Y1DUQrkLiqz13HaTougiB18bWpRX
NQRszQxSV6gTD87YjvGTye2V1RL92UwqTV
Ned9dpRLv528k2DxpakjYJmtSfaM7Hyxem
NdGwgtArX2yewH7GrXQYdL5s5Y5tc3hims
NjBZPS37uNnLxhuVhFEMWRaNkkFvKDuzqr
NVHxHaitudreBoudsv3naUxHPtAfwGtBkc
NQEQsPtjjggPD5mn9zk3h2Uz3bd5ksLAKN
NcSyBhGueizcx47nN88ydkxYek5C41DGfc
NfUP9FTTddJcxh75WDXWwc4S2stNzvPg1V
NbcYqJ2xVXi9aNYCB7Nx9CPWLvPGxuhATi
NbdXaak1kK7swjz3b18oWogxNmif6BVgqD
NRfsu3iYwjzFW8WfTWmT6MA28yZaQDFfUh
NWC7CFaAYKFEzjCHzHaV3dTrkTY1scaPb4
NcRw9SXk8BUUMLePQJsNGkNjy5fgTQ2yHh
NTFfkREn6F1ULYFe7ga8xYest6MLRYRbj6
NTFHRkpuLyaDTZVsfFQ9unNrgimUcm7V2G
NMfSuNtYKLQLPJsDv5pn1U6F3LW83cFHou
NbCvrLYeatetTus35PZQyf9fUTUQVPGuh9
NWF2g5psPq1xjFJJxnJmafPV5mC2rddqRU
NgCCJ6iXnEDRA8s5JqZutBVPEWdFMU1g3S
NbUJNQNCwcURm7BJG7M9GVDpEVJQgvNsEZ
NX1xBJ8Y5moDYrFfspNMnhovJFQSTkjE2d
NL9uedmZa5pK8ZLbLsyE7Pft2gVt3xXGbv
NdTgtXFasnpJ5pgqZj1hwVAvY1wG8LHH1F
NQ1dtRZ8xbduAVsHnUjxTtEFKqkKtbLSYa
NevDwRE72q1WBH9L77FZVpiedbxa36g4Zx
Nh9vEL9LLFst2hC9s1kzACGmBotxT7ijtL
NLQFGqVQq9dkDFuibdiAQoQfvvE7HZdw3q
NLd3EjcckwvHmZ41XQ8X6tehh5U5dsZjPz
NNMrLX3ECchQqZCZuRjWy2hAwacGdfYUbK
NUot9xibHT1PHTaTFp41JiNZXG1PBEMtki
NS6cdxrS6dtnNBdyALdzmTTbPd1VMioYtG
NWXhJjUJvs33zPouxRyvTdHV9kLFvvVJff
NfdDcSXRhrRqJDAK4ZvEKXTHe6KJLbzF4s
NYRHndQyXy3oD7JCZ7RijePzu4Efa1Vruy
NWujW6ACGx1pUX9cquuQVQKcoXCj9DDJc5
NcLQL2bq26vjK77dKsJdEqfrmU2FzrPQ2C
NgCZhUsy9PnuN6XBAiqmkrow5RHctMJdcE
NMeHo2VEggk4f6zcBmWDSg47cc3GGmEsnx
NWAZc8fsysxh7Sq4gBdUm8Pj1v3oqTSQsb
NUkGhoAWFR85XvpSchiwUK8Pbrp1p1T4xs
NNALQkNzzMDDYaTnkRfQ7AZbz63WuWAVNd
NTLN92CZgkEEmzPNbwxZtErSALheykVFUC
NRf7DARbypQ6uYsN1gq2aDS7PXgHsHqyLU
NQXXi2YGnrHwwreBo1qAX1KMg62dwXTXm2
Ng7QRYRWjC2CHgKpSC62RmcPaHvVBUQWkX
NgCrLJsKBzcgCeqP3y2KcbMh9Xmb3KTUoe
NdAtdx6gPNqoaFXYPdB8BiH7WgUv82ZxAa
NXYykwu9uhTQxU4aYCmYhUkiPw6ScoDFyi
NgGDsafkyvz1HnbaLJ59GGeyR6XJX6A2CY
NfwBBT6xBNdp5zfbLBzeWmGCR96SeeSUGH
NVL8H9cNafATuwrUkRqS8LiJd5BQvJGwyY
NY72zubcR3cUCdzfbCJzcdRh8MMALNvAad
NcMJWniQNmCvxKJckSdJbnEph9xMNKx7mo
NZaK4Jm2V3QbPfDrQd2wdiQgSsPTbPi83Y
NM2isiFyb6WG56MxcVN521BimA3fMGTJL7
NdYXVHGG7CxrJTZfEDJFCWQUrYqxKsCXep
NW2pTdgeJWHgaeHyoowC128MSn926TH5Gj
NR6vRE281R7kJEQgzsSse6VRAe2pDmRVce
NNyyDCjXpcPNPdRDHyELw6kcJpP3L6YfHg
NhMxeuMHBUy3bKLzeECL3LvGMr9y5Vymxo
NeWHLwMfCk5JaG8aZTvcWZuBy4RaSVmCv7
NfKLz2W8FFAc9yF5xVu68y1NmMvsvweTyj
NQHp9jbbD4Kk6ME4vJ8SzdwjXBF3jfzHjb
NTBSym7nVDCTUUpEv61qYyM9DtRLWjL6Ru
NW5sngMxPBvFvnaD1rwRdVFffqESHbBGMe
NajsNPsr4KY1SuXjvDiJBz1NSPHnVnmP2A
Nhh6oomFym4KC2aup1C7ry4EKEGTaMFpBp
NdDPuGLyhbLFds8U4KmxcJpANPpGoPGaxB
NamV6qwwzGB3RTVSuEMsy4gjAYcphgZS3Y
NePQexkrTN2YzhLTwaiCTo4puwdZfNGnMi
NiqBs3NX5H4MBV6jKsSiCy4i3bu96xq7LP
Ng91VApHwYDoLw2XdhJU34vbWPwKpHTdJf
NeJoHpkPWDwkXoiCFUpzUbNwNCDmmYcAZk
NfyqDeaVUnV3aM4Qo1CELeh9VRsZBzsnu2
NdHbL5vaWFmBMSC3DKgChS3BvQvtSz9YRG
NQiqKh8rdt5GUcwuiB7wozfYPESwMjAH99
NLF2kTPRBk3ZeSapKVzcSV35ugLuYV9NBL
NM1itPcNzwb4kS62hPJSLmacEiymohufV1
NUcTw3P2vZG6wZ3PBpZPi8W22riBMEAEcM
NTy5dFaChytL6FpDDpN7Pc3fbm2ePiXDta
NVMoi9P5NfK6w16grnTAo8mwxjyjC91Kwo
NWQRCoxHe3hn6Qmbfc8mPX4fuRKCvqTyVn
Ne3gwE7j7ahm8qpwWmU2tED6Tpg9yJXWjv
NV9HG1yYqJQur9X28yA3mHxYWR4cRojGkG
NMfSaa1sBcvJ8N9hT91tViKjFCDYPEbDXG
NQf58FovF3Q14hQRByGv8EroeVm53qG7ns
NYgAU6c8ZttJewr8shPicEoi2K2Zzh6Yyt
NhJxM1zCwsm4SQQuRvW6zDsC9yivv6PdZN
NNwYrtyxG6xf6VDBkjYubFjnbN3fMyjVMe
NUgHMLd2KbgwgZ1osrjtN3XWvFiaNrHQSg
NRz3VJkTCnXiBDXwtrrAvzjXd2vgvo1Ew4
NToWC9fXf47ekhajq3V5gddUoV17CsjYqb
NN7BJJFntmYtJfH3A5pzVkh7Cizzvywnuh
NTmBQWAXLkSXNqr1duCgpMph3D6QZ42T7P
NVZt7L66NtUs27VDojhdf34DJxvrF9HSLR
NRxqWG1w6rnMydS6ZjPd5ERxc5HYuuGg5q
Ndu9S75n3z3F8ZdgJaY1ptexXc2ni4X12i
NVNzZ1xNuKgQM2jtRdCEA1CZHXn672Gh4F
NQ49EnEYLdra9nnmKCVdTbjdBJqRmJkVxj
NWcrVKJC4eu2uvV1oMvPvUjtWi3FR9kQqU
Nip8XQi6igPxeEynpUJb2117a1KvkvazVY
NZKW6gkeJZyeBiS5dW7WHmEuzTFyQcv6ey
NUdxArGBcm3nNLMGYpEjqkPTxiNoNQSpYc
NV4WfbecsMonkX8LKNR3yNWFeE1Vm3iJT3
Nf7RRLAW6dGGp7zaP1ku5bwPyDvbLVu3Lh
NLJPrdSvmx86gKCFRrVhaMs2zdNwCUAdB7
NLKxnKxmP2x58E4FMH3KMiUUhK5hF3gy83
NeVM3z6XtjLqpBY8w4j3i9U2zptDDcjymW
Ngx2W8fXW9pafhkqoe3zR3kSfFg1rLiNSC
NQvuvnm3P7kFL1vkiMk13Gc1XTpncHXmXq
NaHvP5PuZUeJn3p5S27pdnqy4Nae7pLhZP
NQYKkoi1ozFP4zptnmZxsHsgyJbhnjZvwG
NUXyqDLgehbsRSpZAomwPaLJ2rFJbm5npB
Nh6TL2BCjMoQoNJadum6MKbWFR4v161CQk
NegqVq3uoYJ4HzjD4cUDGU2ZFHgUv2HEfP
NfSpN87GXfySaBrvztwYYwTji2XmSP1Bn9
NavQmG4PGvSrY3QhEqGhZrJJD2fuzuCrn8
NKv1x4QeCCyDzuTEgsiJR2d4drWSDScavQ
NXvfPzdnTv75BgsaTdmaubaoaVwafT3ZNi
NSPkfkhjnWYqbWRZgoGsEmZwx2w2WY75wp
NS4B654au4e85EfMp8mmVBtEoghbng3pB8
NdkgivVTJCzQiGuSYSEEre2YtxaXGAYRtg
NVbfYCh5VYadwBpempNHs1LLjZpUicydmX
NegjqbCZRz1gXMhmcosmVdktStUmUZvCZm
NYVrEBayQVRpsv4MJPRxmiQPPa1BkYTBMA
NXtsLYyqYVLjuVBGNnVQPjmLFozJ46wS7n
NYs1Bw65RxVUiLJU9hikGXM6MVPVZRoMJU
NVuGhiCqNSETWjxwzrYUB7HSi3dCTm4tLC
NUYN4d8nHQdGkTtDRGYvQtzKKK36vRfAjg
NYr86UCt7N3noQeZiXWgfJ26kNEdUNJ777
NfdFWqnX1hE2Su1vRWmuDJZiMKxBZLNsRg
NR85EE255GTBv1bxUpTrUfzq2qPdrSocQk
NgNoDHkkLJVMw7uJh4JN9gBETFL39svtRM
NWzhKh8CPAujSHAJWSKCYf1pzf9Q7uWYr4
NTwSspBRn94qPwfTvfAoHcoosKbi479dvG
NbSYyotAJnrKx5X7MqcuteGRHzCQZVcSDP
NRVDCgtt3otmTeKhqEbM4dke9sBUBtBKBg
NXzVvnCx2BNMyx34yhnZv1Cz926jfqjNQE
Najd3QLh5K6oKpnp8DgR2xPTA6GrYNaMnH
NZvu1tEtsqfgBzyyFYJECyZCAkfkpwCn4G
NfoKQPFXnou8hqAcAzK1eQfbnCRdQcBZrT
NiGKSfdLQBh9Bpb55ecrRrhRsuV7fxhz49
NZ6qCVcyD4B7CmSkYFp7dpQauFJwxnqNDH
NbhjzG59yYNmVRBvP5SCrgt1WVuYyaL5i8
NfBwCAfZ1XqKJ8b6WsnSwq9xPKLKfwuWzA
Nj3ZfuT6DM7ao4DAydsaYaf3HLNohx3rAV
NeV2nbL1wD5hrwDUzoscdQ5RrUyJRKGRLc
Na3kWVdzmE4W21H48mT8Ai7DxbYvDkXzi5
NLZnZSGkYjDtxuuDesykqMGgSzDBZ46uC2
NSiakcLjNKkvLpa9DB3FwWyVsHUFHtCF5C
NQkXhf7RE7VJmCPsNd1o6kWS9LuYaM7FzR
NhHhL64A7j8484teVUxWWKtwN39Jwv5ch1
NPerQtaxFzVBkeSASodwnS34eeBhuVcfXG
NfnNukE5NxiJYdaB59XEFehdJHbqBCpFM8
NeLTU3RwHWegXGrnt7f7A8wiK6n19vGCMC
Nff6biTAks5KCMicg2GP2GRJfxhSqP1d3m
NTtPGeC1z9x6hpuRwAWJGDiSPg6GLDCj2g
NMZnGqCVQgtavQ1NrUB2QHhGm1C88RMBMg
NSsMcu2LSWSt7d169SHJ2U9xCCSxbzJDw4
NUwNbVDPHFPQBQe62k1nBxko96f4ogokMp
NM3YJRrupJzHToiK32ffoswr3Qw1JAUyPX
NMufQP7vJgsbon4rteUykZPi9Jj2HEAbAB
NgffoCMW9WT3zGdiYCKSdb8zffpbh8n8zh
NbVDPt4WAVJLRrdpnmqU9QKmCzaP1CqfJW
NR7gpPDABpBhj3ZZaeEdhkof16TJioGVjh
NYy416AfhDXP3H4vjfrv2ciHELb3U1N9iw
NfBega2QsqAKp8V4r3dntyvsdjrtJtZoRJ
NVbfH2abamy4y8PPCDwUeqJLXLWus9RviW
NbCtC2XgmTTehwZZEPLSwNfLdPaY74mfmv
NN7U429uiktZU6SRhrPFkqxD5ZHLdj2KBg
NLBPHSSJrzyLRWvWKQAVF6VSsAQNGGvJhZ
NNVmX3NSR1qb5NLxJ9CFmNuEWPFR7dTJ7V
NRAU996JCqoJ8p9N77QQ4RTxrpMRkrPjom
NMEizy1JqUwtD9qULZoKSErHbWcTb1gXYV
NPNTBVnuLwLpS1mjgEoUwA9koFPtp9Lb6K
NZA3mv8ndihvahQuFLiWiKcbZLFFRVD747
NUV9nmQDqSfj8EG9sfoYM3Um6uMEEheAFF
NMQvjXkqeSU2xwvsgCECNBCDTHRUZkvdKp
NNA9xG6Swduq2eVH7rikiR3QZSTgvGJsg7
NSbQR1A18Sejw8pyyZNmQqYh8CWs4iKvS6
NPfDAMZ56rUrria1KwsFx3HPYhyFom94YP
NgHewAUxfdDhUBPsog7vnamyFSn1XypC3t
NQbmEdUi32w9tgDk8movtbZVXVb2s5K8GC
NM953HdVFzmpyGtEjU9d3yE8zELogiA99q
NetynnezAGHKac7jW4qSmfxcqHGFNWdqYU
NTGbmoss4fBD18gxTdxTKRyQzS33eWJb71
NX9rLivNjYWQ7ZEY8y6sSqYif9BFkgTX8G
NRRFpbjXkmXMXEeUTRzfPfqPi47ibT4Et9
NQZiNMFpKSqmiaxgWfDFMS22g4DZPU6ppg
NabQ98J8sQP8VABMBBGtCtuc7z7MqDyGdn
NPAkr8RXySaJvAVqeMYqLB2PaBK8U7GwsU
NcDizsV7A1wWGyFvz2Nuywvas34j329tJ7
NeRaudFkqEhRGKmKZAEd39h4L8eQsoPfeC
NW9FC7VRs5GZrsmryb6JAud6VTgGZKYswM
Ne4aVH8rZKPDCVuRUpCAjDGgDfVQUCRpPg
Neq383eAN2EbmEw3TAzLKk6bq2gSLdZsxB
NPfdLE9gap18LT2qQaCciadb7Scb85cYd5
NRUYcDoYsXuMZSwQVpfKsBbae7deCMTti7
NNYYQ7ASxBBUWFdwms49X8DVf9zH4qswPF
NYcF2gNChcnbHykab4WpcpZXCDEyYWRN7e
NbNZ8bVz1ukqmu34qiesJ7NKv4H1RLFYrC
NPMXDyLP1jE5GtqKBFiuMLvaJbnw6KHVF6
Nhaacg7A5aMt8gYBbhSuDXApYHa45UgiiD
NbCbogtVkCWEu2gug4o1JTbWxs6GH9fY3b
NgDbjUKLjRRy6XNkyjXN5gUDd2F5DRGZ7F
NgR4nZSBjgB93woKgzzGhTydzv3DjGovWX
NXZGdWVHNMQHyn8mK5q3aVB7aCsD2CkU7k
NWyRTY8HknkbFTnGC2tvD7xnNCJi2JiHHB
Nhq1eBxaEZrH1uSeqDsw6DChHLF1EH3AYn
Nc5ft9hdstABB6zhsd2v2pt7jjnb3Qv8xm
NbJzK6Qe6y6QRfEK8eWugUab4ChuzqjVwP
Nh6zJqLg1X4whKrk8coqbA9qRPn3AVgcBu
NSV1bnwi44f2ddToVMYNRBGbtAGvAk4U4X
NMXTudHajbGFM3hPkEjgTZqDs9BcMUR4Fi
NfH21dZ8hnGGz9K2uk56NhtXM8fXjuo9Sw
NgrB5cRKgLtEQwFfzmXWENNSDxaqbbL4kZ
NL1NPcuEc1nWkdiavwhPUbNJYZubVkKacj
Ngim4WJ7v1nymXkjMKyFXddhjM4Sbx4kF8
NTMDtTdi2uENPXmy4q2p16PJvtGprScm2W
NQB3o7FuZyQMuZ2T3kMFnsAVFs7R7hsaeB
NNR6QvBei2Dwcv4MxovcBVGNvbyGEZV74V
NSoMSfhRXhCWCkW4gEWbEH7bNubSsPDWPo
NfbWTuqWDQMirio7L3HCeK2Vhe5891HK2b
NQ1MfT7i8PCYpr99775RRDygP4GRWRMzG4
NdC9ow9fGkGGt7XKS8xPN6cDDkj2zvzfRS
NTKCwHwDq4Y1eyxh8fk5iukPdxiJgzuLS7
NLPxeRNrDESoBZo2m9a3PU6wZurb29o7sY
NPbmTmYioAYn9BHdmP22ykuJvbxYfRenZU
Nd1ixkeD81AFnRZ2HFvAkgrqgrYfef1kJ3
NajbXGYaGR9wrdHZBo6inU4hVHCh6BhUvY
Nj8E26MRmmsjimJK6mrHeJ9Xh1fDn8wXP2
NVn2AkdvHboxKhAskczjQaEcbr9S3HNimA
NgaS4G2aqUhWzvNSXPNjfLuwU3L8Fn5hhB
NgYaggxQQsYaVtoMXUxrUA4TXrSdGEAWFJ
NYVS864Qw9PWkihwykWF2kGhn8mCrQns5X
NLi6Aiy4HbiqHJTGL5XLHNJTDmSvcMPKgD
NhwVZzhdSVaUFP1s3ofjKH81jRF8dJi95H
NfZRfsF7nq4KDKjcKgfSnegKcCGouXH6M1
Nb43niR3kXCwi9q9A9v8KuVzFnTp2SRu9d
NQyamyA5BWaXNZhJrAXQCW8TfNxthjKDZU
Nfih19xmu49rKsNXajRtSxc2BG4xxjgZY4
NPTXEx5vaDFY4f2JSi3R5UaHwW36Sn3yiu
NLJ1dpRA2LxVpxJpu1MAtPnGMZTnXHvUZz
NbVhLjKn8Z1dRGgrtDKTvPb1kggs7AXLcR
NR97vwKp7UefWpz1y42MRYQZjQonujYpEA
NTVkfNp1hjeLB94cuxExregfTXrVQuEF2L
Nb84uWAHDs8EkbFdpAMc82UPX6X52orYTq
NNpUSKAn6bJ1r67E7reXTP1qjyhaFBR7Gz
NLrcpzY8GjmuSRdKaH65Zbku4fEPC2qaAA
NW1UvArTQ8M6psJyZxTrFigrrWH8xcDNp3
Nc2xzemzYpaij8PgDAxf6XbFE2sipY3ztM
Nfg4truAowyc43aYyBP322qN5BxrbugWkW
NeRDHJKqWqsR8CPTjLnTsQ1zJvJs6A86sN
NRDevbPzC4EkxjnmJPrYk3Lf3QZuzZPDHA
NZVhyMUF8EPYKebK54CuE8tG2A8WaTg9Xd
Ne75wioZenGVRa78ZA6NUfaeMSvimdLBdc
NUr88AsxBUX8rZpmF9n99FCGtWNK18tP8K
NNvDG4MJY7fUcdtJ2m51AUEUnssFo1tBDj
NcE9CSAg2JZsYXMYKhybYgtj7zwjrv3gXv
NhQYqbunge1bWLjw2hDwsQsewYVBW6xCNN
Nhbcr1kjwGGNinN4J1BjLLgUBf8FDcDwmU
NgMtxdfTLd1GRojRMbnJjnq93kpi42a7YD
NLZA77Yj4VVWdEW43Jng4Tk3wS7G8myotz
NgiAdyAhU1SW6Xp9jwkpkK8McjspX7w3mr
NQr31nepeZkzvA4Wi2GcJJfaoRcNfVujvs
NWN7naJbVcE2BtUhAUu5xdSpoaZqKndGZY
NieV72fXwFY2En6tJAahuTQhaAwi15mPdT
NMqH1FFGRr1tdvvjtDLYm9UsAkuJHxR1Ca
NM9sVrTxyPAk2CKT2kEHi3JtXsJVmWKTiK
Nf18f2Epvy52XuVyW5A4CetshjCL1jjZeG
NhrQ5JmUGWJzM4s1HSREtZeAEN8G1UNGBb
NML1wBDciuCuXVPBd86w3PkgP8GpvnGTtx
NR42EgFRhv23JX2SLo8tTi25VLduDCS7RD
NQPfPPdW7RqRRYVqTzfHNtJjzdwcZVDZGi
NbHro3JxJsbmC9Hinrx5DpwMJnjkKjzhMT
NbZaDRp5XfqsFyTRyt8Xj1PXEMZFrhwitU
NYYTrYAipVgde2pLsQxzXRpN6cPDiZbkgP
NQGjpgiaCrNFUaTY9AUz3kio86nrTQ6JwJ
Nj2n9wZ1X6jv2SdnPmZARaaJN9CCWrCVFX
NZ4CoKsQXfMpDi6tBBi8b1Wsh9YtuPPwUP
NRQWcwF8Fu1Yn4myu3FykeC6s3xTCwzT4A
NNDYEa6e9rFiqUPjA5aiEmp5sHwbhpB1yn
NX2zhkxz71V1fSsidtNjmigexDtmmVUGdM
NdoRzBWHC9N5wWpgPEW5Dqc4anUGZWtmZF
NcRY9hahkuCu92Q9pM4Mz3RZo9UkkTbdms
NKzSKuNJ4rwbhDASH9aj62CePf4w3jHjwW
Nc2srxfVi5cCXAHGJMMTyxxZeua2Zq8jUc
NNcmkTUjWzFRVu26mDuJF4YAYReVUc3hjG
NbspGFXzkZE6ZXoXfUqhfHy1wZ3n9pu8s6
NhvGgp9ycCLoReCbEu1prw8PL8ccG2wpw3
NcEADk3huJ7646Mk4dWpcPmfFhd2mEXyzy
NXXQbP16N6VPwt8pKmskvn6KYxFT1ZqWPq
NawuZJaCcp6A4gEzThdDpSQ8zVmHcGztns
NYDdnkETN76PAGik8Uv82cx9ifrARQxbSt
NgpEE5eHbxsnhytd8rccdPJVq8JtKw3Bib
NPc8MAW7Mgw6DqrSu2o4h2eZ16P8WdJzjo
NS3Ep999U8KanqZP9sMEEhMSqq2zZZjyBJ
NeS8AinJixSqrhUA4kjHbFKmi1bBMzueo1
NiLHkywtQ4waezVAS8mtXenKRoiDYfV2YE
NLv7GHRQ3HuhbJWMuTVLWAyBox5bsMZCXf
NMnyxH6yH64STMTdskAsKh4xcL5fixfK74
NeSoAJPQMqasb1ShLc51nXCsgUcHocURFx
NWunvThX7BBLyrwwZxujuoksPDs6mp7SM6
Ng8MbL1GqydNAPyWZkTm1jCB9SDrgm8DW7
NWkRhvUxnbfofdceo86bVjcfQgv5nMPqmo
NhPfm9LHmvUtS1ie27iDSz386G6DoAczHj
NPbGTSQP5d5QYG3JWzZVf8u3u6CyDKdowY
Ni7UdV2HBztAfcJJJahLSo7i5fRTUkQLab
NMqAv1BnzRLE3mtBgqAEWHDcHFRFtAevdn
NeBLY3AzjrYqvj6EbbAhnqsXPamEwNvAQJ
NQgaXUqvJbXN3LcrTAvwKy7fJv99Vc1sAK
NRu5uHmyW5fwsdVZAzsbMEQriJb63d4bCx
NbLg5GUqE69Fv4vvtwe2K54PdshdJyCj7r
NUqBNMjVaj8WT7aw9ZJKUcVVoyCEr4FtE7
NUXaU5JMzb5DdE6QWjkqbK6nPXjf6ATzA5
NcPntYoE1ZBV2nagZfXPn5osJiTqmVEizd
NXdkmBjNaGoYGR6xEF467oLcHyGJ7K6k92
NUdPH6EAqmUVQD8mUzi7r2iqXsSHahGddb
NRTePt3ssfsLivQbosjwXMhTJjb9PzR6hS
NQEh8ZUcYXekYmA9azkLZMqFEaK6HcJ5Hu
NUnUoG7t8habkSHg9wkWPtDNSDZEpDuqTC
Nhnfy8JTwPnJi7KVLbb2RUQbQ143dMT1VQ
NQhKVubqNcVrbJ2hm9mAuiqetUuhc3ZKHR
NNTy6pST7JcBmqnXvgb4Acrc4ThQtqqWpm
NdUyZEk8MG1nsyqhKnhrobFBNNwJshoGm2
NPfvdK5r5mSEfhrNBLGpWKqGjCoEiAEBv9
NP8Z3MCZVCoNVjjkPoFfaDyS2YTEwxzr2J
Ncn54ozxBpEdTkLfsYA4kL9MbTpp5DyF62
NaDG9eo2FfvXpjJETKCkt8VrUdVUJvugah
Nd3Hok5wcMckbAB51oUFWc25u87Kvmw9xv
NUe7GX3kmLn1MCgMXMosqY5VP73xCjEtXU
NUQfY9H62PNiCM2HMkd6jjeBtcyckkvTTj
NhVaQcf8rQVbYW4tex61i5jRSgTHTLqYtc
Ng3uscDGeFvUmWgu9i22DyPQ12aDQq5dnC
NS9UdRUz9miAQFBhTDneeRzaD9enhsDaKC
NVyDtvA7agMQDe5Wy4W75KNr1qeyLat2jV
NXvZ9YDNzaCPMAnJ5JSXVARpC1dQYpSJS7
NdBPXSRnjv9EdeRJXYgJpqqPiFihH1S1Vq
NQ59WK93t8ff9t7vEpbE4fgEENBjG3DxLE
NSyWcpitTRteJFDdvdjDRf6pHbPEBXffb2
NPApWZ2cMPZvKGkW21rg4ajTz48yG1Euqa
Nbh94VzNXYuvKpxdZ81CBAhVAiH8nkAoaW
NQwK2ynqU5FvDzRFbHTTub3aWcsLmmFSYJ
NZ7GfBMVQjBusRhbKque6snFFMK2MKBkJN
NTMvrSQHdwez7gEW8mVZvvz15KpS9SgkSJ
NiNXkmwrzAB1zxWWifVDChZJbnAR6wCaJn
NaH14siSUxiUvhr7Si33Yi4yyrQHKd91bd
Nanjvopw37oYLxGaEkQPq28Via7zYiwQFv
NWEFZ9G72n8BsbEzDbFLTogBPFeWXv14k2
NWURQmAHqAmDuh4b4Ev7Dog6yL3RUTMkT5
NhfVckicfSgRzD6KRWbW1FRkwqeP5XAcjy
Nb2mpvBFFdQEJa2P5nLT36UQBz7LYCzaf6
NSrYK2e7SqMEumNXL6XMTUiBVDzSHuUAah
NaMNabjaySfPVFxG47U9WQYF4qtLvboHe8
NhPrQL6pGKYkyznUFKdGvTx511jvLKaSom
NYAscXwqgENwymM5V58m7eN4uuWyXrqL3c
NXTTMw7s3VgAf2yntzYABwbFXy1WW1f11G
NcH5goFwsxHKUywV1U5obL5K4GzDuEMFge
NV9Nj479xVFGDgbVqeDxdTHfBnqwTHWzNS
NX3uSwqDt3UXAKsVNt5AFRY8ECxcLXRmyc
Ne2L4C2UVMWrxnG8nsxkG9bixHuMcWEHcT
NQiMGfxCVCEVLj3ChURjUrdV2jUZusGNJP
NesecGnAHArGGmWfKjBZJHaKfitzJcwSeb
Nh3qPKDnRUhDtmsYZGTxWBJBzKRCVs3rUU
NW4CP7Pdedq2c9BurzH4C9mzJLwVSJo7u9
NeE8F7ZLhnFbMk3f8ZFV33kmvbA7JR1gek`
    const transfers = addressRaw.split('\n').map( (address) => {
      return {
        address,
        amount: 0.25
      }
    })

    const item = new Item({
      account: ACCOUNT,
      node
    })
    const res = await item.transferFungible({
      tokenScriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      transfers
    })
    console.log(res)



  })

   */
  it('should get a token', async function () {
    const item = new Item({
      account: ACCOUNT,
    })
    const tokenId = 1700

    // claim the asset
    const token = await item.getItemJSON({
      tokenId,
    })
    console.log(token)

    // const txid = await item.unbindToken({
    //  tokenId
    // })
  })

  it('should decode a scan and bind', async function () {
    const scan =
      'https://itm.st/ap/1cf8?d=BCE2OoyqWiQ5B7GXmvqEo3Fw.kA6jnR4vwDtYGW5OBXEB6y4Azw7TS.Qr5wkUJC_rsGMAr7ejXyqiFOSBaO_0rcAAAAABTBFAiEAuDMnjze.0McjJAXhCd3FI3qR5qghWkzwGjp5hZ0oxz4CIFPq0DX4s3u1ele3Cs.c4Y2bk1ElMudz89B3itzciIkE'

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const item = new Item({
      account: ACCOUNT,
      node,
    })

    const decoded = Utils.decodeNDEF(scan)
    console.log(decoded)
    /*
    const txid = await item.bindItem({
      tokenId: 1769,
      assetPubKey: decoded.pubKey
    })
    console.log(txid)

     */
  })
  it('should bind', async () => {
    const raw = `02b2de11fb3dcedbd93e82c963ff7333705a85195bdaa7d927a925a8d9b50850f8`
    const startingTokenId = 2140

    const item = new Item({
      account: ACCOUNT,
      node,
    })

    const txids = []
    const rows = raw.split('\n')
    for (let i = 0; i < rows.length; i++) {
      const key = rows[i].split(';')[0]
      console.log(key)

      const txid = await item.bindItem({
        tokenId: startingTokenId + i,
        assetPubKey: key,
      })
      txids.push(txid)

      console.log(startingTokenId + i, key, txid)
    }
    /*

    for (let j = 0; j < txids.length; j++) {
      const log = await Utils.transactionCompletion(txids[j], {
        period: 1000,
        node,
        timeout: 30000,
      })
      console.log(txids[j], log.executions[0].vmstate)


    }

     */
  })

  it('should hammer ghostmarket', async function () {
    const item = new Item({})
    const ts = await item.totalSupply()

    for (let i = 1700; i <= ts; i++) {
      const tokenId = u.hex2base64(u.reverseHex(u.int2hex(i)))

      const data: any = { data: { chain: 'n3', contract: '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840', tokenId } }
      try {
        await axios.patch('https://api.ghostmarket.io/api/v2/metadataRefresh', data)
        console.log(i, tokenId)
      } catch (e) {
        // @ts-ignore
        console.log('   ', e.response.data)
      }
    }
  })
  /*
  it("should run light authentications", async function() {

    const sdk = await getSDK(ACCOUNT)
    const mockITEM = await new Neon.wallet.Account()
    const client = new Neon.rpc.RPCClient(NODE)

    // verify light auth
    console.log('light auth')
    const targetBlockHeight = await client.getBlockCount()
    const blockHash = await client.getBlockHash(targetBlockHeight - 1)
    const formattedBlockHash = u.reverseHex(blockHash.substring(2))
    const sig = Neon.wallet.sign(formattedBlockHash, mockITEM.privateKey)

    console.log(sig)

    //verify that the item is authentic and the signature is unique
    try {
      let txid = await sdk.authCommit({
        mode: 'default',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: true
      })
    } catch(e){
      //already scanned
    }
    const log = await Utils.transactionCompletion(txid,{
      node: NODE,
      period: 1000,
      timeout: 60000
    })
    let res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.isTrue(res)

    try {
      res = await sdk.authCommit({
        mode: 'default',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: true
      })
      assert.fail()
    } catch(e){}
  })


  // fix me
  it('get the epoch', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getEpochJSON({
      epochId: '2',
    })
    console.log(res)
  })

  it('get the epoch', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getEpochJSON({
      epochId: '2',
    })
    console.log(res)
  })

  it('should select the winner of the silver ring', async function () {
    // initialize our collection prop instance
    const collection = new Collection({
      network: types.NetworkOption.MainNet,
    })
    await collection.init()

    // our list of options that the network will be choosing from
    const options = `@neowatcher123
    @KeiZhao6736
    @Rheoknudson
    @jeff11818944
    @HeirloomH
    @0xmilosneo
    @GrassFedGuru
    @Fio02618066
    @juandav95015799
    @sikasi9
    @Crypt0Babylon
    @LucaLatini
    @BouzN3
    @OnyinyePrince2
    @Matthew20Rex
    @kaci96142066
    @console_player1
    @Hodl4L
    @zatouroff
    @Ikechuk042
    @mayonese_sw
    @JpLerossignol
    @NEOGASM7
    @Emmanue58895257
    @hq_vuong
    @janinmsq
    @iam_Furst
    @Jhonata18254670
    @Rodes_Neo
    @Joris79D
    @JudeJuwon
    @NEO_R1CH
    @JirkaPech
    @CryptoKnorry
    @Fakiledetimile1
    @AW153_xyz
    @schlummer2k
    @real_Mr_google
    @GreengoXrp
    @Lucash2763
    @hectorc05
    @Emilio90739075
    @Neo_Blockchain
    @GreenfinchApp
    @JanTY23
    @solokrisofficia
    @kriptoyasina
    @koinarge
    @Jhonata18254670
    @NEOFORCEONE
    @ercliow
    @DarkGoat_Neo
    @Mohsen8239
    @KeiZhao6736
    @0xmilosneo
    @GrassFedGuru
    @TheJollyHodler
    @schlummer2k
    @roschler
    @janinmsq
    @Emilio90739075
    @ChungaLunga10
    @Joris79D
    @whoamiiran
    @mayonese_sw
    @dalstish
    @iam_Furst
    @sikasi9
    @Ikechuk042
    @OnyinyePrince2
    @AbiolaDogara
    @Matthew20Rex
    @kaci96142066
    @DimeRonald
    @john_devadoss
    @gincryptonicgm1
    @KacperSuperson
    @JudeJuwon
    @Kvngiyzz
    @Fakiledetimile1
    @KSamjoe1
    @Lizzywealth5
    @Victori42413719
    @testertje777_OG
    @EnronsHome
    @solokrisofficia
    @GrabowskiDylan
    @real_Mr_google
    @FlamboyantFLM
    @face2interface
    @whaledh
    @BoavYittan
    @BouzN3
    @ColumboTrader
    @NguyenL06969144
    @Rodes_Neo
    @Carol80010563
    @Emmanue58895257
    @JpLerossignol
    @QuirkySoulCLG
    @JakeEwol
    @Blessin40211672
    @kriptoyasina
    @78avt
    @Crypto123454321
    @DevHawk`

    function onlyUnique(value: any, index: any, array: any) {
      return array.indexOf(value) === index
    }

    const uniqueContestants = options.split('\n').map(o => {
      return o.trim()
    })
    console.log(uniqueContestants)

    const contestantsClean = uniqueContestants.map(item => {
      return Neon.u.sha256(item).slice(0, 4)
    })
    assert((contestantsClean.filter(onlyUnique).length = options.length))
    console.log(contestantsClean)

    // pick 5 from the list of options; do not replace the selections in the options once selected (no repeat selections)
    // const txid = await collection.sampleFromRuntimeCollection(contestantsClean, 1, false, ACCOUNT)
    const txid = '0xd32da8dea67aa376297020d8fabd2f55a78edd1c9b5169d5fd26ad84561ff4c8'
    console.log(txid)

    const applog = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 30000,
    })
    const res = NeonParser.parseRpcResponse(applog.executions[0].stack![0])

    // its a good idea to log this for reference via https://dora.coz.io
    console.log(res)

    const i = contestantsClean.indexOf(res[0])
    console.log(uniqueContestants[i])
  })


   */
})
