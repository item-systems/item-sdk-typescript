import { Arg, ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { u } from '@cityofzion/neon-js'
import { AuthItem, ClaimItem } from '../../types'

export class IS1API {
  static isClaimable(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'isClaimable',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }

  static setClaimableState(scriptHash: string, params: { tokenId: string; state: boolean }): ContractInvocation {
    return {
      scriptHash,
      operation: 'setClaimableState',
      args: [
        { type: 'ByteArray', value: params.tokenId },
        { type: 'Boolean', value: params.state },
      ],
    }
  }

  static claim(scriptHash: string, params: ClaimItem): ContractInvocation {

    const authPayload: Arg[] = [
      { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.challenge) },
    ]

    return {
      scriptHash,
      operation: 'claim',
      args: [
        { type: 'ByteArray', value: params.tokenId },
        { type: 'Array', value: authPayload },
      ],
    }
  }

  static authItem(scriptHash: string, params: AuthItem): ContractInvocation {

    const authPayload: Arg[] = [
      { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
      { type: 'ByteArray', value: u.hex2base64(u.reverseHex(params.auth.challenge)) },
    ]

    return {
      scriptHash,
      operation: 'authItem',
      args: [
        { type: 'ByteArray', value: params.tokenId },
        { type: 'Array', value: authPayload },
        { type: 'Boolean', value: params.burn }
      ],
    }
  }

  static getItem(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }

  static properties(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'properties',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }
}