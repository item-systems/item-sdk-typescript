import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { AddressStub, SetUserProperty, UserStub } from "../../types";

/**
 *
 */
export class UserAPI {
  /**
   * Creates a new user in the internal identity solution for NFIs.
   * @param scriptHash the scripthash of the target contract
   * @param params {Object} The input parameters
   * @param params.address {string} The address of the new account. This value is global unique.
   */
  static createUser(
    scriptHash: string,
    params: AddressStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'createUser',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static getUser(
    scriptHash: string,
    params: UserStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUser',
      args: [{ type: 'Integer', value: params.localUid.toString() }],
    }
  }

  static getUserWithAddress(
    scriptHash: string,
    params: AddressStub
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUserWithAddress',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static setUserProperty(scriptHash: string, params: SetUserProperty): ContractInvocation {
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
