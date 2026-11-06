# Local qualification and offline release assembly

`QualificationRecorder`, `qualificationArtifact`, and `qualificationSnapshot`
are exported from `@item-systems/item/qualification`. They have no filesystem, PC/SC,
network, or provisioning side effects. Use them around an existing reviewed
qualification harness. Supply public counter snapshots from that harness; SDK builds
with memory diagnostics can also pass those responses directly. The standalone
entry point does not depend on a mobile transport or diagnostics implementation.

## Workflow

1. Build a CAP once and retain those bytes. Calculate identity with
   `qualificationArtifact(packageAid, capBytes)`; archive checksum, not ZIP size,
   identifies the qualified build. Source commit is provenance, not a substitute.
2. Fix context before testing: install parameters, card/JCRE, reader/transport,
   full baseline CAP AIDs + SHA-256 + sizes + exact install parameters, required
   functional step names. Keep workload and runtime setup fixed across samples;
   changes in cache fill, plugin quotas, identities or keys require a distinct
   configuration ID and new evidence even when CAPs and install parameters match.
3. For each identical-baseline run, `beginRun(snapshotOrNull)`, wrap operations in
   `await recorder.step(name, callback)`, sample memory, then `endRun()`.
   Callbacks must throw on failed functional assertions. Errors are not retried;
   error strings and returned values are never copied into reports.
4. Serialize `recorder.report()`. Missing required steps or any failure prevents
   a successful report and suppresses its memory profile. Export public metadata
   only; no card UID, PIN, pairing key, factory keys, seed, or APDU payloads.
5. CI validates the report against the exact built CAP and reviewed context,
   recomputes the derived profile, merges it into registry metadata and attaches
   the full report to the GitHub Release. No card is needed in Actions.

The reusable CLI/adapter contract is in `examples/qualification`. The CLI needs
`--allow-card-mutation`, refuses output overwrite, and requires a supplied adapter.
It does not provide a generic wipe/install implementation. An adapter must verify
the allowed test UID, serialize reader access, restore the pinned baseline on
every repetition, and perform real package-specific assertions. Adapter failures
mark the run aborted and retain a redacted failed report. Setup errors before the
adapter runs may leave an empty reserved output; never treat it as evidence.
Keep detailed failed-run diagnostics privately and start a new file for a retry.

The CLI context file has `schemaVersion: 1`, `packageAid`, `configuration`, and
`requiredSteps`. The CI reviewed context uses the same file (packageAid is checked
against release metadata). It must be populated with real measurements' context;
repository scaffolds deliberately leave `configuration: null` until configured.

## Semantics and limitations

Sampled free-memory deltas are NOT allocation high-water marks. The generated
`memoryProfile` always uses `method: estimated`; it must not authorize an
"expected to fit" claim. Unknown metrics remain omitted. Transaction peaks,
largest allocation, and native-CAP attribution cannot be inferred from these
snapshots. Missing any baseline/sample value suppresses that metric across runs.
Transient pools are reported separately, never added as available memory.

Each step has host-observed `durationMs` (including transport). Keep individual
runs, reader, and transport context; do not use these as firmware deadlines or
USB-to-phone NFC timing guarantees. Timing stays in the release report, not an
invented registry field. An instrumented peak-measurement report format can be
added later without silently upgrading these estimates.

Profiles are context-specific; the registry v1 memory profile does not encode the
entire dependency baseline. Keep the full report as evidence; a consumer must not
assume measurements transfer to other baseline versions/configurations. CI exact
CAP checks may reject a rebuild with different ZIP bytes even if executable
components match. Do not rewrite the report digest to work around this: promote
the tested artifact or repeat qualification.

No report is allowed: CI publishes explicit unknown requirements. A present but
invalid, failed, stale, or wrong-context report fails assembly. Review evidence
before merging: this is provenance and validation, not independent attestation.
