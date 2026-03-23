# item-sdk-typescript audit

Date: 2026-03-23
Branch audited: `dev`
Auditor: picoclaw

## Executive summary

The repository is in a partially healthy state: it installs cleanly, TypeScript builds successfully, and the currently executed test subset passes. However, the effective quality signal is weaker than it first appears. The default test command only exercised 4 smartcard-oriented tests, while the larger integration suites are environment-dependent/manual and did not run as part of the standard audit pass. The package also ships with a meaningful dependency risk footprint (`30` known vulnerabilities including `2 critical`) and a few API/type-quality issues that should be addressed before treating the SDK as production-hardened.

Overall assessment: **usable, but not yet strongly release-hardened**.

## What was verified

### Branch / repo state
- Switched to `dev`
- Tracking branch: `origin/dev`
- Working tree was clean after checkout

### Build / validation
- `npm install` ✅
- `npm run tsc` ✅
- `npm test` ✅, but only **4 tests actually executed**
- `npm run lint -- --no-fix` ✅

### Source layout observed
- Main entrypoint: `src/Item.ts`
- API wrappers: `src/api/neoN3/*`
- Helpers/utilities: `src/helpers/*`
- Smartcard support: `src/smartcard/*`
- Tests present under `tests/`, but not all are suitable for default CI execution

## Findings

### 1. Test coverage signal is misleading
**Severity:** High

**Evidence**
- `npm test` reported only:
  - `4 passing`
- Yet the repo contains 7 spec files:
  - `tests/manufacturing.spec.ts`
  - `tests/operations.spec.ts`
  - `tests/permissions.spec.ts`
  - plus 4 smartcard specs
- `tests/permissions.spec.ts` is effectively empty
- `tests/manufacturing.spec.ts` and `tests/operations.spec.ts` are environment-coupled integration/manual flows using `.env`, live nodes, admin keys, NEF paths, and real contract operations

**Impact**
A green default test run does not mean the SDK’s main contract-facing workflows are comprehensively validated. It mostly proves a small smartcard subset works.

**Recommendation**
- Split tests into explicit categories:
  - `unit`
  - `integration`
  - `manual` or `e2e-live`
- Make default `npm test` run deterministic CI-safe coverage only
- Add at least a mocked/unit layer for major `Item` methods and response parsing paths
- Either remove placeholder specs or convert them into skipped tests with clear rationale

### 2. Dependency security posture is weak
**Severity:** High

**Evidence**
- `npm install` / `npm audit` reported `30 vulnerabilities`:
  - `9 low`
  - `7 moderate`
  - `12 high`
  - `2 critical`
- Notable direct/transitive exposure includes:
  - `axios` advisory range includes installed `1.12.2`
  - `@cityofzion/props`
  - `@cityofzion/neon-core`
  - `@cityofzion/neon-dappkit`
  - legacy toolchain packages pulled via `typings` and older transitive deps

**Impact**
This increases supply-chain and runtime risk, especially for a package handling authentication, smartcard flows, and blockchain interactions.

**Recommendation**
- Run a dependency refresh pass focused on direct deps first
- Re-evaluate whether `typings`, `fs`, and `assert` package dependencies are still needed in modern Node/TS
- Produce a curated remediation matrix: fixable now, blocked upstream, accepted risk
- Add automated dependency scanning in CI if not already present

### 3. Public API typing quality is inconsistent
**Severity:** Medium

**Evidence**
Several public methods return overly broad or likely incorrect types:
- `getItemProperties(...): Promise<any[]>`
- `getEpochProperties(...): Promise<any[]>`
- `getConfigurationProperties(...): Promise<any[]>`
- `tokenProperties(...): Promise<any>`
- `tokenPropertiesWithNfid(...): Promise<any>`
- `isAuthValid(...): Promise<EpochType>` even though the docstring says it returns a boolean-like auth result
- `setConfigurationPropertySync(...): Promise<number>` while docstring says boolean

**Impact**
Consumers get weaker editor support and less trustworthy contracts. Some methods may be semantically mis-typed, which can cause downstream misuse.

**Recommendation**
- Define concrete response interfaces for property maps and auth validation results
- Reconcile method signatures with actual parser output and docs
- Add type-level tests or compile-time usage fixtures for the exported API

### 4. Main class is doing too much orchestration/parsing inline
**Severity:** Medium

**Evidence**
`src/Item.ts` is a large, multi-responsibility façade handling:
- transport/invoker setup
- contract invocation assembly
- response parsing
- byte/hex/base64 normalization
- iterator traversal orchestration
- cross-contract IS1 workflows

There is repeated parsing logic for item retrieval methods:
- `getItem`
- `getItemWithKey`
- `getItemWithTac`

**Impact**
This raises maintenance cost and increases the chance of inconsistent behavior across similar methods.

**Recommendation**
- Extract shared response normalization helpers for item/epoch/asset parsing
- Consider separating read/query services from write/transaction services
- Keep `Item` as façade, but move repeated transformation logic into dedicated parsers

### 5. Default test runtime uses debugger/experimental loader flags
**Severity:** Low

**Evidence**
`.mocharc.json` includes:
- `inspect`
- `loader=ts-node/esm`
- `experimental-specifier-resolution=node`

Test output showed:
- debugger listener startup
- experimental loader warning
- deprecation warnings

**Impact**
This is noisy for CI and local contributors, and may create friction or instability across Node versions.

**Recommendation**
- Remove `inspect` from default test config
- Prefer a stable ts-node/mocha setup or precompiled test execution
- Keep debug-specific flags behind a separate script

### 6. Documentation is minimal relative to SDK surface
**Severity:** Low

**Evidence**
`README.md` is very short and mostly points to external docs. It does not describe:
- supported environments
- auth model expectations
- smartcard transport expectations
- test categories and required env vars
- release/build expectations for consumers

**Impact**
This makes onboarding and contribution harder, especially when local tests depend on live infrastructure.

**Recommendation**
Add a contributor/developer section covering:
- install/build/test commands
- env requirements for live tests
- package output structure (`dist/esm`, `dist/cjs`)
- major API groupings and intended usage patterns

## Positive notes
- Package build output is correctly generated to both ESM and CJS targets
- `files` whitelist is constrained to `dist/`
- Source organization is understandable
- Smartcard unit tests provide at least some deterministic coverage
- The façade API is straightforward for consumers at the top level

## Recommended next steps

### Priority 1
1. Fix test strategy so default green means something reliable
2. Triage and reduce dependency vulnerabilities
3. Correct public type mismatches (`isAuthValid`, property getters, sync return types)

### Priority 2
4. Refactor repeated parsing logic out of `Item.ts`
5. Improve README/contributor guidance
6. Clean test runner config to remove debugger-by-default behavior

## Command evidence
- `git checkout dev && git status --short --branch && git branch --show-current && git rev-parse --abbrev-ref --symbolic-full-name @{u}`
- `npm install`
- `npm run tsc`
- `npm test`
- `npm run lint -- --no-fix`
- `npm audit --json`
