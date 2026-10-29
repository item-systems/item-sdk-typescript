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
