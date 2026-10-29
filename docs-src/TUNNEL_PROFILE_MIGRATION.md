# Acceptance case: k1 bootstrap → SECURED → in-band r1 → r1 tunnel

Status: **test implemented; end-to-end firmware migration NOT qualified**.
The runner uses the actual mobile SDK. Its separate orchestration unit tests
use explicit fake card responses and do not establish firmware/hardware support.

## Required starting state

- Disposable, explicitly authorized card; physical UID and exact reader name pinned.
- Factory-installed API, kernel, CryptoRegistry, k1, AES and MAC. No r1 applet.
- Kernel install profile `01 01 05 04`: version 1, k1 agreement, AES, MAC.
- Paired with the public development pairing key `00 01 … 1F`; no root credential.
  Do not run this fixed-key qualification against a personal/production card.
- BOOTSTRAP lifecycle, empty wallet by default. `--reuse-master` explicitly allows
  the one existing diagnostic master; it does not replace or export that master.
- Enough free 2048-byte StorageBroker blocks to stage the entire exact r1 CAP.
  The runner checks capacity **before** generating a root or changing lifecycle.

Factory bootstrap is a prerequisite, not hidden inside this test. No GP load,
install, delete or authentication is performed by the runner. The absence probe
SELECTs the ISD, then r1, and requires `6A82`. Probing while the kernel remained
selected produced `6A86` on JCOP; that response alone does not prove absence.

## Acceptance sequence

| Stage | Required evidence |
| --- | --- |
| Bootstrap k1 | A8 profile `01 01 05 04`, fresh valid k1 public key, successful mutual authentication and protected diagnostics; lifecycle 1; r1 absent. |
| Diagnostic wallet | Generate a random root on card (slot response only), derive a k1 ring, discover its ID from master metadata, independently verify a signature. No seed import/export. |
| Secure k1 | Authenticated `INS 22(master, k1 registry slot)`; protected diagnostics become lifecycle 2. Power down, reopen k1 and verify signing still works in SECURED. |
| Stream r1 | SDK `InBandBytecodeLoader.streamCap`; exact returned 32-byte SHA-256 matches the uploaded bytes. Receipt alone is **not installation**. |
| Activate r1 | `INS 50` creates an r1 registry slot; `INS 51` confirms active algorithm 2, ECDH capability, tunnel policy and no deprecation. Use the returned slot, not algorithm ID 2 as a slot. |
| Switch profile | Authenticated `INS 22(master, returned r1 slot)` is the candidate existing selector. A successful response or changed master metadata is **not sufficient**. |
| Prove migration | New SDK session explicitly reinspects the same card. A8 must be `01 02 05 04`, with a fresh valid r1 point. Real r1 ECDH, mutual authentication and protected diagnostics must succeed. |
| Retention/reset | Repeat power-down/reopen three times; remain SECURED, preserve master/ring counts and the diagnostic k1 public key, and independently verify k1 signatures **inside the r1 tunnel**. |

Wallet/master selection must not turn a wallet seed into a persistent transport
private key. Every handshake requires a fresh ephemeral key. The current
`setTunnelAnchor` name reflects the legacy lifecycle API, not a claim that the
new ephemeral transport uses that wallet key.

The SDK intentionally pins the previously inspected curve. Following an
authorized migration, the runner closes the old session and creates a new one
for explicit reinspection; it does not disable that protection or try fallback
curves. Each write is attempted once. Failure logs identify the stage; nothing
automatically resumes, retries a chunk, wipes keys, or restores an old profile.

## Run

Build the SDK first so its exported `@item-systems/item/mobile` package is current.
The adapter requires Python with `pyscard` and native PC/SC access. Set
`ITEM_TEST_PYTHON` if `python3` is not that interpreter.

