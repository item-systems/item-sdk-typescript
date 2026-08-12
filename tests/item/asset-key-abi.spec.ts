import { expect } from 'chai'
import { AssetAPI } from '../../dist/esm/api/neoN3/asset.js'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'
const COMPRESSED_PUBLIC_KEY = '02c0ffee00112233445566778899aabbccddeeff00112233445566778899aabbcc'

describe('Asset public-key lookup ABI encoding', () => {
  it('encodes the ECPoint lookup key as a ByteArray without hash normalization', () => {
    const invocation = AssetAPI.getAssetWithKey(SCRIPT_HASH, { pubKey: COMPRESSED_PUBLIC_KEY })

    expect(invocation).to.deep.equal({
      scriptHash: SCRIPT_HASH,
      operation: 'getAssetWithKey',
      args: [{ type: 'ByteArray', value: COMPRESSED_PUBLIC_KEY }],
    })
  })
})
