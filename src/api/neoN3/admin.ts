import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import { ContractUpdate } from "../../types";

export class AdminAPI {
  static update(
    scriptHash: string,
    params: ContractUpdate
  ): ContractInvocation {
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
