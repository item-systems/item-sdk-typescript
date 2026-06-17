import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { EpochStub, SetEpochProperty } from '../../types'

/**
 * Invocation builders for epoch lifecycle and property operations.
 *
 * Epochs group items into issuance or operational cohorts. As with the other
 * builder classes, setters here create transaction-producing invocations while
 * getters are safe to use in read-only/test-invoke contexts.
 */
export class EpochAPI {
  /**
   * Create a new epoch record.
   */
  static createEpoch(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'createEpoch',
      args: [],
    }
  }

  /**
   * Fetch an epoch by its contract-local epoch identifier.
   */
  static getEpoch(scriptHash: string, params: EpochStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpoch',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  /**
   * Set or replace an epoch property value.
   *
   * The property identifier and state payload are accepted as hex strings and
   * encoded into the byte-array representation expected by the contract ABI.
   */
  static setEpochProperty(scriptHash: string, params: SetEpochProperty): ContractInvocation {
    return {
      scriptHash,
      operation: 'setEpochProperty',
      args: [
        { type: 'Integer', value: params.localEid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
        { type: 'ByteArray', value: u.hex2base64(params.state) },
      ],
    }
  }

  /**
   * Fetch the full property map for an epoch.
   */
  static getEpochProperties(scriptHash: string, params: EpochStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpochProperties',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  /**
   * Fetch the items currently assigned to an epoch.
   */
  static getEpochItems(scriptHash: string, params: EpochStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpochItems',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  /**
   * Fetch the total number of epochs currently tracked by the contract.
   */
  static totalEpochs(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalEpochs',
      args: [],
    }
  }
}
