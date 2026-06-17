import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { AssetStub, KeyStub } from '../../types'

/**
 * Invocation builders for asset-centric ITEM contract operations.
 *
 * Assets represent the cryptographic or physical binding material associated
 * with items/configurations. The methods in this class are read-oriented and
 * produce invocations suitable for test-invoke or read-only RPC execution.
 */
export class AssetAPI {
  /**
   * Fetch an asset by its contract-local asset identifier.
   */
  static getAsset(scriptHash: string, params: AssetStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAsset',
      args: [{ type: 'Integer', value: params.localAsid.toString() }],
    }
  }

  /**
   * Fetch an asset by its registered public key.
   *
   * The contract expects the key in the exact wire format used when the asset
   * was bound or registered. No normalization is applied in this low-level
   * builder.
   */
  static getAssetWithKey(scriptHash: string, params: KeyStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetWithKey',
      args: [{ type: 'Hash160', value: params.pubKey }],
    }
  }

  /**
   * Fetch the burn ledger/history associated with an asset.
   *
   * This is primarily useful for audit, anti-replay, and post-authentication
   * verification flows where the caller needs to know whether a consumable proof
   * has already been spent.
   */
  static getAssetBurnLog(scriptHash: string, params: AssetStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getAssetBurnLog',
      args: [{ type: 'Integer', value: params.localAsid.toString() }],
    }
  }

  /**
   * Fetch the total number of assets currently tracked by the contract.
   */
  static totalAssets(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalAssets',
      args: [],
    }
  }
}
