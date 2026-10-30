# v0.7.0

Normal release of the working exchange-provider SDK: P-256 and K1 PIN login,
suite-isolated credentials, bootstrap retirement and existing mobile parity APIs.
Use with API/kernel 3.6.0 and companion packages 3.1.0.

CI gates publication on lint, compilation, unit/mobile tests, packed consumers
and documentation generation. No protocol implementation changes in this promotion.
Hardware coverage and limitations remain those of the dated notes below.

## Historical qualification notes

# v0.7.0-exchange.3 — K1 PIN/password companion

Adds mechanism 0002 (ITEM SPAKE2/secp256k1/SHA-256) while preserving mechanism
0001 P-256 and its RFC vector coverage. Discovery selects the configured provider,
with no fallback or replay. K1 credentials use version 2 and separate password,
transcript and record-key domains; P-256 records cannot be reinterpreted as K1.

Enroll K1 with the optional final argument:
`enrollPassword(tunnel, uid, password, cardUid, random, attemptLimit, SPAKE2_SECP256K1_SHA256)`.
The default remains P-256 for compatibility. `openWithPassword` discovers the
supported mechanism automatically; unknown mechanisms fail before BEGIN.

Use K1 v3.1.0-exchange.2, kernel v3.6.0-exchange.2, CryptoRegistry
v3.1.0-exchange.2 and AES/MAC v3.1.0-exchange.1. No R1 applet is needed for K1.
Physical Omni tests passed K1 bootstrap/PIN/reconnect, group authorization,
lockout, generated master/root ring, verified signing and post-retirement PIN.
This is not phone NFC or production-security certification. RAM headroom is small.
151 mobile tests plus the full SDK unit suite and packed consumer checks pass.
The prior POSIX and retirement fixes are included. See the K1 engine release for
the exact suite definition, tested CAP hash and qualification limits.

## Previous checkpoint

# v0.7.0-exchange.2 — P-256 PIN hardware checkpoint

Correct mobile POSIX instructions to 70/71/72 with strict eight-byte STAT parsing. Await transport disconnect after bootstrap retirement, including uncertain outcomes. Extend non-secret hardware diagnostics and regression tests.

Coordinated tags: kernel v3.6.0-exchange.2, CryptoRegistry and P-256
v3.1.0-exchange.2, TypeScript SDK v0.7.0-exchange.2. AES, MAC and K1 remain
v3.1.0-exchange.1. API wire/export versions and AIDs are unchanged.

Physical evidence (Omni/Identiv reader, 2026-10-29): minimal six-CAP P-256
configuration passed PIN login/reconnect, group authority isolation, wrong PIN,
persistent retry exhaustion, raw locked BEGIN rejection, generated master/root
ring/public export, independently verified group signing, bootstrap retirement,
post-retirement PIN login, and factory erase/reinstall. Card Manager keys and
platform were preserved. Final clean bootstrap/wallet/retire run passed.

Kernel parameters: 01010608000001020504 (1 master, 1 initial ring, 6 x 2 KiB
broker blocks; explicit R1/AES/MAC profile). Login approximately 1.1–1.4 seconds.
Only 119/112 bytes RESET/DESELECT free remain (overlapping pools, not additive).
Software: 255 kernel, 9 P-256 and 136 mobile SDK tests passed before checkpoint.

This is a prerelease, not independent production-security certification. K1 PIN,
phone NFC, larger configurations and additional plugins remain unqualified.
ECDSA login is retained but was not requalified in this hardware cycle. Older
cards with persistent reference cycles do not acquire recovery retroactively.

Release CAPs are CI rebuilds. Do not equate their hashes with the locally tested
bytes without comparison. Local tested kernel SHA-256:
8ab874c094d89d0ca9d0854f12cda4b3339c644eb6cf451a86f190757d740cce;
P-256: 5e67d4c0701c1a91d6fcf5af5acdc954422038991a74621ff4a9fff4fa3e36c0.
See [qualification and limits](https://github.com/item-systems/item-javacard/blob/v3.6.0-exchange.2/docs/EXCHANGE_PROVIDER_V1.md).

## Historical release notes

# v0.7.0-exchange.1 — exchange-provider SDK checkpoint

Software-tested prerelease paired with item-javacard v3.6.0-exchange.1 and engine /
CryptoRegistry v3.1.0-exchange.1. Not a physical-card PIN qualification claim.

Password login probes the configured provider's versioned descriptor before
deriving credentials or consuming an attempt. Only SPAKE2 P-256/SHA-256 mechanism
0001 is implemented. Unsupported K1/password or other mechanisms fail closed;
there is no curve fallback, automatic retry, pairing-key prompt or PIN logging.

The same password action authenticates the selected identity or supported direct
ANY_OF group. Kernel UAC decides authorization and owns persistent retries.
Includes coordinated identity APIs, explicit initialization/retirement policy,
tunnel profile migration checks and examples developed before this checkpoint.

Local TypeScript unit/mobile tests and RFC/independent-host protocol checks pass.
Fresh-card PIN login, native memory/firewall behavior, and phone NFC regression
remain outstanding. The simulator/native test fixtures do not establish them.

[Architecture and qualification boundary](https://github.com/item-systems/item-javacard/blob/v3.6.0-exchange.1/docs/EXCHANGE_PROVIDER_V1.md)
