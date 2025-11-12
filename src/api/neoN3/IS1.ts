import { Arg, ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { u } from '@cityofzion/neon-js'
import { AuthPayload, IS1AuthItem } from '../../types'

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

  static claim(
    scriptHash: string,
    params: { tokenId: string; auth: AuthPayload; receiverAccount?: string }
  ): ContractInvocation {
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
        ...(params.receiverAccount ? ([{ type: 'Hash160', value: params.receiverAccount }] as Arg[]) : []),
      ],
    }
  }

  static authItem(scriptHash: string, params: IS1AuthItem): ContractInvocation {
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
        { type: 'Boolean', value: params.burn },
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

  static tokensOf(scriptHash: string, params: { address: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'tokensOf',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  static ownerOf(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'ownerOf',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }
}
