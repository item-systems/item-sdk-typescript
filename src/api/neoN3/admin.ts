import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { ContractUpdate } from '../../types'

/**
 * Invocation builders for administrative contract operations.
 *
 * These calls are privileged and typically require the contract owner or an
 * explicitly authorized committee account. They are transaction-producing
 * operations and should be treated as governance or maintenance actions rather
 * than normal end-user flows.
 */
export class AdminAPI {
  /**
   * Build an `update` invocation for replacing the contract script/manifest.
   *
   * This is the Neo native contract-upgrade path. Callers are responsible for
   * supplying the fully compiled NEF/script bytes and manifest string in the
   * exact format accepted by the target contract. The optional `data` field is
   * forwarded unchanged to the contract's update handler.
   */
  static update(scriptHash: string, params: ContractUpdate): ContractInvocation {
    return {
      scriptHash,
      operation: 'update',
      args: [
        { type: 'ByteArray', value: params.script },
        { type: 'String', value: params.manifest },
        { type: 'Any', value: params.data },
      ],
    }
  }
}
