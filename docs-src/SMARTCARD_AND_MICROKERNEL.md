# Smartcard and microkernel integration

For SDK 0.6.2, start with the
[firmware workflow guide](../skills/item-sdk-typescript/references/firmware-workflows.md).
It is bundled with the npm package and documents actual return values and the
v3.5.4 hardware boundary. Older examples that constructed `new CardReader()` or
used AID `FF6974656D73797302010000` are not recipes for this release.

## Choose the correct API family

| Entry point | Interface |
| --- | --- |
| `@item-systems/item/mobile` | Portable `ItemSecureTunnel(transport, random)` and high-level managers |
| `@item-systems/item/smartcard` | Desktop command/reader abstractions; `CardReader` is an interface |
| `@item-systems/item/globalplatform` | Factory SCP02/03, CAP preflight and GP provisioning |

For a phone, use `/mobile` with host-supplied NFC transport and platform CSPRNG.
Do not bring Node `fs`/crypto, PC/SC or Python into that import graph. See the
[read-only example](../examples/mobile-inspect.ts). Desktop clients taking a
`CardReader` are not interchangeable with mobile clients taking a `Tunnel`.

## Lifecycle boundaries

1. **Connect/inspect:** SELECT the intended application; compare identity and mark
   observations with freshness. Cached metadata is not live card presence.
2. **Authenticate:** open the ITEM application tunnel with its pairing secret.
   Pair only an explicitly authorized unpaired card. This is not GP authentication.
3. **Inspect state:** diagnostics, master metadata, plugin registrations and engine
   capabilities. An algorithm ID is not an engine slot; a UID record is not proof
   of the authenticated session identity.
4. **Perform an authorized operation:** serialize APDUs and verify its actual result.
   Transport loss after a mutation means unknown outcome, not permission to replay.

The v3.5.4 kernel instance AID is `FF6974656D73797303000000`. Pin the release
manifest's AIDs and CAP hashes; wire version metadata is not a release identifier.

## Installation, streaming and SIO registration

GP factory provisioning loads packages and instantiates applets. The API CAP and
acyclic dependency order matter. See [GP provisioning](GLOBALPLATFORM_PROVISIONING.md)
and the pinned firmware manifest; do not use a streaming receipt as proof of this
installation sequence.

Both `InBandBytecodeLoader` APIs return a verified **32-byte SHA-256 hash**, never
a package ID. BEGIN carries a four-byte total size and AID; STREAM/COMMIT select
the session in P1. Mobile uses 218-byte data chunks to leave space for encrypted
short-APDU framing; the desktop loader's configuration is separate. Missing or
malformed receipts fail. Streaming progress is not proof of activation, and the
GP-based physical checkpoint does not qualify in-band applet installation.

Mobile `client.plugins.register(instanceAid, uid, gid, mode, quota)` binds an
existing SIO instance and returns a plugin slot. Desktop `PluginManager` has its
own signatures; consult generated API documentation. Registration is distinct
from both CAP loading and NDEF provider activation. Permissions use numeric
`0o755` / `0x01ed`, not hex `0x0755`; quota is blocks, not reserved storage.

## Keys, signatures and limitations

Derive returns public-key bytes, not a ring ID. Standalone generate/import APIs
have different return contracts. P-256/K1 signing accepts a 32-byte precomputed
digest and returns raw `r || s`; verify it without hashing the digest again.

The released v3.5.4 kernel still has an **active-ring routing/authorization defect**.
The SDK sends requested IDs but cannot guarantee that firmware uses them. Only
controlled active-ring derivation/signing has physical qualification evidence.
Ed25519 is disabled; full NDEF/cache, Enclave storage and AES/MAC/ECIES operations
remain unqualified. API, unit-test or descriptor presence is not support evidence.

Diagnostics with SW=9000 are not a valid URL acknowledgement. Cache APIs now reject
such responses; they do not repair firmware routing. A single refill is 1–255,
not 350. After an ambiguous mutation, inspect state before planning recovery.
