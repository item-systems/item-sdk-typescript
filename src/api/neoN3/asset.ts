import { ContractInvocation } from '@cityofzion/neon-dappkit-types'

export class AssetAPI {
  static getAsset(
    scriptHash: string,
    params: {
      localAsid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAsset',
      args: [{ type: 'Integer', value: params.localAsid.toString() }],
    }
  }

  static getAssetWithKey(
    scriptHash: string,
    params: {
      assetPubKey: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetWithKey',
      args: [{ type: 'Hash160', value: params.assetPubKey }],
    }
  }

  static getAssetBurnLog(
    scriptHash: string,
    params: {
      localAsid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetBurnLog',
      args: [{ type: 'Integer', value: params.localAsid.toString() }],
    }
  }

  static totalAssets(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalAssets',
      args: [],
    }
  }
}
