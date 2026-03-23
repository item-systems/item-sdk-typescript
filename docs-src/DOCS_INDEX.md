# Documentation Index

Use this page as the human-oriented map of the SDK documentation.

## Start here

- `README.md` — package overview, install, quickstart, and top-level navigation
- generated API docs — run `npm run docs`

## Core guides

- `API_OVERVIEW.md` — public API grouped by domain
- `WORKFLOW_PLAYBOOKS.md` — end-to-end integration flows
- `ARCHITECTURE_AND_DATA_MODEL.md` — domain model, relationships, and lifecycle
- `AUTHENTICATION.md` — auth payloads, validation, auth, claim, and purge flows
- `TOKENIZED_ASSET_CONTRACTS.md` — ITEM ↔ tokenized asset contract bridge methods
- `UTILS.md` — polling, deployment, NDEF, key, and helper utilities

## Production guides

- `TROUBLESHOOTING.md` — common failure modes and debugging workflow
- `SECURITY_AND_PRODUCTION_GUIDANCE.md` — signer placement, auth handling, and production controls
- `ENVIRONMENTS_AND_COMPATIBILITY.md` — runtime/network/setup guidance

## Examples

See `examples/` for small reference snippets that match the docs.

## Recommended reading order

### New integrators

1. `README.md`
2. `WORKFLOW_PLAYBOOKS.md`
3. `ARCHITECTURE_AND_DATA_MODEL.md`
4. `AUTHENTICATION.md`
5. generated API docs

### Production implementers

1. `WORKFLOW_PLAYBOOKS.md`
2. `SECURITY_AND_PRODUCTION_GUIDANCE.md`
3. `TROUBLESHOOTING.md`
4. `ENVIRONMENTS_AND_COMPATIBILITY.md`
5. generated API docs

### Device / smartcard-focused integrators

1. `README.md`
2. `UTILS.md`
3. relevant smartcard API docs in generated TypeDoc
4. your own transport-specific validation plan
