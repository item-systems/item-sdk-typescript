# ITEM TypeScript firmware workflows

## Current P-256 PIN checkpoint (0.7.0-exchange.2)

Use kernel v3.6.0-exchange.2, registry/P-256 v3.1.0-exchange.2 and the retained
AES/MAC v3.1.0-exchange.1. The minimal six-CAP configuration has physical Omni
PIN/group/lockout/signing/retirement/recovery evidence; phone NFC and K1 PIN do
not. Release CAPs are CI rebuilds; compare hashes before inheriting local binary
qualification. See RELEASE_NOTES.md for tested hashes and memory limits.
POSIX and retirement transport fixes described below are included in this tag.

## Exchange-provider checkpoint (0.7.0-exchange.1)

Use the coordinated item-javacard v3.6.0-exchange.1 and engine/registry
v3.1.0-exchange.1 tags for this prerelease, not the historical baseline below.
See RELEASE_NOTES.md and the firmware EXCHANGE_PROVIDER_V1.md contract.
The mobile SDK probes INS 25/P1=3 before PIN/password login. Only mechanism 0001
(SPAKE2 P-256/SHA-256) is implemented. K1 key-exchange capability does not imply
K1 password support. Do not silently fall back to another engine or replay BEGIN.
Direct ANY_OF group login uses a member credential; UAC retains the group's
permissions, not a union of member permissions. Password login is software-tested,
not yet physically qualified. Keep those evidence levels separate.

Local 2026-10-29 qualification (not the published tags) subsequently passed
P-256 PIN login, reconnects, group authority isolation, on-card retry lockout,
root derivation, group signing and post-retirement PIN login on the Omni test
card. It required a RAM-reclaimed kernel and shared-EC-container R1 candidate;
do not claim the published exchange.1 CAPs inherit this result. K1 PIN and phone
NFC are still not covered. Current mobile POSIX uses INS 70/71/72; STAT is eight
bytes including its type/id prefix. Historical Python vectors with 65/66/67 and
six-byte responses are obsolete. Retirement must release the transport before
the next login reconnects, including when its acknowledgement was lost.

## Entry points

| Import | Purpose |
| --- | --- |
| `@item-systems/item` | Neo N3 contract SDK |
| `@item-systems/item/mobile` | Portable ItemSecureTunnel, MicrokernelClient and plugin managers |
| `@item-systems/item/globalplatform` | Factory Card Manager, CAP preparation and GP installation |
| `@item-systems/item/smartcard` | Desktop CardReader/command APIs; signatures differ from mobile |

The mobile entry point takes a `CardTransport` and `RandomSource`, not a Python
process or desktop reader. Transport `transmit` returns bytes including SW1/SW2.
Use a platform cryptographic RNG returning the requested number of bytes. Never
substitute `Math.random`. TypeScript/parity tests do not prove NFC-device behavior.

## Historical compatibility checkpoint (SDK 0.6.3)

