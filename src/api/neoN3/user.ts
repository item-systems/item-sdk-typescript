import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'

export class UserAPI {
  static createUser(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'createUser',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static getUser(
    scriptHash: string,
    params: {
      localUid: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUser',
      args: [{ type: 'Integer', value: params.localUid.toString() }],
    }
  }

  static getUserWithAddress(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUserWithAddress',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static setUserProperty(
    scriptHash: string,
    params: {
      localUid: number
      globalPid: string
      state: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'setUserProperty',
      args: [
        { type: 'Integer', value: params.localUid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
        { type: 'ByteArray', value: u.hex2base64(params.state) },
      ],
    }
  }

  static totalUsers(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalUsers',
      args: [],
    }
  }
}
