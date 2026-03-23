import { sc, u, wallet, experimental } from '@cityofzion/neon-js'
import { NdefDecodeType, pollingOptions } from '../types'
import {
  ContractInvocation,
  InvokeResult,
  Neo3Invoker,
  Neo3Parser,
  Neo3ApplicationLog,
} from '@cityofzion/neon-dappkit-types'
import { TypeChecker, NeonEventListener } from '@cityofzion/neon-dappkit'

type WalletAccount = InstanceType<typeof wallet.Account>

/**
 * Shared utility helpers used by the ITEM SDK.
 *
 * The methods in this class intentionally sit below the domain-level `Item` facade. They encapsulate common transport,
 * parsing, iterator traversal, byte normalization, and NDEF/authentication helpers so that the public SDK methods can
 * stay focused on contract semantics.
 */
export class Utils {
  /**
   * Polls for a transaction's application log until it becomes available or the timeout window is exhausted.
   *
   * This helper is useful when callers have a transaction id from an async write method and want to resolve it later
   * without using the corresponding `*Sync` helper.
   *
   * @param txid Transaction id to monitor.
   * @param opts Optional polling cadence, timeout, and node override.
   * @returns The resolved Neo application log.
   */
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

  /**
   * Deploys a contract and prints the deterministic script hash that will be produced.
   *
   * This helper is primarily intended for local/dev workflows. It reconstructs the deployment script hash locally so the
   * operator can see the expected address before or during deployment.
   *
   * @param node RPC endpoint to deploy against.
   * @param networkMagic Network magic for the target chain.
   * @param nefRaw Raw NEF bytes.
   * @param manifestRaw Raw contract manifest JSON.
   * @param signer Account used to sign the deployment transaction.
   * @returns Submitted deployment transaction id.
   */
  static async deployContract(
    node: string,
    networkMagic: number,
    nefRaw: Buffer,
    manifestRaw: any,
    signer: WalletAccount
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

  /**
   * Decodes an ITEM NDEF payload into authentication-ready fields.
   *
   * The helper accepts either a raw URL-safe payload or a full URL containing `?d=` / `?p=` payload parameters. It
   * normalizes the URL-safe base64 alphabet, decodes the payload, extracts the public key, challenge message, and DER
   * signature, then converts the signature into the concatenated format expected by Neo verification helpers.
   *
   * The method also supports both historical payload formats currently encountered in the ecosystem by inferring the
   * challenge-message length from the payload size.
   *
   * @param d Raw payload string or URL containing the payload.
   * @returns Decoded and verification-enriched NDEF payload structure.
   */
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
    const message = payload.slice(pubKeyLength, pubKeyLength + messageLength).toString('hex') || ''
    const sigRaw = payload.slice(pubKeyLength + messageLength)
    const proof = u.ab2hexstring(Utils.processDERSignature(sigRaw)) || ''

    let validSignature
    try {
      validSignature = wallet.verify(message, proof, pubKey)
    } catch {
      validSignature = false
    }
    const uriPubKey = this.encodePublicKey(pubKeyUnencoded)

    return {
      validSignature,
      uriPubKey,
      pubKeyUnencoded,
      pubKey,
      message,
      proof,
    }
  }

  /**
   * Converts an uncompressed hex public key into the URL-safe base64 variant used in ITEM links.
   *
   * @param pubKey Uncompressed public key as hex.
   * @returns URL-safe public key representation.
   */
  static encodePublicKey(pubKey: string): string {
    return Buffer.from(pubKey, 'hex').toString('base64').split('=').join('-').split('/').join('_').split('+').join('.')
  }

  /**
   * Converts a DER-encoded ECDSA signature into the concatenated `r || s` byte format used by Neo helpers.
   *
   * The implementation also strips leading zero padding that may appear when DER encodes high-bit values.
   *
   * @param sigBytes DER-encoded signature bytes.
   * @returns Concatenated signature bytes.
   */
  static processDERSignature(sigBytes: Uint8Array): Uint8Array {
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

  /**
   * Validates whether a string is a structurally valid Neo public key.
   *
   * The optional `encoded` flag can be used to require either compressed (`02`/`03`) or uncompressed (`04`) input.
   *
   * @param key Candidate public key.
   * @param encoded Optional shape constraint.
   * @returns `true` when the key is structurally valid for the requested encoding mode.
   */
  static isPublicKey(key: string, encoded?: boolean): boolean {
    try {
      let encodedKey
      switch (key.substr(0, 2)) {
        case '04':
          if (encoded === true) {
            return false
          }
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
    } catch {
      return false
    }
  }

  /**
   * Executes a read-only invocation and returns the raw Neo VM result.
   *
   * This is the lowest-level read helper used by the SDK when custom response handling is required.
   *
   * @param invoker Configured Neo invoker.
   * @param invocations Contract calls to execute.
   * @returns Raw invoke result including stack and iterator session metadata.
   */
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

  /**
   * Executes a read-only invocation and parses each stack item with the provided parser.
   *
   * @param invoker Configured Neo invoker.
   * @param parser Stack parser implementation.
   * @param invocations Contract calls to execute.
   * @returns Parsed stack items in order.
   */
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

  /**
   * Traverses a contract iterator containing property key/value structs.
   *
   * The ITEM contract commonly returns property collections as iterators of two-field structs. This helper exhausts the
   * iterator and materializes the result into a plain object keyed by hex-encoded property id.
   *
   * @param res Raw invoke result containing iterator session metadata.
   * @param invoker Configured Neo invoker.
   * @param parser Stack parser implementation.
   * @returns Materialized property map.
   */
  static async handlePropertyIterator(
    res: any,
    invoker: Neo3Invoker,
    parser: Neo3Parser
  ): Promise<Record<string, string>> {
    if (!res.stack) {
      return {}
    }

    const properties: Record<string, string> = {}
    const count = 20
    let traversedAll = false

    while (!traversedAll) {
      const iteratorList = await invoker.traverseIterator(res.session, res.stack[0].id, count)
      iteratorList.forEach(item => {
        if (!TypeChecker.isStackTypeStruct(item) || item.value.length < 2) {
          throw new Error('unrecognized property response')
        }

        const key = parser.parseRpcResponse(item.value[0], { type: 'ByteArray' }) as string
        const value = parser.parseRpcResponse(item.value[1], { type: 'ByteArray' }) as string
        properties[key] = value
      })

      if (iteratorList.length < count) {
        traversedAll = true
      }
    }

    return properties
  }

  /**
   * Traverses a contract iterator containing scalar byte-array values.
   *
   * @param res Raw invoke result containing iterator session metadata.
   * @param invoker Configured Neo invoker.
   * @param parser Stack parser implementation.
   * @returns Materialized list of parsed byte-array values.
   */
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

  /**
   * Sleeps for the requested duration.
   *
   * @param ms Milliseconds to wait.
   */
  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Converts an integer into the little-endian two's-complement hex representation commonly used on-chain.
   *
   * This is particularly useful when interoperating with contracts or storage layouts that encode token ids and other
   * integers in Neo's byte-oriented format.
   *
   * @param x Number to convert.
   * @returns Hex-formatted little-endian two's-complement representation.
   */
  static numToHexComplement(x: number): string {
    const segmentLength = 8

    const bin = x.toString(2)
    const segments = bin.match(/.{1,8}/g) || []

    const lastIndex = segments.length - 1
    segments[lastIndex] = '0'.repeat(segmentLength - segments[lastIndex].length) + segments[lastIndex]

    return segments[lastIndex][0] === '1' ? u.reverseHex(u.int2hex(x)) + '00' : u.reverseHex(u.int2hex(x))
  }
}
