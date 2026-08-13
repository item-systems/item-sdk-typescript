import { Item, types } from '../dist/esm/index.js'

const REQUIRED_ENV = ['ITEM_MAINNET_VECTOR_NFID', 'ITEM_MAINNET_VECTOR_MESSAGE_HEX', 'ITEM_MAINNET_VECTOR_PROOF_HEX']

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. This read-only runner requires an explicitly supplied current MainNet fixture.`)
  }
  return value
}

function requireEvenHex(name, value) {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw new Error(`${name} must be an even-length hexadecimal byte string.`)
  }
  return value.toLowerCase()
}

function challengeFromEnv(value) {
  if (!value) return types.AuthChallenge.ILS_PERMISSIVE

  const challenge = types.AuthChallenge[value]
  if (!challenge) {
    throw new Error(`Unsupported ITEM_MAINNET_VECTOR_CHALLENGE: ${value}`)
  }
  return challenge
}

function tamperFinalByte(proof) {
  const finalByte = proof.slice(-2)
  return `${proof.slice(0, -2)}${finalByte === '00' ? '01' : '00'}`
}

async function main() {
  for (const variable of REQUIRED_ENV) requiredEnv(variable)

  const localNfid = Number(requiredEnv('ITEM_MAINNET_VECTOR_NFID'))
  if (!Number.isSafeInteger(localNfid) || localNfid < 0) {
    throw new Error('ITEM_MAINNET_VECTOR_NFID must be a non-negative safe integer.')
  }

  const message = requireEvenHex('ITEM_MAINNET_VECTOR_MESSAGE_HEX', requiredEnv('ITEM_MAINNET_VECTOR_MESSAGE_HEX'))
  const proof = requireEvenHex('ITEM_MAINNET_VECTOR_PROOF_HEX', requiredEnv('ITEM_MAINNET_VECTOR_PROOF_HEX'))
  const challenge = challengeFromEnv(process.env.ITEM_MAINNET_VECTOR_CHALLENGE)
  const item = await Item.init({
    ...(process.env.NEO_RPC_URL ? { node: process.env.NEO_RPC_URL } : {}),
    ...(process.env.ITEM_SCRIPT_HASH ? { scriptHash: process.env.ITEM_SCRIPT_HASH } : {}),
  })

  const valid = await item.verifyAuthOutcome({
    localNfid,
    auth: { message, proof, challenge },
  })
  if (!valid.valid) {
    throw new Error(`Expected known-good vector to be valid; received ${JSON.stringify(valid)}.`)
  }

  const tampered = await item.verifyAuthOutcome({
    localNfid,
    auth: { message, proof: tamperFinalByte(proof), challenge },
  })
  if (tampered.valid || tampered.reason !== 'invalid-proof') {
    throw new Error(`Expected tampered vector to be invalid-proof; received ${JSON.stringify(tampered)}.`)
  }

  console.log(
    JSON.stringify(
      {
        network: process.env.NEO_RPC_URL ? 'custom MainNet RPC' : 'Neo N3 MainNet default',
        localNfid,
        challenge,
        knownGood: valid,
        tampered: { ...tampered, proofChanged: true },
        writesSubmitted: false,
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
