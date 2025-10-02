import { ContractInvocation } from '@cityofzion/neo3-invoker'
import { sc, u } from '@cityofzion/neon-core'

export class ItemAPI {
  static symbol(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'symbol',
      args: [],
    }
  }

  static decimals(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'decimals',
      args: [],
    }
  }

  static totalSupply(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalSupply',
      args: [],
    }
  }

  static balanceOf(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'balanceOf',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static tokensOf(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'tokensOf',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static transfer(
    scriptHash: string,
    params: {
      to: string
      tokenId: number
      data: any
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'transfer',
      args: [
        { type: 'Hash160', value: params.to },
        { type: 'Integer', value: params.tokenId },
        { type: 'Any', value: params.data },
      ],
    }
  }

  static ownerOf(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'ownerOf',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  static tokens(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'tokens',
      args: [],
    }
  }

  static properties(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'properties',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  // USER SCOPE

  static getUserJSON(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUserJSON',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static getUser(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUser',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static setUserPermissions(
    scriptHash: string,
    params: {
      address: string
      permissions: Record<string, any>
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUser',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static totalAccounts(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalAccounts',
      args: [],
    }
  }

  // EPOCH SCOPE

  static createEpoch(
    scriptHash: string,
    params: {
      label: string
      generatorInstanceId: number
      mintFee: number
      sysFee: number
      maxSupply: number
      authAge: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'createEpoch',
      args: [
        { type: 'String', value: params.label },
        { type: 'Integer', value: params.generatorInstanceId },
        { type: 'Integer', value: params.mintFee },
        { type: 'Integer', value: params.sysFee },
        { type: 'Integer', value: params.maxSupply },
        { type: 'Integer', value: params.authAge },
      ],
    }
  }

  static getEpochJSON(
    scriptHash: string,
    params: {
      epochId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpochJSON',
      args: [{ type: 'Integer', value: params.epochId }],
    }
  }

  static getEpoch(
    scriptHash: string,
    params: {
      epochId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpoch',
      args: [{ type: 'Integer', value: params.epochId }],
    }
  }

  static setMintFee(
    scriptHash: string,
    params: {
      epochId: number
      amount: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'setMintFee',
      args: [
        { type: 'Integer', value: params.epochId },
        { type: 'Integer', value: params.amount },
      ],
    }
  }

  static totalEpochs(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalEpochs',
      args: [],
    }
  }

  // ITEM Scope

  static auth(
    scriptHash: string,
    params: {
      mode: string
      assetPubKey: string
      message: string
      signature: string
      burn: boolean
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'auth',
      args: [
        { type: 'String', value: params.mode },
        { type: 'PublicKey', value: params.assetPubKey },
        { type: 'ByteArray', value: u.hex2base64(params.message) },
        { type: 'ByteArray', value: u.hex2base64(params.signature) },
        { type: 'Boolean', value: params.burn },
      ],
    }
  }

  static bindItem(
    scriptHash: string,
    params: {
      tokenId: number
      assetPubKey: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'bindItem',
      args: [
        { type: 'Integer', value: params.tokenId },
        { type: 'ByteArray', value: u.hex2base64(params.assetPubKey) },
      ],
    }
  }

  static setBindOnPickup(
    scriptHash: string,
    params: {
      tokenId: number
      state: boolean
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'setBindOnPickup',
      args: [
        { type: 'Integer', value: params.tokenId },
        { type: 'Boolean', value: params.state },
      ],
    }
  }

  static claimBindOnPickup(
    scriptHash: string,
    params: {
      assetPubKey: string
      message: string
      signature: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'claimBindOnPickup',
      args: [
        { type: 'ByteArray', value: u.hex2base64(params.assetPubKey) },
        { type: 'ByteArray', value: u.hex2base64(params.message) },
        { type: 'ByteArray', value: u.hex2base64(params.signature) },
      ],
    }
  }

  static getAssetItemJSON(
    scriptHash: string,
    params: {
      assetPubKey: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetItemJSON',
      args: [{ type: 'ByteArray', value: u.hex2base64(params.assetPubKey) }],
    }
  }

  static getItem(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'String', value: params.tokenId }],
    }
  }

  static getItemJSON(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemJSON',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  static getItemJSONFlat(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemJSONFlat',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  static lock(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'lock',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  static offlineMint(
    scriptHash: string,
    params: {
      epochId: number
      address: string
      bindOnPickup: boolean
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'offlineMint',
      args: [
        { type: 'Integer', value: params.epochId },
        { type: 'Hash160', value: params.address },
        { type: 'Boolean', value: params.bindOnPickup },
      ],
    }
  }

  static setItemProperties(
    scriptHash: string,
    params: {
      tokenId: number
      properties: any
    }
  ): ContractInvocation {
    const properties = Object.keys(params.properties).map(key => {
      return sc.ContractParam.array(
        sc.ContractParam.string(key),
        sc.ContractParam.any(u.str2hexstring(params.properties[key]))
      ).toJson()
    })

    return {
      scriptHash,
      operation: 'setItemProperties',
      args: [
        { type: 'Integer', value: params.tokenId },
        { type: 'Array', value: properties },
      ],
    }
  }

  static unbindToken(
    scriptHash: string,
    params: {
      tokenId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'unbindToken',
      args: [{ type: 'Integer', value: params.tokenId }],
    }
  }

  static unbindAsset(
    scriptHash: string,
    params: {
      assetPubKey: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'unbindAsset',
      args: [{ type: 'ByteArray', value: u.hex2base64(params.assetPubKey) }],
    }
  }

  static update(
    scriptHash: string,
    params: {
      script: string
      manifest: string
      data: any
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'update',
      args: [
        { type: 'ByteArray', value: params.script },
        { type: 'String', value: params.manifest },
        { type: 'Any', value: params.data },
      ],
    }
  }
}
