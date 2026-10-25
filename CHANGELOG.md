# Changelog

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
