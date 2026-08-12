import { Arg, ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { u } from '@cityofzion/neon-js'
import { AuthChallenge, AuthPayload, IS1AuthItem } from '../../types'

/**
 * Invocation builders for IS1-compatible item contracts.
 *
 * This namespace mirrors a subset of the ITEM authentication and token lookup
 * flows for contracts that expose the IS1 surface. It is useful when an
 * integrator needs the lower-level invocation payloads without going through the
 * full `Item` facade.
 */
export class IS1API {
  /**
   * Check whether a token is currently claimable.
   */
  static isClaimable(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'isClaimable',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }

  /**
   * Set the claimable state for a token.
   */
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

  /**
   * Build a claim invocation using an authentication payload and optional
   * receiver override.
   *
   * The auth tuple is encoded as a nested Neo VM array because that is the ABI
   * shape expected by the IS1 contract.
   */
  static claim(
    scriptHash: string,
    params: { tokenId: string; auth: AuthPayload; receiverAccount?: string }
  ): ContractInvocation {
    const authPayload: Arg[] = [
      { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.challenge ?? AuthChallenge.ILS_PERMISSIVE) },
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

  /**
   * Submit an IS1 authentication proof for a token.
   *
   * As with the ITEM contract flow, the challenge is byte-reversed before being
   * encoded to match the contract's interpretation rules.
   */
  static authItem(scriptHash: string, params: IS1AuthItem): ContractInvocation {
    const authPayload: Arg[] = [
      { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
      { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
      {
        type: 'ByteArray',
        value: u.hex2base64(u.reverseHex(params.auth.challenge ?? AuthChallenge.ILS_PERMISSIVE)),
      },
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

  /**
   * Fetch token metadata/state for a specific token id.
   */
  static getItem(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }

  /**
   * Fetch the property map for a specific token id.
   */
  static properties(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'properties',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }

  /**
   * Enumerate token ids owned by an address.
   */
  static tokensOf(scriptHash: string, params: { address: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'tokensOf',
      args: [{ type: 'Hash160', value: params.address }],
    }
  }

  /**
   * Fetch the current owner of a token.
   */
  static ownerOf(scriptHash: string, params: { tokenId: string }): ContractInvocation {
    return {
      scriptHash,
      operation: 'ownerOf',
      args: [{ type: 'ByteArray', value: params.tokenId }],
    }
  }
}
