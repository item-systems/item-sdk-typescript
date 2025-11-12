import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { ConfigurationStub, SetConfigurationProperty } from '../../types'

export class ConfigurationAPI {
  static createConfiguration(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'createConfiguration',
      args: [],
    }
  }

  static getConfiguration(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfiguration',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

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

  static getConfigurationProperties(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfigurationProperties',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

  static getConfigurationAssets(scriptHash: string, params: ConfigurationStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getConfigurationAssets',
      args: [{ type: 'Integer', value: params.localCid.toString() }],
    }
  }

  static totalConfigurations(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalConfigurations',
      args: [],
    }
  }
}
