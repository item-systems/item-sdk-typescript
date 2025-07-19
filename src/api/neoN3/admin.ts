import { ContractInvocation } from '@cityofzion/neon-dappkit-types'

export class AdminAPI {
  static update(
    scriptHash: string,
    params: {
      script: string
      manifest: string
      data: any
    }
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
