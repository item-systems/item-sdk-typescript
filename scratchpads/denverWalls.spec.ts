import { Utils } from '../dist/esm'

describe('Denver Walls Scratchpad', function () {
  this.timeout(60000)

  it('should decode a wall', async function () {
    const sigs = [
      `https://itm.st/mp/2485?d=BBWyB.av86WqqrUYlgq.jpElIljEtFqlODIkEuBEFPW6P.trmLtO1hHtavicgRqbvOn7tAeqV_Lf_rQW.MKqaTjbQQUk6UtUH6Zvuybm2RuUuEXSvJYFENXnSFMr5D.GbTBFAiAivM1Bd.BNIw27CKT5gU95bSF5xhgcAOWCgLWnmxDVpQIhAOG0R9CBThqE9TANitBO8qiEtjD2tlBokLmKIYWlvnRd`,
      `https://itm.st/mp/2485?d=BKe44xyvvjiuea6NGZMK4bXYf8rt3vECORKT1LDHbg60TFnhqX0V2xiSfUaCy79x3.Oc9B5xA6.ncVDq4l2WVVHMHbzVU8Jl4eHE4rlQc5ESumQWLuvBnpgwLPuPLHadiTBGAiEAsXfRcaj10m0OXj4i0XmDy2lyqrocFv0kF9PaL3C8hSgCIQDdrRMmAfaZN79yTl4hUnpHToPhZfMyMYDp69pkIHjD2Q--`,
      `https://itm.st/mp/2485?d=BNJR_UHEFWzw8B3idZejkuix7MECDtr4x3PPicaT.22ceaIMQ27lzaV3ByNd3yA9hD1kCBcpWHAee4IGp_hcarRY0SF2WQ14eRIxrZ0qREqcyM1I3RVnRGB6Ua2ZcpOHVzBEAiAXXajQtGdtUUekcfzrGH1kiQ96e9oZkKKX62nBAQXdjwIgFWv6gKUpKor0a_X5ytYk6Pu6iqwL.9wyFaMy5IBq0KY-`,
      `https://itm.st/mp/2485?d=BHf2tLG2b0eNzUn1E7p02fy1b0GxK0B2Ki5FAt2c22P9iogZMht6.QgI.8hjj9tcAVEQxHGP18wrYrJXL4.cA5XcO2cB4B2P9zEctRdBM9SRqHtjdmIG5wPdFytm45ijtjBFAiEAp4AQP2.xaDbTdevPQdrPhT9.dd_7XQ3r4mjYjd3z.zYCIE8sJ.mzMF9WkrKDlW.dSHSvzDmevNV4g34lspcJN33V`,
      `https://itm.st/mp/2485?d=BH.MPj7lmgeXynkAFcgVLdHN1wskGv.F3lyqMTmTVxrUSKvLQ8PhPtnf5mMLaUUmL2i64iRqTpzjefyWF2uQHq68lie6oZixEZQ0XKuk8P7t6sOrcVIpZmBQIuEVvQEZ5DBEAiAGEGx3mJN3HDp3qdlvyrc7gq20JS4o_v6JwBHFzmgDFQIgJD8CmqE0NKYJufg2yccoQWiwhucCXx9S4rbfiTpNakg-`,
      `https://itm.st/mp/2485?d=BCEwLkePue.aiLyiJp69F1N7C.2dNiqH6QeiE9WZnTlVD90yRRBXza3enVwJ6d4j7dx0dHYdLZhu.DTLwUWonrie19GQJtHeV25Bf8Uakly9pQouHFXlsXdmp.120aiocTBEAiB_ZtjifLOisaLXG2i.nvTWSjBSG5svVPX_ccPCSp2mGgIgMUxD56obiUc09xM6c3C4TyjzSwue9Po7XYPQ1Tx_01E-`,
      `https://itm.st/mp/2485?d=BP4a8i5hbp0k85RwdYTEWJ8sz6KwZSnpsON2IKwz6Emu3Ytvnf.O35CACkjarW2I1dZCaXs84NQAwBKOm3nocnqiEqUOY0rXSFp3MkEpazGMZCmokuo_1Rye7Bk._3RirTBFAiAxEUlsJtLW_sWazQVFTedSr2LqgjTxFz.yOU9s1pJyPgIhANjeVM60cqo7HLaFOg7d05SwjjR7fqy8ARaUSWA8dy8y`,
      `https://itm.st/mp/2485?d=BLxj2a2giCn0BwiqSfuhKaVaRFKVZ_n_oIRAhl.6d3HYBkdeMuUJKImWhi3_8h0z9mX_yScRlQoFjuaClbPuieD4CyV00ACuM68uKF_K_CZIGQ2fcEtnpsY1XI9NXhYD1TBEAiAdUqGydD0s_gbOmruFpicquJi0E.VZuS1qjA06ag0HqQIgE7bu1G1bhFTHZHXMaiO.qNlBLWyQaCNY5DSWAUVmra0-`,
      `https://itm.st/mp/2485?d=BHWXyWsEdykHkG_fk1MxlZDYfSPM4feSpaJfmBnWd1noDKsequ00mo98I92uv8Nz9vpiT71b40hAp9fBDGHOrbNGRHSOaVDEv3HNIaWLmbrS_GiRr7I5lam5GYHaYb.A6DBGAiEA6wetyEk0CJjv6TYTqF9XslVFXTSrGTRfFWVxIx7pULQCIQDk4RymMEnHgU7o2sxtAgOoS0TdcGgcsJUfYZSbXC9AxQ--`,
      `https://itm.st/mp/2485?d=BIkSXUWOlDuC6IEe0iaRxBEY4_vX5Ob5kW3JFYnk8e1c_ICBg3SP9VNj4_9oEfSfhs4VAJ12Ht6QCdwTwOKX1AO2MWG918FAL.47mzT6j8upmjwYZj9W9muJGPg.0.b9MzBFAiEA_rFKLuftOH2fwpJR5CVs9IOU9_6sKa5ax3aiVJ4HpwECIARXHugb8mlztWBzcauHz5qILF7mGyj2QNdgEVDUZ8EP`,
      `https://itm.st/mp/2485?d=BLOQXBKNfX2FPLjyOvP9Gs3XauGNTx.ww4FdvckHY_CdoDEBttysDTbXJeP.ab2s101gPSrhAkeHyAX6vCVWaXSk6ZTsaDCuVBEH31iToZKfN0DyVMyc75mibcg_24MBmzBFAiEAi7SNYW3MOp_emnQuxs8hAHZtDAPfLlR.XxODIkYXj2sCIBR_8h23dcGQdH0YA0zAiiiYYBtjsuM3OdcrJmL3t9Et`,
      `https://itm.st/mp/2485?d=BLMXAlsyJHBPddod96DNQMU_9qIKC61Qhuf2sS9fVBzfUEUm0dS9DoiYbll2R20FF6DI1muEr8scLL4W7QlKZAFcxWY5BjfgZ53YOdYAacZ.QtD5tkhZ.t1jMhxGxxTaBzBGAiEAxJVXvExOiengviN2PFypwSdFJVzmFzF.e.Utjb76L4cCIQDCU_Jy1eA2A5qN3Na7Lj6UUvK2WNZAZQ3EGxuxT3MHXQ--`,
      `https://itm.st/mp/2485?d=BPDr9lgaMQ8MXLqAdQUb4NGy3wVWkyf0Sh4V9LccIu20a5ueJg4mazr1y3Stcky70JeAmrXvaqmVoAIsZgKNaMqxVVyJhZ2y4XzwYjH3x92VDEkdds9Qw7aJO8ZMzyY7OzBEAiBbdFH9iVm0aeB1DU5_wv.SInlxcALlFO71t64uC_seBwIgAzEFwvrBu.GjUZ4In3uO85n8cjz9zbeRZFLt6Q6i5bY-`,
      `https://itm.st/mp/2485?d=BCmku7pp3EYuSdHmpKWp7schzkJuJbTIE7s.gGMo_K.FQbEZoM9.AkLMvfc8l5ZDmO_IUTGb6G08YB57qcs5cyynSm8Vl_CJBGLQkeZvJ1O3.LTpT.0RPE8KsDgwPVyPdjBGAiEAiTNqmERc39Sfpg6pZKvT1Urk4Fgf7LYGVTA6sOxMCDECIQD0U5bcJj8yzp7FosdzhA4YcGh5dfEKYfxiAWspsv9TNw--`,
      `https://itm.st/mp/2485?d=BGb1l5Pw4lSvEve..Kq.F_pJJzabDRFQUPA4qd6QgPzOQ4T35W4G98l5h6Wt1xBRgMZ3CYFeflqMHDN1jwXFjM.3v7CLkb8DwiWx5zbgamf223qwOgpJKQDTkbwy5MbaNDBEAiB9WGa9Hzj1KzReGn3VAuKV2I_69ouVRAAbZB0O8BVS_gIgfvE4K.egRVpAn3ZuKSUh21XB4wbLwpJD2wCVLi1Sen4-`,
      `https://itm.st/mp/2485?d=BOHbqgfRs2zoaY9owa0g0_WvAg1HN_twmuv8pJw1DxPh3IBwws19V9m0kU_aYfokFBVIICdYqqYd9XL12JyYe4nXM3.XVIUhyjkotqtxn6P5cyhEh5smmMSsMSXOOfVhnzBFAiB2Xk7ta9hqQ3bxdxvf1rVEXAuUc6ElmWHiadgb_v3u6wIhAIHeHoIRMhEZs4GqJjWZB99iiO2_l9uTGli5.KqEtbrn`,
    ]

    for (let i = 0; i < sigs.length; i++) {
      const url = sigs[i]
      const d = url.split('?d=')[1]

      const decoded = Utils.decodeNDEF(d)
      const encode = Utils.encodePublicKey(decoded.pubKey)
      console.log(`https://itm.st/mp/2485?p=${encode}`)
    }
  })
})
