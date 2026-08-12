# Examples

These examples are intentionally small and documentation-oriented. They show the expected SDK shape and common workflows.

Unless explicitly stated otherwise, treat them as illustrative reference snippets rather than copy-paste runnable programs.

## Files

- `init-readonly.ts` — read-only initialization and item lookup
- `init-signed.ts` — signed initialization for write operations
- `auth-validation.ts` — off-chain and on-chain authentication examples
- `tac-workflows.ts` — tokenized asset contract lookup and claim examples

## Environment setup

Most examples assume one or more of these environment variables when adapted for real usage:

- `NEO_RPC_URL` — override the default RPC endpoint
- `ITEM_SCRIPT_HASH` — override the default ITEM contract deployment
- `NEO_PRIVATE_KEY` — signer for write examples

Example shell setup:

```bash
export NEO_RPC_URL="https://testnet1.neo.coz.io:443"
export ITEM_SCRIPT_HASH="0x..."
export NEO_PRIVATE_KEY="<private-key>"
```

## Running examples

These files are reference snippets first. Adapt RPC endpoints, signer configuration, script hashes, and payload values for your environment before using them in production.

A common local approach is to run them through your preferred TypeScript runner, for example:

```bash
npx ts-node examples/init-readonly.ts
```

## Related docs

- `../docs-src/WORKFLOW_PLAYBOOKS.md`
- `../docs-src/AUTHENTICATION.md`
- `../docs-src/ENVIRONMENTS_AND_COMPATIBILITY.md`

- `auth-verify-mainnet.ts` — read-only auth validity check using env-provided inputs (MainNet by default)
