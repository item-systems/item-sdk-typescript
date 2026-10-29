# Identity/capability repair candidate

This coordinated firmware/SDK candidate adds explicit challenge-v1 identity
authentication. It is not yet released or hardware-qualified. Older firmware
rejects the mode; the SDK never retries as pairing-only UID0.

## Usage

```typescript
import { ItemSecureTunnel, UacManager, UacCapability } from '@item-systems/item/mobile'

const tunnel = new ItemSecureTunnel(transport, platformCSPRNG)
await tunnel.connect()
// Transitional legacy transport key, NOT an intended permanent operational requirement.
// The identity's public key must already be enrolled on this same card.
await tunnel.open(pairingKey, {
  identityId: 7,
  credentialSlot: 0,
  algorithm: 2, // 1=k1, 2=P-256; independent of tunnel ECDH curve
  privateKey: identitySigningKey,
})
const uac = new UacManager(tunnel)
const current = await uac.current()
if ((current.capabilities & UacCapability.MANAGE_IDENTITIES) !== 0) {
  // Present identity administration UI. Firmware remains the authority.
}
```

The selected UID is asserted in a signature bound to the card UID, host
ephemeral public key, fresh card nonce, credential slot and algorithm. The card
verifies its stored public key and returns an authenticated UID receipt.
`authenticatedIdentityId` is null before authentication and after close/failure.
The same physical NFC connection can be reused; each OPEN refreshes SELECT and
both ephemeral keys. No automatic command replay or credential downgrade occurs.

`current()` uses INS 81/P1P2=FFFF. The older smartcard `IdentityManager` also
exposes `current()` for an already-authenticated reader; it does not itself
implement the new handshake. Explicit queries require UID 0..127. Missing
identity statuses 6A83/legacy 6A88 return null; malformed success, 6A82,
permission errors and transport loss remain errors.

Updating/deleting the current identity or adding/removing its own credentials
closes the session after acknowledgement. Reauthenticate before further work.
Capabilities are not permanently cached from login; use `current()` for the
live descriptor and treat authorization errors as authoritative.

## Capability-mask migration (breaking correction)

Previous TypeScript names encoded unrelated firmware privileges. This version
uses firmware UacConstants; do not blindly reuse persisted old numeric masks.

| Name | Previous SDK mask | Correct firmware mask |
| --- | --- | --- |
| SELECT_TUNNEL_MASTERKEY | 0400 | 0002 |
| CRYPTO_LOAD_BYTECODE | 1000 | 0020 |
| MANAGE_IDENTITIES | 0200 | 0040 |
| CRYPTO_EXECUTE | absent | 0200 |
| CREATE_KEYRING | absent | 0400 |

All values are hexadecimal. DERIVE_KEY, CRYPTO_DEPRECATE_ENGINE and
CRYPTO_DELETE_ENGINE aliases were removed because those names do not identify
distinct firmware capability bits. Derivation/signing are also governed by
resource POSIX permissions; there is no safe privilege-preserving alias for the
old mislabels. Both public SDK entrypoints export the same UacCapability enum.

## Scope and unfinished work

- Challenge-v1 authenticates direct P-256/k1 credentials under ANY_OF/threshold1.
  PIN, symmetric, indirect, ALL_OF and M_OF_N authentication are not implemented
  by this mode. Descriptor CRUD support must not be presented as working MFA.
- Credential wire tags are PIN=1, symmetric=2, asymmetric=3, indirect=4; firmware
  packed storage uses different PIN/asymmetric tags. Do not send storage tags.
- Pairing/UID0 retirement is deferred. Pairing bytes still participate in this
  transitional KDF; the intended design retires them after bootstrap. This is
  not permanent lockout and is not a release-ready operational trust model.
- The historical Python identity codec is not used by `open()`. The deprecated
  `identityPayload()` helper is retained only as a reference codec.
- Pinned Python CRUD fixtures used invalid UID258; tests now reject that input
  and use separate, valid firmware wire vectors. Python parity is not firmware
  qualification. The Python SDK and app UI have not been migrated in this patch.

See firmware `docs/IDENTITY_CHALLENGE_V1.md` for the exact protocol and remaining
release gates. Run `npm run tsc && npm test`; hardware qualification is separate.
