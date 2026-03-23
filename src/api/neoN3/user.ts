import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { AddressStub, SetUserProperty, UserStub } from '../../types'

/**
 * Invocation builders for user identity records managed by the ITEM contract.
 *
 * Users are the contract's internal identity abstraction for address-linked
 * actors. Creation and property mutation methods are write operations; lookup
 * and counter methods are read-only.
 */
export class UserAPI {
  /**
   * Create a new user record for a blockchain address.
   *
   * The address must be globally unique within the contract's identity model.
   */
  static createUser(scriptHash: string, params: AddressStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'createUser',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  /**
   * Fetch a user by its contract-local user identifier.
   */
  static getUser(scriptHash: string, params: UserStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUser',
      args: [{ type: 'Integer', value: params.localUid.toString() }],
    }
  }

  /**
   * Fetch a user record by blockchain address.
   */
  static getUserWithAddress(scriptHash: string, params: AddressStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUserWithAddress',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  /**
   * Set or replace a user property value.
   *
   * `globalPid` and `state` are hex strings at the SDK boundary and are encoded
   * here into the byte-array representation expected by the contract ABI.
   */
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

  /**
   * Fetch the full property map for a user.
   */
  static getUserProperties(scriptHash: string, params: UserStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getUserProperties',
      args: [{ type: 'Integer', value: params.localUid.toString() }],
    }
  }

  /**
   * Fetch the total number of users currently tracked by the contract.
   */
  static totalUsers(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalUsers',
      args: [],
    }
  }
}
