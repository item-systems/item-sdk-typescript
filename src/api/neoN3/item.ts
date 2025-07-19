import { u } from '@cityofzion/neon-core'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { NeoN3EllipticCurves } from '../../constants'

export class ItemAPI {
  static createItem(
    scriptHash: string,
    params: {
      localEid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'createItem',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  static getItem(
    scriptHash: string,
    params: {
      localNfid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  static getItemWithKey(
    scriptHash: string,
    params: {
      assetPublicKey: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithKey',
      args: [{ type: 'ByteArray', value: params.assetPublicKey }],
    }
  }

  static getItemWithTac(
    scriptHash: string,
    params: {
      tacScriptHash: string
      tokenId: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithTAC',
      args: [
        { type: 'Hash160', value: params.tacScriptHash },
        { type: 'ByteArray', value: params.tokenId },
      ],
    }
  }

  static getItemProperties(
    scriptHash: string,
    params: {
      localNfid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemProperties',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  static totalItems(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalItems',
      args: [],
    }
  }

  static setItemProperty(
    scriptHash: string,
    params: {
      localNfid: number
      globalPid: string
      state: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'setItemProperty',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
        { type: 'ByteArray', value: u.hex2base64(params.state) },
      ],
    }
  }

  static bindItem(
    scriptHash: string,
    params: {
      localNfid: number
      localCid: number
      assetPubKey: string
      assetEllipticCurve: NeoN3EllipticCurves
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'bindItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'Integer', value: params.localCid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.assetPubKey) },
        { type: 'Integer', value: params.assetEllipticCurve.toString() },
      ],
    }
  }

  static lockItem(
    scriptHash: string,
    params: {
      localNfid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'lockItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  static authItem(
    scriptHash: string,
    params: {
      localNfid: number
      message: string
      proof: string
      challenge: string
      burn: boolean
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'authItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.message) },
        { type: 'ByteArray', value: u.hex2base64(params.proof) },
        { type: 'ByteArray', value: u.hex2base64(u.reverseHex(params.challenge)) },
        { type: 'Boolean', value: params.burn },
      ],
    }
  }

  static purgeItem(
    scriptHash: string,
    params: {
      localNfid: number
      message: string
      signature: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'purgeItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.message) },
        { type: 'ByteArray', value: u.hex2base64(params.signature) },
      ],
    }
  }
}
