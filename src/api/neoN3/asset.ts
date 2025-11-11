import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { AssetStub, KeyStub } from "../../types";

export class AssetAPI {
  static getAsset(
    scriptHash: string,
    params: AssetStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAsset',
      args: [{ type: 'Integer', value: params.localAsid.toString() }],
    }
  }

  static getAssetWithKey(
    scriptHash: string,
    params: KeyStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetWithKey',
      args: [{ type: 'Hash160', value: params.pubKey }],
    }
  }

  static getAssetBurnLog(
    scriptHash: string,
    params: AssetStub
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
