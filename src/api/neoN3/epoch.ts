import { u } from '@cityofzion/neon-core'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'

export class EpochAPI {
  static createEpoch(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'createEpoch',
      args: [],
    }
  }

  static getEpoch(
    scriptHash: string,
    params: {
      localEid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpoch',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  static setEpochProperty(
    scriptHash: string,
    params: {
      localEid: number
      globalPid: string
      state: string
    }
  ): ContractInvocation {
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

  static getEpochProperties(
    scriptHash: string,
    params: {
      localEid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpochProperties',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  static getEpochItems(
    scriptHash: string,
    params: {
      localEid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getEpochItems',
      args: [{ type: 'Integer', value: params.localEid.toString() }],
    }
  }

  static totalEpochs(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalEpochs',
      args: [],
    }
  }
}
