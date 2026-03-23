# TODO

- [x] Inspect current branch state and baseline audit findings
- [x] Identify direct and transitive dependency reductions that are safe on this branch
- [x] Implement minimal package changes to reduce audit findings further
- [x] Reinstall and verify build/test/smoke still pass
- [x] Re-run npm audit and compare before/after findings
- [ ] Commit scoped changes and push to existing branch

## Review
- Removed unused direct dependency `@cityofzion/props` and unused dev dependencies `typings`, `fs`, and `assert`.
- Pinned `mocha` from the broad `^11.7.4` range to `^11.3.0`, which reduced one additional advisory cluster without breaking tests.
- Verification passed: `npm run tsc`, `npm test`, and `npm run smoke`.
- Audit reduction: from 30 findings (including 2 critical) in the earlier audit report, and from 11 findings at current branch baseline, down to 10 findings total (`8 low`, `2 high`, `0 critical`).
- Remaining findings are upstream/runtime-chain issues centered on `neon-dappkit`/`neon-js`/`neon-core`/`elliptic` plus the remaining `mocha` advisory path.
