- [x] Inspect current repository state and branch status
- [x] Fetch latest remote refs and verify `dev` exists
- [x] Checkout local `dev` and fast-forward pull from `origin/dev`
- [x] Verify final branch and working tree state

## Review
- Switched from `docs/dev-sync-docs-pr` to `dev`.
- Fetched latest refs and fast-forwarded local `dev` to `origin/dev`.
- Final branch is `dev` at commit `62961da`; working tree is clean.
- Preserved the temporary planning edit in a stash named `picoclaw-plan-todo`.


## 2026-03-23 — Packaging + dependency + docs + CI hardening
- [x] Create scoped working branch from current `dev`
- [x] Fix ESM packaging/runtime import correctness for built output
- [x] Add artifact smoke tests for ESM and CJS consumption
- [x] Triage and reduce dependency vulnerabilities where safely possible
- [x] Clarify illustrative vs runnable examples in docs and sample files
- [x] Add CI verification for packaging smoke tests and core checks
- [x] Run full local verification and capture results

## Review
- Requested by user: implement audit items 1–4 on a new branch.
- Created branch `fix/package-hardening-1-4` from current `dev`.
- Reworked package output into a proper dual-format layout:
  - ESM remains at `dist/esm/*.js`
  - CJS is emitted then renamed to `dist/cjs/*.cjs`
  - `package.json` now declares explicit `exports` for `import` vs `require`
- Added post-build normalization scripts so ESM output uses resolvable `.js`/`/index.js` specifiers and CJS output uses `.cjs`/`/index.cjs` specifiers.
- Added release smoke tests for both module formats and wired them into local scripts, CI, and publish verification.
- Upgraded direct `axios` to `1.13.6`, upgraded direct `@cityofzion/neon-core` / `@cityofzion/neon-js` to `^5.8.1`, and added an override to force `@cityofzion/props` to use `axios@1.13.6`.
- Added `docs-src/DEPENDENCY_REMEDIATION.md` to document remaining upstream/transitive audit findings and current policy.
- Clarified in README/docs/examples that placeholder ids, keys, accounts, and auth payloads are illustrative unless otherwise noted.
- Verified successfully:
  - `npm run tsc`
  - `npm run smoke`
  - `npm test`
  - `npm run docs`
  - `npm run lint`
- Verified remaining limitation:
  - `npm audit --omit=optional` still reports upstream/transitive findings (notably via `@cityofzion/neon-dappkit`, `elliptic`, and legacy tooling chains), so CI visibility is improved but a clean audit is not yet achievable without larger dependency replacement work.
