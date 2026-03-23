# Environments, Compatibility, and Setup

This guide helps integrators choose the right runtime, network, and setup pattern.

## Supported chain target

This SDK targets **Neo N3** ITEM contract workflows.

Built-in network constants:

```ts
constants.NeoN3NetworkOptions.LocalNet
constants.NeoN3NetworkOptions.TestNet
constants.NeoN3NetworkOptions.MainNet
```

You may also pass a custom RPC endpoint string with `node`.

## Initialization modes

## Read-only mode

Use for queries and preflight reads.

```ts
const item = await Item.init({
  node: constants.NeoN3NetworkOptions.MainNet,
})
```

## Signed mode

Use for state-changing methods.

```ts
const item = await Item.init({
  node: constants.NeoN3NetworkOptions.TestNet,
  account,
})
```

## Custom integration mode

Use when your application already owns wallet/session infrastructure.

```ts
const item = await Item.init({
  node,
  scriptHash,
  invoker,
  listener,
  parser,
})
```

## Runtime expectations

The package is designed for TypeScript/JavaScript environments that can use the Neon ecosystem dependencies it builds on.

In practice, integrators should verify compatibility for:

- Node.js service runtimes
- bundler-based application runtimes
- any environment using optional smartcard transports

## Smartcard compatibility notes

Smartcard support is more environment-sensitive than the core contract facade.

Consider it separately:

- desktop/PCSC-style environments may support the optional transport path
- CI and deterministic tests should prefer mock transports
- browser-only environments may need a different device bridge architecture

## Network selection guidance

### Local development

Use `LocalNet` only when you control a local Neo N3 environment and know the deployed contract/script hash.

### Test environments

Use `TestNet` for integration testing, smoke tests, and pre-production rehearsals.

### Production

Use `MainNet` or a production-approved custom RPC endpoint.

## Script hash overrides

By default, the SDK uses its canonical deployment assumptions. Override `scriptHash` when:

- you are targeting a custom deployment
- you are testing a staged deployment
- you are validating a migration or upgrade candidate

Whenever you override `scriptHash`, log it explicitly in your application telemetry and support tooling.

## Environment variables

Common environment variables in real integrations include:

- `NEO_RPC_URL`
- `NEO_PRIVATE_KEY`
- `ITEM_SCRIPT_HASH`
- application-specific ids or addresses for smoke tests

Example pattern:

```ts
const item = await Item.init({
  node: process.env.NEO_RPC_URL,
  scriptHash: process.env.ITEM_SCRIPT_HASH,
  account: process.env.NEO_PRIVATE_KEY
    ? new wallet.Account(process.env.NEO_PRIVATE_KEY)
    : undefined,
})
```

## Compatibility checklist

Before shipping, verify:

- install succeeds from a clean environment
- `npm run tsc` succeeds
- `npm test` succeeds in your CI baseline
- your chosen runtime can reach the target RPC endpoint
- your signer path works in the target environment
- optional smartcard functionality is tested only where the transport is actually supported

## Recommended environment matrix

At minimum, maintain this matrix in your own integration project:

| Environment | RPC | Signer | Purpose |
| --- | --- | --- | --- |
| local | local node or sandbox RPC | test key | developer iteration |
| test/staging | testnet or staging deployment | staging key | integration and release validation |
| production | approved mainnet RPC | production-controlled key | real user traffic |

## Example setup flow

1. choose the target network
2. decide whether you need read-only or signed mode
3. decide whether to override `scriptHash`
4. validate RPC reachability
5. run a simple read smoke test
6. run a low-risk signed smoke test in non-production first