```sh
npm run test:mobile

# Default: inspect/authenticate only. Set the UID to the authorized physical card.
ITEM_TEST_UID=044D2AB2971490 node tests/hardware/tunnel-profile-migration.mjs \
  --transport tests/hardware/omni-transport.mjs \
  --cap ../item-engine-secp256r1/build/javacard/item-engine-secp256r1.cap \
  --log /absolute/path/migration-preflight.jsonl \
  --reuse-master
```

Omit `--reuse-master` on a freshly bootstrapped empty wallet. Add `--execute`
**only when intentionally authorizing the full mutation sequence**. It creates
a diagnostic ring and permanently transitions lifecycle to SECURED, and will
attempt upload/registration/profile selection. The default preflight does none
of those writes. A preflight-only success never reports migration qualified.

Logs contain stages, lifecycle, public-key fingerprints, CAP hash/size, engine
metadata and chunk progress. They omit private/seed/session/pairing material and
raw encrypted APDU bodies. Exit status is nonzero on failed assertions or an
uncertain transport outcome. Do not blindly rerun after partial execution.

## Observed blockers, 2026-10-27

Read-only physical preflight on Omni/Identiv uTrust 3700 F CL Reader, physical
card UID `044D2AB2971490`:

- Actual SDK k1 authentication succeeded; SELECT and protected diagnostics both
  reported BOOTSTRAP. One diagnostic root was already present.
- Normal registry slots 0/1/2 contained k1/AES/MAC, policy 7, reference count 1.
- r1 applet absence was confirmed from the platform's `6A82` response.
- r1 CAP: **22,507 bytes**, SHA-256
  `f50aa67f299ac0f5d18d5469a417dd252b1da9f640012f4ca3ccfd173f999334`.
- Requires **11 staging blocks**; card reports **5 free**. Runner stopped at
  `bootstrap_preflight`, before root generation, ring derivation or lifecycle
  mutation. No on-card SECURED transition or r1 migration was attempted.

Capacity is not the only blocker. Review of the coordinated working branches
also found these independent issues (not inferred from the preflight):

1. **BEGIN wire mismatch.** Mobile `InBandBytecodeLoader` sends a 4-byte size.
   Firmware `BytecodePackageHandler.handleBegin` reads a 2-byte size followed by
   AID length. For this CAP, that parses zero as AID length and rejects the request.
2. **COMMIT receipt mismatch.** `BytecodePackageHandler.handleCommit` returns
   zero bytes, whereas the SDK requires the exact 32-byte hash.
3. **No native applet installation in the current stream path.**
   `BytecodeLoader.commitPackage` verifies/hashes staged bytes and releases their
   storage blocks. It does not install/instantiate the r1 Java Card applet.
   CryptoRegistry's host-create path requires `JCSystem.lookupAID` to find an
   already installed engine and then resolves its SIO. More staging space or a
   matching hash alone cannot satisfy that requirement. The verifier also reads
   a component sequence, not the raw ZIP-format CAP consumed by this SDK API.
4. **Profile mutation not wired.** Kernel `tunnelAgreementAlgorithm` is assigned
   during installation. `MasterKeyHandler.handleSetTunnel` changes master
   metadata/lifecycle but not that profile. CryptoRegistry's
   `initializeTunnelEngines` explicitly rejects a different algorithm once
   initialized. The test therefore checks the new A8 profile and actual r1
   handshake, rather than treating `INS 22 → 9000` as a migration.

These are test prerequisites/implementation gaps, not changes made by this test.
Do not make the test green by preinstalling r1 with GP, substituting mocked
firmware installation, reducing checks to metadata, or retaining the k1 tunnel.

Follow-on hardware negative qualifications are still required when the happy
path exists: denied capability, incompatible/deprecated target, power loss
during activation/profile commit, invalid/stale handshake and wrong pairing
key. Those must preserve a recoverable authorized profile or fail closed, never
silently fall back. Existing standalone tunnel tests cover some handshake/MAC
failures but are not evidence for interrupted profile migration.
