import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { ConfigurationStub, SetConfigurationProperty } from '../../types'

/**
 * Invocation builders for configuration lifecycle and property operations.
 *
 * Configurations define reusable capability/property bundles that can later be
 * bound to items or assets. Property setters in this class are write operations;
 * getters and counters are read-only.
 */
export class ConfigurationAPI {
  /**
   * Create a new empty configuration record.
   */
  static createConfiguration(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'createConfiguration',
      args: [],
    }
  }

  /**
   * Fetch a configuration by its contract-local configuration identifier.
   */
  static getConfiguration(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfiguration',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

  /**
   * Set or replace a configuration property value.
   *
   * `globalPid` and `state` are hex-encoded byte strings at the SDK boundary and
   * are converted here into the base64-encoded byte arrays expected by Neon
   * invocation payloads.
   */
  static setConfigurationProperty(scriptHash: string, params: SetConfigurationProperty): ContractInvocation {
    return {
      scriptHash,
      operation: 'setConfigurationProperty',
      args: [
        { type: 'Integer', value: params.localCid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
        { type: 'ByteArray', value: u.hex2base64(params.state) },
      ],
    }
  }

  /**
   * Fetch the full property map for a configuration.
   */
  static getConfigurationProperties(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfigurationProperties',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

  /**
   * Fetch the assets currently associated with a configuration.
   */
  static getConfigurationAssets(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfigurationAssets',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

  /**
   * Fetch the total number of configurations currently tracked by the contract.
   */
  static totalConfigurations(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalConfigurations',
      args: [],
    }
  }
}
