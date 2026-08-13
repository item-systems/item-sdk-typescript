# Examples

These examples are intentionally small and documentation-oriented. They show the expected SDK shape and common workflows.

Unless explicitly stated otherwise, treat them as illustrative reference snippets rather than copy-paste runnable programs.

## Files

- `init-readonly.ts` — read-only initialization and item lookup
- `init-signed.ts` — signed initialization for write operations
- `auth-validation.ts` — canonical `verifyAuth` preflight plus clearly separated on-chain authentication example
- `auth-verify-mainnet.ts` — MainNet-by-default, read-only `verifyAuth` example using environment-provided inputs
- `tac-workflows.ts` — tokenized asset contract lookup and claim examples

## Environment setup

Most examples assume one or more of these environment variables when adapted for real usage:

- `NEO_RPC_URL` — override the default RPC endpoint
- `ITEM_SCRIPT_HASH` — override the default ITEM contract deployment
- `NEO_PRIVATE_KEY` — signer for write examples

Example shell setup for a read-only MainNet integration:

```bash
export NEO_RPC_URL="https://mainnet1.neo.coz.io:443"
export ITEM_SCRIPT_HASH="0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d"
```

For a non-production rehearsal, explicitly choose a TestNet or staging RPC and deployment-specific script hash rather than treating it as the default:

```bash
export NEO_RPC_URL="https://testnet1.neo.coz.io:443"
export ITEM_SCRIPT_HASH="0x<testnet-or-staging-deployment>"
export NEO_PRIVATE_KEY="<staging-signer-only>"
```

## Running examples

These files are reference snippets first. Adapt RPC endpoints, signer configuration, script hashes, and payload values for your environment before using them in production.

A common local approach is to run them through your preferred TypeScript runner, for example:

```bash
npx ts-node examples/init-readonly.ts
```

## Automated read-only regression runner

`test:mainnet:readonly` is an **opt-in** MainNet regression runner. It rebuilds the SDK, runs only `testInvoke` verification, and never submits a signer, burn, purge, or write.

It intentionally requires explicit environment fixture values so the default test suite stays deterministic and does not silently depend on mutable MainNet lifecycle state:

```bash
export ITEM_MAINNET_VECTOR_NFID="4169"
export ITEM_MAINNET_VECTOR_MESSAGE_HEX="0000000011"
export ITEM_MAINNET_VECTOR_PROOF_HEX="cb06f21ab36c4361a0f6f999024080d79d4d69f8b87cbaeae2691b55556b787bf8ba4cbb2913a23f0aa353d74d6d072eaac79410a98dd522d2e4dc65fe90d893"
export ITEM_MAINNET_VECTOR_CHALLENGE="ILS_PERMISSIVE"
npm run test:mainnet:readonly
```

The runner asserts both:

1. the supplied known-good proof returns `{ valid: true }`; and
2. changing only its final byte returns `{ valid: false, reason: 'invalid-proof' }`.

MainNet item lifecycle state can change. Requalify fixture inputs against [`TEST_VECTORS_AUTH_VERIFY_MAINNET.md`](../docs-src/TEST_VECTORS_AUTH_VERIFY_MAINNET.md) before using this runner as a release gate. It is deliberately excluded from default and pull-request CI.


- `../docs-src/WORKFLOW_PLAYBOOKS.md`
- `../docs-src/AUTHENTICATION.md`
- `../docs-src/ENVIRONMENTS_AND_COMPATIBILITY.md`
