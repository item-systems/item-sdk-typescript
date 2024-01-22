import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
import { Generator, helpers } from "@cityofzion/props";
// @ts-ignore
import Neon, { rpc, u, wallet } from '@cityofzion/neon-core'
import { assert } from 'chai'

describe('Bind on pickup', function () {
  this.timeout(60000)

  const mockAssetSig =
    'https://itm.st/mp/2485?d=BKe44xyvvjiuea6NGZMK4bXYf8rt3vECOR' +
    'KT1LDHbg60TFnhqX0V2xiSfUaCy79x3.Oc9B5xA6.ncVDq4l2WVVHMHbzVU8Jl4eHE4rlQc5ES' +
    'umQWLuvBnpgwLPuPLHadiTBGAiEAsXfRcaj10m0OXj4i0XmDy2lyqrocFv0kF9PaL3C8hSgCIQ' +
    'DdrRMmAfaZN79yTl4hUnpHToPhZfMyMYDp69pkIHjD2Q--'
  const mockAsset = Utils.decodeNDEF(mockAssetSig)

  // populate with contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const claimAccountA = new Neon.wallet.Account('L1yL2phrYR6PbCz1auvCUk5rqyPB8iqEq1wf1xibJuUtvwiAYT5c')
  const claimAccountB = new Neon.wallet.Account('L41qFGsuktHsJWJAWzXprMCtuoMyz9CDA5ZqRG8T1DQn9ZjNjCCj')
  const claimAccountC = new Neon.wallet.Account('KxDVupafdhghya57boXvbZevh61nFzJCCWFb2swuVbqBuDLBz9vm')
  const claimAccountD = new Neon.wallet.Account('L2t6CPFcKoB15cdGD4ybBMbr9Qx8vJ8zT1s7WTPtDNYzmJxzrZZE')
  console.log(claimAccountA.WIF, claimAccountB.WIF, claimAccountC.WIF, claimAccountD.WIF)
  const scriptHash = Item.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  it('Should generate some keys', async function () {
    for (let i = 0; i < 8; i++) {
      const w = new Neon.wallet.Account()
      console.log(w.WIF)
    }
  })

  it('Should create a null generator', async function() {
    const generator = await new Generator({
      node: NODE,
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9'
    })
    await generator.init()
    const newGenerator = {
      'label': 'empty',
      'baseGeneratorFee': 200000,
      'traits': []
    }
    const txid = await generator.createGenerator(newGenerator, ACCOUNT, 10000)
    console.log(txid)
    const res = await helpers.txDidComplete(NODE, txid[0], true)
    console.log(res)

  })

  it ('Should get the generators', async function() {
    const generator = await new Generator({
      node: NODE,
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9'
    })
    await generator.init()

    const total = await generator.totalGenerators()
    console.log(total)
    for(let i = 1; i <= total; i++) {
      console.log(i)
      const gen = await generator.getGeneratorJSON(i)
      console.log(gen)
    }


    const ok = await generator.totalGeneratorInstances()
    console.log(ok)
    for(let i = 1; i <= ok; i++) {
      console.log(i)
      const gen = await generator.getGeneratorInstanceJSON(i)
      console.log(gen)
    }


    /*

    const txid = await generator.createInstance(16, ACCOUNT)

    console.log(txid)
    const res = await helpers.txDidComplete(NODE, txid[0], true)
    console.log(res)

     */



  })

  it('should get the tokens', async function () {
    const sdk = await getSDK()
    const total_tokens = await sdk.totalSupply()
    console.log(total_tokens)
    assert.isAbove(total_tokens, 8)
    for (let i = 1725; i <= total_tokens; i++) {
      try {
        const item = await sdk.getItemJSON({
          tokenId: i
        })
        // @ts-ignore
        console.log(item)
        //console.log(i, item.epoch.label, item.state, item.bindOnPickup, item.traits.userDefined, item.asset.length )
      } catch (e) {
        console.log(i, e)
      }
    }

  })

  it('should get the epochs', async function () {
    const sdk = await getSDK(ACCOUNT)
    const totalEpochs = await sdk.totalEpochs()
    for (let i = 1; i <= totalEpochs; i ++) {
      const e = await sdk.getEpochJSON({
        epochId: i
      })
      console.log(e)
    }
  })

  it('should claim', async function () {

    const sdk = await getSDK(ACCOUNT)

    const mockAssetSig =
      'https://itm.st/mp/2485?d=' +
      'BFQ.Bi96A4sqRoch1JXWZBg_qpIgVACAdsLdBfRuUiYIKOK9WfAzktb4URzCAOc3RcPyBbO1kztyfgEPgVRMzD4dOESWdXtd.D4MLCkFSJVPre8WEeY37wSAGGMFsXhEAjBFAiBJthYtJ4wWvcKjM.fxFa9DanzjHPi16wnPIeql95dh6gIhAPGLo15H.LDWeNtcmEolzNN9SWDX6REN2OYNeIydNr9W'
    const decodedParams = Utils.decodeNDEF(mockAssetSig)


    // claim the asset
    const token = await sdk.getAssetItemJSON({
      assetPubKey: decodedParams.pubKey
    })
    console.log(token)
  })

  it("should bind", async function() {

      const sdk = await getSDK(ACCOUNT);

      const scans = [
        "https://itm.st/ob/2485?d=BD0ub7_svDrqmR2Us4JRxcpE1_t3mWetSWeXMMwVGLxjBgekRcP80VHuQ2hfJ7RsWAiEuIZ93uMlwWfmo8NZR1Xp_9YiC9eSdvhio5d3xt2uO0s0yp8TTz5jSXaruHU0MDBFAiEAqkT200OwK09K5kRtkgXW.a.qQLNu4F0JfszSLfFHraECIHI2NHq3fujKE8nUqFkWYQ9TyHH9OTT1vp.lpg7OfYn_",
        "https://itm.st/ob/2485?d=BIaqkORqCLZWD5ZR2FAu1m3mZ0r3qPXObrT2_OfM3tJ9LGidzEkHlBNAUFSsH5WKoCsZIdUHkn8OUXOu2MKE9YNcgPD3d5GK00M1IpqWzoJJ.1UmaCdffjaExqh2SNNyCjBEAiA_XdlIUu8jJWLcxX4WZUtiPsS4iYoGd5vRaKWd.frx9AIgZMf6au42IsoFZ2D9KnmCy.QuhlF.HqSqV3Z_RxqQ1sA-"
      ]
      const tkid = [
        1740,
        1741
      ]

      for (let i = 0; i < tkid.length; i++) {
        // claim the asset
        const decode = Utils.decodeNDEF(scans[i]);
        console.log(tkid[i], decode.pubKey)
        const txid = await sdk.bindItem({
          tokenId: tkid[i],
          assetPubKey: decode.pubKey
        });
        console.log(txid);
      }
    })

  it('should get a token', async function () {

    const sdk = await getSDK(ACCOUNT)

    // claim the asset
    const token = await sdk.getItemJSON({
      tokenId: 1740
    })
    console.log(token)

  })

  it('should get all the engineering samples that are bound', async function() {
    const assets = [
      'https://itm.st/es/2485?d=BNZoxRFt82mfTvLygJowolK1XpC455QPbhRRsJotFbQFKoYYLVVdbhU28ser5FkOLbB3F8AMfXZ7QwdNPTnkxTUKacpREUo8enNaVZkCm.nRpHwcnlJVDHLL5aOuCDkTcjBGAiEAsy1pz926T_PJj5DOdC3_CEabIk.WXkAQvYR1S_._r3cCIQD3_7SHAQykCMGU1ZaNAYiXXpoCk0S2cBMPtyGILzsQOw--',
      'https://itm.st/es/2485?d=BBH3H7EYyQ4hS6H511D5UGWFQksVF3bSNkgXBs9r6R56qyST3lJMj.Z.3Jb35Yv2.8KIkroEnTMKQZFM7HY__roG.mnY_t7GYPP_RFQegAAEt5IeYWtkP55O76A_IYmGZTBEAiAz5lKRIw4RyJb4gM4TKhDzoz3Hq9e6meB_ME74DYz0_QIgNtndcvsO5.0D33IxkpHg8gtscVDPH9zIGKEsGcBdfPg-',
      'https://itm.st/es/2485?d=BGbobQjeb4m3pX6PkCdX5k5PhcwIi6_0SlL6qQfOgQwO.9VLO8iwwrLrF0eJVB_Posda0WK6EEfCsC.G2AKCO331rkORzDnq.0ltv1evqp2_n3DgNMqP6W5ea3VFvbXO_TBGAiEA6Z9TSxjsLC_QgVKCGN3gBUiUwx8apQkZlNY9MO84xckCIQC91OHHIsWCetmyuMMP8wlf0MGWEZTBlsBADdWAjyX57A--',
      'https://itm.st/es/2485?d=BBAGomtYHNLH7obDky7kLAVDu5hqVB.qXJ2hyFpTflhQJ.7VoaA2ziYMMF4E.19LulUD_JS3yIvYT11GbgkqegIMlyABX.U293tCkId3Povr9lUnd4whQ1nmYbUGt6zDWzBGAiEAr3WVjpIYLyUoVo7F.vDkaGcwMI_VfFGdiNQdWEhRMCwCIQDhd1ZhH.k5OQj6bB6R2seM5vKApQmtOnjm23hYj5vkSA--',
      'https://itm.st/es/2485?d=BNToS92SJUgr_O7SipUpkEG8Z6FQCfwTjN8Nb1oAGiK9RX0Kq72MNCiS.fNWFjbKcfwniXnCS2WFY_uyUmZ2k3.nZ.O8hJVkHsuPiYb_BxczzyU0HgflewutFfxTCwW9djBFAiBk6XyKdoAfnG4sNlSeFI0d02_JmWlnGSSR6eL7znghRwIhAMX49uPPxHXHeanZahwWmwgg6hSWFLehwS5I1FzbWLH.',
      'https://itm.st/es/2485?d=BFQ.Bi96A4sqRoch1JXWZBg_qpIgVACAdsLdBfRuUiYIKOK9WfAzktb4URzCAOc3RcPyBbO1kztyfgEPgVRMzD4dOESWdXtd.D4MLCkFSJVPre8WEeY37wSAGGMFsXhEAjBFAiBJthYtJ4wWvcKjM.fxFa9DanzjHPi16wnPIeql95dh6gIhAPGLo15H.LDWeNtcmEolzNN9SWDX6REN2OYNeIydNr9W',
      'https://registry.item.systems/?d=BNZgy8SlcqUPazKCagLZOSB2YcTymWl2vlUmWFFWpcEV1vVIV4cAc6by.gJEmydHRCQcdj6416uA1NCEDjtQDupFMeT2mWztE_c25wWEiHIM.vdRPROBzY.5T7JYXlYqfTBGAiEAmUedUDqZH2WfaqyXyiyJqUnxtPlC3UkpX0WVh8cnAaMCIQC70iquxjWqVKLaanRhwbq0KEdCeJyhsijasBHLDognbA--'
  ]
    const sdk = await getSDK(ACCOUNT)
    for (let i = 0; i < assets.length; i++) {
      const decode = Utils.decodeNDEF(assets[i])
      try {
        const tok = await sdk.getAssetItemJSON({
          assetPubKey: decode.pubKey
        })
        // @ts-ignore
        console.log(tok.tokenId, tok.traits.userDefined, tok.state, tok.bindOnPickup, decode.pubKey)
      } catch(e) {
        console.log('unbound:', decode.pubKey)
      }
    }
  })

  it('should get all the bags', async function() {
    const assets = [
      'https://registry.item.systems/?d=BLA8shV7kNhuDeuIcGe_1.cCSWjZynGF7TeAG3gRcH5yn37RRmWZTbbXnG8b4oB7pkFtRKbwRq_mTtmexafa48bjyEindzK3jT34qL_rQZoQacMRmGEe7rkI3jjPvoAc6DBEAiA3yarF0IarRuRRNUZOzpy1NCV1OuVUW8JNSQ6vyEnBnQIgal.9pPxRt_tNJ1d5R13GFm6RvGWQQXmhtsdHwZFWChM-',
      'https://registry.item.systems/?d=BLtDH2JDCjVSKkU5YByEEPDdEYEOV22jOEMEs_R5vLJZgNBD5tEaDKJAOFJM3JAA8kUH76GM83R6np7Io2ppmTKNl_H1GXl5a5L1m6.G2m.8zJUoygCM6tWe1NERAnQWAzBFAiBOnEPJynY6sLdRbYst1iVqjYlMruJ1Apt3S7ymx8sdiAIhANWFblDtNK04RPgtGOoDyrMsJU3hoO8lOVsgFQqy0z7h',
      'https://registry.item.systems/?d=BAsBlYqpY3X2gAFwWxlcZIU_GPNmPQFHjcw4lGJkKG2jrZ_WKyLkgVA2GuIzekbo0mLCPR1s1UcETzYw4sl02fRWMGBgR6j7OchMnSBipxm.bhvrgwhS5X3cdjA4b94EBjBEAiAY.rDNBJ79PZzHbUhpymUg5cUQW_MAlqRt9y6G1sFnDAIgeYl..ipHkCDQtW2v5cOpB74xeZRWT2PIm1kxvvah3Bc-',
      'https://itm.st/bh/2485?d=BJBnyGXn2BHHVdlCmupRTV9uLT4qUErtSnM3C3irDgi4X4g2.c58zJ224VPMXgjHC0A4WNi_JWLdaQIOP3xZx1ivyygTqkIDeSw6vT7EoleF2d_2jVxYSyN8PTz7uIDpjzBFAiB6r5wc9t5bNT51KgB6JIm2ZCuoOIPOUZZdXlhihInmaAIhALmi_zO29jgYHJOOpNzrE__WQavDzqOhKt0I_xEyCoYF',
      'https://itm.st/bh/2485?d=BAv08K6jDCSeAUus3UfBMmzqoYj2waPjo5mznGy7VakjM77xMpQ4T6orFFGUYuqBubULtXMNc6vPGLFG3lijFWDY65AO.sKLSlfcYdO14Qijj6vUhy33mnC2KxuFnOFBlTBEAiA.r_HuOGfMXS.LAfFLuelO.s5r5x2UVyPKjARh2Qpv.AIgTOAWZZP5tzhReThU9lZaSCYFgtFMSfR1BMMvp0EO__M-'
    ]
    const sdk = await getSDK(ACCOUNT)
    for (let i = 0; i < assets.length; i++) {
      const decode = Utils.decodeNDEF(assets[i])
      try {
        const tok = await sdk.getAssetItemJSON({
          assetPubKey: decode.pubKey
        })
        // @ts-ignore
        console.log(tok.tokenId, tok.traits.userDefined, tok.owner, tok.state, tok.bindOnPickup, decode.pubKey)
      } catch(e) {
        console.log('unbound:', decode.pubKey)
      }
    }
  })

  it('Should define some user-defined traits', async function () {
    const claimSDK = await getSDK(ACCOUNT)
    const tokenId = 1704
    let tok = await claimSDK.getItemJSON({
      tokenId,
    })
    console.log(tok)

    const txid = await claimSDK.setItemProperties({
      tokenId,
      properties: {
        carapice: 'hard plastic shell',
        color: 'white',

      },
    })
    await Utils.transactionCompletion(txid,{
      period: 1000,
      timeout: 30000,
      node: NODE
    })


    tok = await claimSDK.getItemJSON({
      tokenId,
    })
    console.log(tok)

  })

  it('should lock a token', async function() {
    const sdk = await getSDK(ACCOUNT)
    const tokenId = 1712
    const txid = await sdk.lock({
      tokenId
    })
    const res = await Utils.transactionCompletion(txid)
    console.log(res)
  })

  it('should unbind an asset', async function() {
    const sdk = await getSDK(ACCOUNT)
    const txid = await sdk.unbindAsset({
      assetPubKey: '02bb431f62430a35522a4539601c8410f0dd11810e576da3384304b3f479bcb259'
    })
    const res = await Utils.transactionCompletion(txid, {
      period: 1000,
      timeout: 30000,
      node: NODE
    })
    console.log(res)
  })

  it('should unbind an digital twin', async function() {
    const sdk = await getSDK(ACCOUNT)
    const tokenId = 1703

    const txid = await sdk.unbindToken({
      tokenId
    })

    const res = await Utils.transactionCompletion(txid, {
      period: 1000,
      timeout: 30000,
      node: NODE
    })
    console.log(res)
  })

  it('should transfer the token around', async function() {
    const from = ACCOUNT.address
    const recipient = new Neon.wallet.Account('Nd6cDV3rtfTCyvttEVvyhAgEbrUs94NEHq')
    const to = recipient.address
    const sdk = await getSDK(from)

    console.log(from, to)
    const res = await sdk.transfer({
      to,
      tokenId: 1736,
      data: ''
    })
    console.log(res)

  })
})
