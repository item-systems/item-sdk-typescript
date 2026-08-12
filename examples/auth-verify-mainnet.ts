// Mainnet read-only authentication verification example
//
// This example uses environment variables for inputs and performs a read-only
// validation against the Item contract on Neo N3 MainNet by default.
// It does NOT submit any on-chain writes.
//
// Required env vars:
//   - ITEM_LOCAL_NFID           (e.g., "42")
//   - ITEM_AUTH_MESSAGE_HEX     (hex string)
//   - ITEM_AUTH_PROOF_HEX       (hex string)
// Optional env vars:
//   - ITEM_AUTH_CHALLENGE       (ILS_PERMISSIVE | ILS_RESTRICTIVE | HTLS_PERMISSIVE | HTLS_RESTRICTIVE)
//   - NEO_RPC_URL               (override RPC endpoint)
//   - ITEM_SCRIPT_HASH          (override contract deployment)

import { Item, types } from '@item-systems/item'

function pickChallenge(input?: string): types.AuthChallenge | undefined {
  if (!input) return undefined

  switch (input.toUpperCase()) {
    case 'ILS_PERMISSIVE':
      return types.AuthChallenge.ILS_PERMISSIVE
    case 'ILS_RESTRICTIVE':
      return types.AuthChallenge.ILS_RESTRICTIVE
    case 'HTLS_PERMISSIVE':
      return types.AuthChallenge.HTLS_PERMISSIVE
    case 'HTLS_RESTRICTIVE':
      return types.AuthChallenge.HTLS_RESTRICTIVE
    default:
      throw new Error(`Unsupported ITEM_AUTH_CHALLENGE: ${input}`)
  }
}

async function main() {
  const localNfidRaw = process.env.ITEM_LOCAL_NFID
  const message = process.env.ITEM_AUTH_MESSAGE_HEX
  const proof = process.env.ITEM_AUTH_PROOF_HEX
  const challenge = pickChallenge(process.env.ITEM_AUTH_CHALLENGE)

  if (!localNfidRaw || !message || !proof) {
    console.error(
      'Missing required environment variables. Expected: ITEM_LOCAL_NFID, ITEM_AUTH_MESSAGE_HEX, ITEM_AUTH_PROOF_HEX'
    )
    process.exit(2)
  }

  const localNfid = Number(localNfidRaw)
  if (!Number.isFinite(localNfid) || localNfid < 0) {
    console.error(`Invalid ITEM_LOCAL_NFID: ${localNfidRaw}`)
    process.exit(2)
  }

  const initOpts: Parameters<typeof Item.init>[0] = {}
  if (process.env.NEO_RPC_URL) initOpts.node = process.env.NEO_RPC_URL
  if (process.env.ITEM_SCRIPT_HASH) initOpts.scriptHash = process.env.ITEM_SCRIPT_HASH

  const item = await Item.init(initOpts)

  const validation = await item.verifyAuth({
    localNfid,
    auth: {
      message,
      proof,
      ...(challenge ? { challenge } : {}),
    },
  })

  // Contract default auth window is used unless the deployment overrides it.
  console.log(
    JSON.stringify(
      {
        network: initOpts.node ? 'custom' : 'MainNet (default)',
        scriptHash: initOpts.scriptHash || 'default',
        challenge: challenge ?? types.AuthChallenge.ILS_PERMISSIVE,
        valid: validation.valid,
      },
      null,
      2
    )
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
