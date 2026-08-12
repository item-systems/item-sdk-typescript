# ITEM auth/verify — Public MainNet vectors

**Status:** active
**Version:** v0.2
**Date:** 2026-08-12
**Owner:** Trinity

## Scope and safety boundary

- Network: Neo N3 MainNet.
- ITEM contract: `0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d`.
- All executions below use `Item.verifyAuth()`, which invokes `authItem` through `testInvoke` with `burn: false`.
- No write, burn, purge, signer, or secret is required.
- Contract ABI source: [`item-systems/contract_N3_ITEM` `main` `6dad82d`](https://github.com/item-systems/contract_N3_ITEM/tree/6dad82d0e38d1e32c026c33dcd668f0c898c71f9).

## V1 — Known-good current proof

**Qualification timestamp:** 2026-08-12T22:03:26Z

| Field | Value |
|---|---|
| `localNfid` | `4169` |
| NDEF source | `https://itm.st/pt-br/login/?d=BM5_q9XMsndzfnnq8Jh2fD9.Si4oPiGIyjk.B5l4smDWa9NgJFMaeFWsysMzmPW00EfYxy63ltr88eecHCGvHfMAAAAAETBGAiEAywbyGrNsQ2Gg9vmZAkCA151Nafi4fLrq4mkbVVVreHsCIQD4uky7KROiPwqjU9dNbQcuqseUEKmN1SLS5Nxl_pDYkw--` |
| `pubKey` | `03ce7fabd5ccb277737e79eaf098767c3f7e4a2e283e2188ca393e079978b260d6` |
| `message` | `0000000011` |
| `proof` | `cb06f21ab36c4361a0f6f999024080d79d4d69f8b87cbaeae2691b55556b787bf8ba4cbb2913a23f0aa353d74d6d072eaac79410a98dd522d2e4dc65fe90d893` |
| challenge | `ILS_PERMISSIVE` (`01`) |
| `Utils.decodeNDEF(...).validSignature` | `true` |
| ITEM lookup | resolved the public key to NFID `4169`; active asset `3153` |
| expected / observed | `{ valid: true }` |

## V2 — Tampered-proof negative behavior

V2 uses the V1 message and all other inputs unchanged, mutating only the final proof byte:

- original final byte: `93`
- tampered final byte: `00`
- tampered proof: `cb06f21ab36c4361a0f6f999024080d79d4d69f8b87cbaeae2691b55556b787bf8ba4cbb2913a23f0aa353d74d6d072eaac79410a98dd522d2e4dc65fe90d800`

**Qualification timestamp:** 2026-08-12T22:03:26Z

**Observed MainNet behavior:** `testInvoke` faults with `ITEM: Invalid proof` instead of returning a VM boolean `false`.

**Expected runner outcome:** rejected promise / contract fault containing `Invalid proof`. This is the current contract behavior for malformed proof bytes and is the correct negative assertion; SDK callers must distinguish this from a completed execution returning `{ valid: false }`.

## V3 — Post-purge replay

**Status:** unavailable; do not fabricate.

No public-safe replay fixture has been qualified. The historical public payload sweep did identify two stale ILS payloads that now fault with `ITEM: Proof below write pointer`, but neither is proven to be a post-purge replay and must not be relabeled as one:

| NFID | Asset | Current observed reason |
|---|---:|---|
| `4684` | `2409` | `ITEM: Proof below write pointer` |
| `3870` | `2054` | `ITEM: Proof below write pointer` |

A V3 vector can be added only with a public, attributable fixture whose purge/replay state is independently established from on-chain evidence.

## Reproduction outline

```ts
import { Item, Utils, types } from '@item-systems/item'

const item = await Item.init() // MainNet default
const decoded = Utils.decodeNDEF(V1_NDEF_URL)
const result = await item.verifyAuth({
  localNfid: 4169,
  auth: {
    message: decoded.message,
    proof: decoded.proof,
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  },
})

// V1: result === { valid: true }
```

## Source provenance

- V1 NDEF source was previously present in historical SDK integration material. The vector was requalified on the current SDK and current MainNet before being recorded here.
- This file is evidence, not a claim that the source payload is permanently valid. MainNet lifecycle state can change; re-run V1 before using it as a release gate.