Firmware: [item-javacard v3.5.4](https://github.com/item-systems/item-javacard/releases/tag/v3.5.4),
CryptoRegistry 3.0.3, Enclave/KeyRingCache 3.0.2, engines 3.0.1; API CAP remains
the retained v3.5.3 binary. Pin CAP hashes and AIDs from that release's manifest.
Wire metadata may report 3.0.0; it is not an attestation of a Git tag or CAP hash.

- Physical checkpoint evidence: installation, pairing/tunnel, plugin registration,
  registry binding, active-ring P-256/K1 derivation and signing; seven known-input
  derivations and 24 independently verified signatures, including reset checks.
- Kernel **requested-ring routing/authorization remains defective**. Passing a
  ring ID does not ensure that ring is used. No multi-ring qualification claim.
- Ed25519 is intentionally disabled (capabilities zero); no working Ed25519 claim.
- NDEF/cache, Enclave storage and AES/MAC/ECIES operations remain unqualified.
- Package streaming, VFS, audit and optional identity authentication are API
  surfaces, not additions to this hardware qualification claim.
- Python supplied the physical qualification harness. Run a separate app/device
  regression before claiming the TypeScript package is equivalently qualified.

## Connection and inspection

```ts
import {
  ItemSecureTunnel, MicrokernelClient,
  type CardTransport, type RandomSource,
} from '@item-systems/item/mobile'

export async function inspectCard(
  transport: CardTransport, random: RandomSource,
  pairingKey: Uint8Array, expectedUid: string,
) {
  const tunnel = new ItemSecureTunnel(transport, random)
  try {
    const info = await tunnel.connect()
    if (info.uid !== expectedUid.toLowerCase()) throw new Error('Unexpected card')
    if (!info.paired) throw new Error('Card needs separately authorized pairing')
    await tunnel.open(pairingKey)
    const client = new MicrokernelClient(tunnel)
    return { info, diagnostics: await client.getDiagnostics(), masters: await client.masterkeys.getStats() }
  } finally {
    await tunnel.close()
  }
}
```

Obtain the expected application UID through a deliberate initial inspection. It
is distinct from the reader's RF UID. `connect` selects; `open` authenticates;
`pair` changes persistent state. A 32-byte application pairing key is not a GP
SCP02/03 factory key. Never automatically pair or replace a stored key on failure.
Optional identity authentication supplies a UID plus proof; a supplied UID alone
does not establish permission. `client.uac.query(uid)` returns that identity's
record/capabilities, not proof that the session is authenticated as that UID.

The app can retain a selected-card snapshot across screens, timestamp it, and
refresh after reconnect/mutation. Do not label stale observations as connected.
Serialize APDUs, avoid overlapping polls with mutations, invalidate the session
on link loss, and keep explicit confirmation for destructive actions.

## Keys and engine discovery

`new CryptoRegistryClient(tunnel).querySlot(slot)` returns `algorithm`, `active`,
`capabilities` and policy metadata. Algorithm 2 means P-256; algorithm 1 means
K1; **neither identifies the allocated engine slot**. Inspect slots rather than
hard-coding a P-256 slot. A descriptor with zero capabilities is not usable.

- `client.masterkeys.generate()` returns a master slot; inspect `getStats()` first.
- `client.keyrings.derive(master, pathBytes, engineSlot)` returns public-key bytes,
  not a ring index. Paths contain up to ten big-endian uint32 components; the high
  bit marks hardened derivation. An empty path requests the root.
- For the v3.5.4 controlled active-ring workflow, inspect diagnostics before/after
  derive, compare `currentRing`, count and exported public key with the result.
  This is not a general fix for the firmware's routing/authorization defect.
- `sign(ring, digest32)` takes a precomputed digest. P-256/K1 return raw 64-byte
  `r || s`; convert to DER only if the host verifier requires it and verify as a
  prehashed digest, not SHA256(digest). Exported EC keys in this checkpoint are
  65-byte uncompressed points. Ed25519 remains unavailable.

## Installation is not registration

Factory bootstrap via GlobalPlatform loads packages and creates applet instances.
Use release manifest order, instance AIDs and install parameters; preserve platform
and Card Manager state unless explicitly authorized otherwise.

In-band package API: `new InBandBytecodeLoader(tunnel).streamCap(cap, packageAid)`
returns the exact SHA-256 of the streamed bytes after comparison with the returned
32-byte card digest. BEGIN is 4-byte length + 1-byte AID length + AID; STREAM and
COMMIT carry the stream slot in P1. Mobile uses 218-byte chunks to fit the short
encrypted APDU envelope. Desktop loader configuration is separate; do not copy
its nominal chunk size into the mobile path. Hash success is not evidence that a
Java Card VM installed an applet. This in-band lifecycle is not hardware-qualified
by the current checkpoint's GP installation tests.

`client.plugins.register(instanceAid, uid, gid, 0o755, quotaBlocks)` registers an
existing SIO instance and returns a plugin slot; it is not CAP installation.
Use octal `0o755` (decimal 493 / hex 0x01ed), not hex 0x0755. Query the returned
slot and compare the instance AID. Built-in `codeHash` descriptors need not equal
the CAP ZIP hash; distinguish them from a streaming receipt. Activating the NDEF
provider is a separate `setActiveNdefProvider(slot)` operation.

## Cache, failures and logs

`KeyRingCacheClient` uses the same tunnel. `setBaseUrl` accepts 1–100 UTF-8 bytes
and requires an empty acknowledgement. A diagnostics payload with SW=9000 is a
misrouted response, not successful configuration. `refillCache(ring,count)` accepts
1–255 per request and requires a 2-byte response. `getCacheStatus` requires nine
bytes and rejects an unconsumed count above capacity. Larger totals need explicit
capacity-aware batches only on qualified firmware; do not mask 350 to 94.

A timeout after a mutation means **unknown outcome**, not confirmed failure.
Stop streaming/refill/install, close the session, re-identify and inspect. Do not
auto-replay generate/import/register/erase/commit. Log step, INS, SW when available,
duration, response length and SDK/firmware pins. Exclude keys, seeds, plaintext
secrets and tunnel payloads. The v3.5.4 cache-routing limitation is not an NFC retry
problem, and these SDK checks intentionally surface it.
