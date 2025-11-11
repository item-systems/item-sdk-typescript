import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { NeoN3EllipticCurves } from '../../constants'
import {
  AuthItem,
  BindItem,
  EpochStub,
  GetItemWithTac,
  ItemStub,
  KeyStub,
  PurgeItem,
  SetItemProperty
} from "../../types";

export class ItemAPI {
  static createItem(
    scriptHash: string,
    params: EpochStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'createItem',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  static getItem(
    scriptHash: string,
    params: ItemStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  static getItemWithKey(
    scriptHash: string,
    params: KeyStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithKey',
      args: [{ type: 'ByteArray', value: params.pubKey }],
    }
  }

  static getItemWithTac(scriptHash: string, params: GetItemWithTac): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithTAC',
      args: [
        { type: 'Hash160', value: params.scriptHash },
        { type: 'ByteArray', value: params.tokenId },
      ],
    }
  }

  static getItemProperties(
    scriptHash: string,
    params: ItemStub
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
    params: SetItemProperty
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
    params: BindItem
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'bindItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'Integer', value: params.localCid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.pubKey) },
        { type: 'Integer', value: params.assetEllipticCurve.toString() },
      ],
    }
  }

  static lockItem(
    scriptHash: string,
    params: ItemStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'lockItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  static authItem(scriptHash: string, params: AuthItem): ContractInvocation {
    return {
      scriptHash,
      operation: 'authItem',
      args: [
        { type: 'Integer', value: params.tokenId.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
        { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
        { type: 'ByteArray', value: u.hex2base64(u.reverseHex(params.auth.challenge)) },
        { type: 'Boolean', value: params.burn },
      ],
    }
  }

  static purgeItem(
    scriptHash: string,
    params: PurgeItem
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
