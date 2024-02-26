import { rpc, sc, u, wallet } from '@cityofzion/neon-core'
import { pollingOptions } from '../types'
import { experimental } from '@cityofzion/neon-js'

export class Utils {
  static async transactionCompletion(txid: string, opts?: pollingOptions): Promise<rpc.ApplicationLogJson> {
    let options = {
      period: 500,
      timeout: 2500,
      node: 'http://127.0.0.1:50012',
    }
    options = { ...options, ...opts }

    const client = new rpc.RPCClient(options.node)

    for (let i = 0; i < Math.floor(options.timeout / options.period); i++) {
      try {
        return await client.getApplicationLog(txid)
      } catch (e) {}
      await this.sleep(options.period)
    }
    throw new Error('Unable to locate the requested transaction.')
  }

  static async deployContract(
    node: string,
    networkMagic: number,
    nefRaw: Buffer,
    manifestRaw: any,
    signer: wallet.Account
  ): Promise<string> {
    const config = {
      networkMagic,
      rpcAddress: node,
      account: signer,
    }

    const nef = sc.NEF.fromBuffer(nefRaw)
    const manifest = sc.ContractManifest.fromJson(manifestRaw)

    const assembledScript = new sc.ScriptBuilder()
      .emit(sc.OpCode.ABORT)
      .emitPush(u.HexString.fromHex(signer.scriptHash))
      .emitPush(nef.checksum)
      .emitPush(manifest.name)
      .build()
    const scriptHash = u.reverseHex(u.hash160(assembledScript))

    console.log(`deploying ${manifest.name} to 0x${scriptHash} ...`)

    return experimental.deployContract(nef, manifest, config)
  }

  static decodeNDEF(d: string) {
    if (d.indexOf('https://') === 0) {
      d = d.split('?d=')[1]
    }

    d = d.split('.').join('+')
    d = d.split('_').join('/')
    d = d.split('-').join('=')
    const payload = Buffer.from(d, 'base64')

    // support for both v1 and v2 ndef formats
    const pubKeyLength = 65
    const messageLength = payload.length > 150 ? 32 : 5

    const pubKey = wallet.getPublicKeyEncoded(payload.slice(0, pubKeyLength).toString('hex') || '')
    const msg = payload.slice(pubKeyLength, pubKeyLength + messageLength).toString('hex') || ''
    const sig = u.ab2hexstring(Utils.processDERSignature(payload.slice(pubKeyLength + messageLength))) || ''
    const validSignature = wallet.verify(msg, sig, pubKey)
    return {
      validSignature,
      pubKey,
      msg,
      sig,
    }
  }

  static encodePublicKey(pubKey: string): string {
    return Buffer.from(pubKey, 'hex').toString('base64').split('=').join('-').split('/').join('_').split('+').join('.')
  }

  static processDERSignature(sigBytes: Uint8Array): Uint8Array {
    // Drop the first three bytes. They are always `30 46 02`
    let truncated = sigBytes.slice(3)

    // Check length of r coordinate
    if (truncated[0] === 0x21) {
      truncated = truncated.slice(2) // skip the size byte and the zero byte that was prepended to the r coordinate
    } else {
      // truncated [0] === 20
      truncated = truncated.slice(1) // skip only the size byte
    }
    const r = truncated.slice(0, 32) // Read the r coordinate

    // Skip the r coordinate and type byte
    truncated = truncated.slice(32 + 1)
    // Check length of s coordinate
    if (truncated[0] === 0x21) {
      truncated = truncated.slice(2) // skip the size byte and the zero byte that was prepended to the s coordinate
    } else {
      // truncated [0] === 20
      truncated = truncated.slice(1) // skip only the size byte
    }
    const s = truncated.slice(0, 32) // Read the s coordinate

    const concat = new Uint8Array(r.length + s.length)
    concat.set(r)
    concat.set(s, r.length)
    return concat
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
