# Dependency Remediation Status

This note summarizes the current dependency-risk posture after the packaging hardening pass.

## Immediate reductions implemented

- Upgraded direct `axios` to `1.13.6`.
- Upgraded direct `@cityofzion/neon-core` to `^5.8.1`.
- Upgraded direct `@cityofzion/neon-js` to `^5.8.1`.
- Added an npm `overrides` rule to force `@cityofzion/props` to use `axios@1.13.6` instead of its vulnerable nested `^0.27.2` range.

## Remaining findings

Some `npm audit` findings remain because they are inherited from upstream packages that do not yet publish fully remediated dependency trees, including:

- `@cityofzion/neon-dappkit`
- `crypto-browserify`
- `elliptic`
- older transitive tooling dependencies pulled by legacy packages

## Current policy recommendation

- Treat direct dependency vulnerabilities as fix-now unless blocked by compatibility.
- Treat remaining transitive findings as upstream-tracked risk until replacement or upstream releases are available.
- Keep `npm audit --omit=optional` in CI so regressions are visible.
- Revisit `@cityofzion/neon-dappkit` replacement or upgrade strategy in a dedicated follow-up if stricter supply-chain posture is required.
