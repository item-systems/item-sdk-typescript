# Security and Production Integration Guidance

This guide focuses on the controls and architectural choices needed for real deployments.

## Security principles

When integrating this SDK in production:

1. keep signing authority out of untrusted clients
2. validate inputs before publishing transactions
3. treat auth payloads as security-sensitive material
4. separate operator/admin flows from end-user flows
5. log enough evidence to investigate failures without leaking secrets

## Signer placement

## Recommended

Put signing in a controlled backend, relayer, or operator environment.

Examples:

- backend service with managed key custody
- operator workstation for admin-only flows
- wallet/session service that exposes a controlled signing interface

## Avoid when possible

- embedding privileged keys directly in browser code
- mixing admin and end-user signing in the same runtime
- allowing arbitrary frontend input to map directly to sensitive write methods

## Auth payload handling

Auth payloads contain challenge material and proof material.

Treat them carefully:

- validate structure before use
- avoid unnecessary persistence of raw proofs
- if you must persist them for audit/debugging, minimize retention and protect access
- decide explicitly whether `burn` should be enabled for the workflow

## Replay and burn semantics

`burn` changes the security posture of an auth flow.

- `burn: false` may be appropriate for validation or reusable challenge patterns where the underlying protocol allows it
- `burn: true` is safer against replay but makes the proof single-use

Your product team should define which flows require burn semantics and document the user impact.

## Authorization boundaries

The SDK is not an authorization system. It submits valid invocations using the signer you provide.

That means your application must still enforce:

- who is allowed to trigger a given write flow
- which ids or properties they may target
- whether the operation requires operator approval

## Sensitive operations

Treat these as privileged operations with explicit auditability:

- `update()` / `updateSync()`
- `purgeItem()` / `purgeItemSync()`
- property mutation methods in operator contexts
- manufacturing/provisioning flows that bind items to keys

## Input validation checklist

Before calling write methods, validate:

- network selection
- contract script hash override, if any
- local ids (`localNfid`, `localCid`, `localEid`, `localUid`, `localAsid`)
- account/address formatting
- public key formatting
- hex encoding for property ids, property states, messages, and proofs
- challenge enum value

## Environment separation

Use separate environments for:

- local development
- testnet / staging
- production mainnet

Do not reuse production keys or production operator procedures in lower environments.

## RPC strategy

For production systems:

- prefer stable, monitored RPC infrastructure
- define retry and failover behavior at the application layer
- record which RPC endpoint handled each sensitive write
- avoid assuming every node has identical latency or availability characteristics

## Observability recommendations

For every write flow, capture:

- method name
- network / RPC endpoint
- signer identity or signer reference
- target ids and script hash
- txid
- start/end timestamps
- success/failure classification

For auth and claim flows, also capture:

- challenge type
- whether burn was requested
- whether preflight validation was run

## Release and upgrade controls

For contract upgrades and SDK upgrades:

1. test in a lower environment first
2. run smoke tests for read paths and critical write paths
3. capture evidence before and after rollout
4. keep a rollback or mitigation plan
5. communicate version changes to integrators

## Frontend guidance

If you expose SDK-backed actions in a frontend:

- keep the frontend focused on user intent and status display
- route privileged writes through a backend or wallet boundary
- never trust client-provided ids, addresses, or payloads without server-side validation

## Supportability guidance

Prepare a runbook for operators and support engineers that answers:

- which network is this environment using?
- which contract deployment is targeted?
- who owns the signing key?
- how do we inspect tx execution?
- how do we verify post-state?
- when is purge allowed?
- who approves upgrades?

## Recommended production shape

A strong default architecture is:

- **UI** for user interaction
- **backend relayer** for validation, signing policy, and tx orchestration
- **indexer/cache** for search and historical views
- **operator console** for admin-only actions
- **monitoring/logging** for tx lifecycle and failure analysis
