# Changelog

## 0.7.0-exchange.1

Architecture checkpoint: password login probes a versioned exchange-provider
descriptor before using the P-256 SPAKE2 adapter. Unknown mechanisms fail closed,
without falling back to R1 or consuming/replaying a BEGIN. Kernel/UAC owns the
authenticated identity and group authorization. See RELEASE_NOTES.md for the
coordinated firmware tags and physical-qualification limitations.

- Treat firmware `6A83` and legacy `6A88` as an absent UAC identity (`null`).
  Authentication, transport and other card failures still propagate without retries.
- Select secp256k1 or P-256 ECDH from the explicit firmware tunnel profile.
  Reject unsupported profiles, wrong-curve points, and profile changes/removal
  between inspection and OPEN. Legacy cards without a profile remain P-256.
  Add dual-curve handshake and fail-closed profile regression tests.
- Mobile tunnel authentication now refreshes SELECT metadata before every OPEN,
  including retries, so it uses the card's fresh single-use ECDH public key.
  The existing NFC transport remains connected; no additional physical tap is required.
- Reject a changed card UID before sending OPEN/identity proof, and discard
  cached metadata when the refresh fails. Wallet keys and pairing are unchanged.
- Add rotating-key reference-card tests for successful reconnects, rejected
  authentication, card replacement and NFC loss during SELECT.

## 0.6.3

- Fix packed-consumer verification under `NODE_ENV=production`: explicitly install
  compiler development dependencies and invoke that compiler directly instead of
  allowing `npx` to fetch the unrelated `tsc` package. CI now covers this environment.
- Carries all 0.6.2 documentation, validation and bundled-skill changes; no card API
  or firmware protocol changes. 0.6.2 exists on GitHub but its npm publication failed.
- Generated HTML documentation is also provided as a release ZIP. Hosted-docs
  deployment requires repair of the repository's invalid AWS publishing credential.

## 0.6.2

- Ship portable NFC workflow documentation and an opt-in, self-contained
  `item-sdk-typescript` agent skill in the npm package.
- Clarify pairing versus GP authentication, registry slots versus algorithm IDs,
  derive return values, digest signing, installation versus SIO registration,
  package hash receipts, and unknown-outcome retry handling in inline API docs.
- Retain the GP INSTALL response-length fix and strict cache acknowledgement,
  refill/status response validation. Nonempty URL acknowledgements now fail
  instead of incorrectly treating diagnostics as successful configuration.
- Include source guides in the package and mobile/GP APIs in generated TypeDoc;
  publish the actual TypeDoc output directory. Lint no longer rewrites sources.
- Desktop package loading now rejects missing/malformed hash receipts and session
  slots, invalid CAP/AID inputs, and invalid chunk sizes instead of accepting
  incomplete success responses or entering a zero-length chunk loop.
- Firmware compatibility reference: item-javacard v3.5.4 and its exact CAP manifest.
  Requested-ring routing remains defective; Ed25519 is disabled; full NDEF,
  Enclave storage and AES/MAC/ECIES operation qualification remains outstanding.
- No new hardware qualification and no firmware protocol redesign in this release.
