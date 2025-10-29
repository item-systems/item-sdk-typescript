import { rpc, sc, u, wallet } from '@cityofzion/neon-core'
import { NdefDecodeType, pollingOptions } from '../types'
import { experimental } from '@cityofzion/neon-js'
import {
  ContractInvocation,
  InvokeResult,
  Neo3Invoker,
  Neo3Parser,
  Neo3ApplicationLog,
  RpcResponseStackItem,
} from '@cityofzion/neon-dappkit-types'
import { TypeChecker, NeonEventListener } from '@cityofzion/neon-dappkit'

export class Utils {
  static async transactionCompletion(txid: string, opts?: pollingOptions): Promise<Neo3ApplicationLog> {
    let options = {
      period: 500,
      timeout: 2500,
      node: 'http://127.0.0.1:50012',
    }
    options = { ...options, ...opts }

    const eventListener = new NeonEventListener(options.node)

    for (let i = 0; i < Math.floor(options.timeout / options.period); i++) {
      try {
        return await eventListener.waitForApplicationLog(txid, opts?.timeout)
      } catch {}
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

  static decodeNDEF(d: string): NdefDecodeType {
    if (d.indexOf('https://') === 0) {
      if (d.indexOf('?d=') !== -1) {
        d = d.split('?d=')[1]
      } else if (d.indexOf('?p=') !== -1) {
        d = d.split('?p=')[1]
      }
    }
    d = d.split('.').join('+')
    d = d.split('_').join('/')
    d = d.split('-').join('=')
    const payload = Buffer.from(d, 'base64')

    // support for both v1 and v2 ndef formats
    const pubKeyLength = 65
    const messageLength = payload.length > 150 ? 32 : 5

    const pubKeyUnencoded = payload.slice(0, pubKeyLength).toString('hex') || ''

    const pubKey = wallet.getPublicKeyEncoded(pubKeyUnencoded)
    const msg = payload.slice(pubKeyLength, pubKeyLength + messageLength).toString('hex') || ''
    const sigRaw = payload.slice(pubKeyLength + messageLength)
    const proof = u.ab2hexstring(Utils.processDERSignature(sigRaw)) || ''

    let validSignature
    try {
      validSignature = wallet.verify(msg, proof, pubKey)
    } catch (e) {
      validSignature = false
    }
    const uriPubKey = this.encodePublicKey(pubKeyUnencoded)

    return {
      validSignature,
      uriPubKey,
      pubKeyUnencoded,
      pubKey,
      msg,
      proof,
    }
  }

  static encodePublicKey(pubKey: string): string {
    return Buffer.from(pubKey, 'hex').toString('base64').split('=').join('-').split('/').join('_').split('+').join('.')
  }

  static processDERSignature(sigBytes: Uint8Array): Uint8Array {
    // Drop the first three bytes. They are always `30 46 02`

    const bodyRaw = sigBytes.slice(2)
    let rPointer = 0

    const body = {
      rHeader: 0,
      rLength: 0,
      r: new Uint8Array([]),
      sHeader: 0,
      sLength: 0,
      s: new Uint8Array([]),
    }

    body.rHeader = bodyRaw[rPointer]
    rPointer += 1

    body.rLength = bodyRaw[rPointer]
    rPointer += 1

    // account for "high r"
    const rRaw = bodyRaw.slice(rPointer, rPointer + body.rLength)
    body.r = rRaw[0] === 0x00 && rRaw[1] > 0x7f ? rRaw.slice(1) : rRaw
    rPointer += body.rLength

    body.sHeader = bodyRaw[rPointer]
    rPointer += 1

    body.sLength = bodyRaw[rPointer]
    rPointer += 1

    const sRaw = bodyRaw.slice(rPointer, rPointer + body.sLength)
    body.s = sRaw[0] === 0x00 && sRaw[1] > 0x7f ? sRaw.slice(1) : sRaw

    const concat = new Uint8Array(body.r.length + body.s.length)
    concat.set(body.r)
    concat.set(body.s, body.r.length)
    return concat
  }

  static isPublicKey(key: string, encoded?: boolean): boolean {
    try {
      let encodedKey
      switch (key.substr(0, 2)) {
        case '04':
          if (encoded === true) {
            return false
          }
          // Encode key
          encodedKey = wallet.getPublicKeyEncoded(key)
          break
        case '02':
        case '03':
          if (encoded === false) {
            return false
          }
          encodedKey = key
          break
        default:
          return false
      }
      const unencoded = wallet.getPublicKeyUnencoded(encodedKey)
      const tail = parseInt(unencoded.substr(unencoded.length - 2, 2), 16)
      if (encodedKey.substr(0, 2) === '02' && tail % 2 === 0) {
        return true
      }
      if (encodedKey.substr(0, 2) === '03' && tail % 2 === 1) {
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  static async testInvokerRaw(invoker: Neo3Invoker, invocations: ContractInvocation[]): Promise<InvokeResult> {
    const res = await invoker.testInvoke({
      invocations,
      signers: [],
    })
    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return res
  }

  static async testInvoker(
    invoker: Neo3Invoker,
    parser: Neo3Parser,
    invocations: ContractInvocation[]
  ): Promise<any[]> {
    const res = await this.testInvokerRaw(invoker, invocations)

    return res.stack.map(result => {
      return parser.parseRpcResponse(result)
    })
  }

  static async handleIterator(res: any, invoker: Neo3Invoker, parser: Neo3Parser): Promise<any[]> {
    if (!res.stack) {
      return []
    }
    const items: string[] = []
    const count = 20
    let traversedAll = false

    while (!traversedAll) {
      const iteratorList = await invoker.traverseIterator(res.session, res.stack[0].id, count)
      iteratorList.forEach(item => {
        if (TypeChecker.isRpcResponseStackItem(item)) {
          const parsedItem = parser.parseRpcResponse(item, { type: 'ByteArray' })
          items.push(parsedItem)
        } else {
          throw new Error('unrecognized response')
        }
      })

      if (iteratorList.length < count) {
        traversedAll = true
      }
    }
    return items
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
