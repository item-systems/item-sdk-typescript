import { u } from '@cityofzion/neon-js'
import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import {
  AuthChallenge,
  AuthItem,
  BindItem,
  CreateItem,
  ItemStub,
  KeyStub,
  PurgeItem,
  RemoteToken,
  SetItemProperty,
} from '../../types'

/**
 * Invocation builders for item lifecycle, lookup, authentication, and mutation
 * operations.
 *
 * This is the most operationally important builder in the SDK because it spans
 * issuance, lookup, property mutation, asset binding, lock state, and
 * proof-based authentication flows. Callers should distinguish carefully between
 * read-only methods (safe for test-invoke) and write methods that produce
 * transactions and may have irreversible effects such as burn-log updates.
 */
export class ItemAPI {
  /**
   * Create a new item inside the given epoch, bound to a remote token id.
   *
   * `bindingTokenId` is expected as a hex string and is encoded into the byte
   * representation required by the contract ABI.
   */
  static createItem(scriptHash: string, params: CreateItem): ContractInvocation {
    return {
      scriptHash,
      operation: 'createItem',
      args: [
        { type: 'Integer', value: params.localEid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.bindingTokenId) },
      ],
    }
  }

  /**
   * Fetch an item by its contract-local item identifier.
   */
  static getItem(scriptHash: string, params: ItemStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  /**
   * Fetch an item by the public key of its bound asset.
   */
  static getItemWithKey(scriptHash: string, params: KeyStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithKey',
      args: [{ type: 'ByteArray', value: params.pubKey }],
    }
  }

  /**
   * Fetch an item by a remote token reference.
   *
   * This is useful when the ITEM contract mirrors or binds state from another
   * contract collection and the caller only has the external script hash and
   * token id.
   */
  static getItemWithTac(scriptHash: string, params: RemoteToken): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemWithTAC',
      args: [
        { type: 'Hash160', value: params.scriptHash },
        { type: 'ByteArray', value: params.tokenId },
      ],
    }
  }

  /**
   * Fetch the property map currently stored for an item.
   */
  static getItemProperties(scriptHash: string, params: ItemStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'getItemProperties',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  /**
   * Fetch the total number of items currently tracked by the contract.
   */
  static totalItems(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'totalItems',
      args: [],
    }
  }

  /**
   * Set or replace an item property value.
   *
   * The property id and state payload are accepted as hex strings and converted
   * into the byte-array representation expected by Neon invocation payloads.
   */
  static setItemProperty(scriptHash: string, params: SetItemProperty): ContractInvocation {
    return {
      scriptHash,
      operation: 'setItemProperty',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
        { type: 'ByteArray', value: u.hex2base64(params.state) },
      ],
    }
  }

  /**
   * Bind an item to a configuration and asset public key.
   *
   * This is the bridge between logical item state and the cryptographic material
   * later used during authentication. The elliptic-curve identifier must match
   * the contract's expected enumeration.
   */
  static bindItem(scriptHash: string, params: BindItem): ContractInvocation {
    return {
      scriptHash,
      operation: 'bindItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'Integer', value: params.localCid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.pubKey) },
        { type: 'Integer', value: params.assetEllipticCurve.toString() },
      ],
    }
  }

  /**
   * Transition an item into its locked state.
   *
   * Locking semantics are contract-defined, but integrators typically use this
   * to prevent further mutable lifecycle actions after provisioning.
   */
  static lockItem(scriptHash: string, params: ItemStub): ContractInvocation {
    return {
      scriptHash,
      operation: 'lockItem',
      args: [{ type: 'Integer', value: params.localNfid.toString() }],
    }
  }

  /**
   * Submit an authentication proof for an item.
   *
   * The message, proof, and challenge are all contract-facing byte payloads. The
   * challenge is reversed before encoding to match the contract's integer/byte
   * interpretation rules. `burn` controls whether the proof should be consumed in
   * a one-time flow.
   */
  static authItem(scriptHash: string, params: AuthItem): ContractInvocation {
    return {
      scriptHash,
      operation: 'authItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
        { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
        // If challenge is omitted, use the accepted SDK default while preserving the contract's one-byte wire value.
        { type: 'ByteArray', value: u.hex2base64(u.reverseHex(params.auth.challenge ?? AuthChallenge.ILS_PERMISSIVE)) },
        { type: 'Boolean', value: params.burn },
      ],
    }
  }

  /**
   * Purge an item using an off-chain proof-based authorization flow.
   *
   * The deployed contract ABI calls the third argument `proof`. `proof` is the
   * canonical SDK field; the deprecated `signature` input remains accepted for
   * a one-major-version migration window. If both are supplied, they must be
   * identical so the SDK never chooses authorization material implicitly.
   *
   * This is a destructive lifecycle action and should be treated as irreversible
   * from an integrator perspective unless the contract explicitly documents a
   * recovery path.
   */
  static purgeItem(scriptHash: string, params: PurgeItem): ContractInvocation {
    const proof = ItemAPI.resolvePurgeProof(params)

    return {
      scriptHash,
      operation: 'purgeItem',
      args: [
        { type: 'Integer', value: params.localNfid.toString() },
        { type: 'ByteArray', value: u.hex2base64(params.message) },
        { type: 'ByteArray', value: u.hex2base64(proof) },
      ],
    }
  }

  /**
   * Resolve the canonical purge proof while preserving a deprecated signature
   * input for existing callers. This guard runs before invocation construction,
   * so ambiguous or missing authorization material never reaches the contract.
   */
  private static resolvePurgeProof(params: PurgeItem): string {
    const proof = params.proof
    const signature = params.signature

    if (proof && signature && proof !== signature) {
      throw new TypeError('PurgeItem.proof and deprecated PurgeItem.signature must match when both are supplied')
    }

    const resolved = proof ?? signature
    if (!resolved) {
      throw new TypeError('PurgeItem.proof is required; deprecated PurgeItem.signature is accepted for compatibility')
    }

    return resolved
  }
}
