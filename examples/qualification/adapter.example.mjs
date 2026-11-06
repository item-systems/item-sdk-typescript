// This is a contract, NOT a provisioner. Copy and implement using your reviewed
// local card harness. Never run a destructive default against an arbitrary card.
export async function run() {
  throw new Error('Supply a reviewed package-specific hardware adapter before qualification')
  // 1. Acquire reader lock; verify explicitly allowed test UID on SAME connection.
  // 2. Restore the exact baseline in configuration.baseline (verify CAP digests).
  // 3. recorder.beginRun(await readPublicMemorySnapshot())
  //    Use null if diagnostics are unavailable before kernel installation.
  // 4. await recorder.step('install', async () => { await installExactCap(cap) })
  // 5. recorder.sample(await readPublicMemorySnapshot())
  // 6. Register/initialize and perform every required functional step. Assertions
  //    must throw; merely receiving an APDU response is not a functional check.
  // 7. Sample after initialization and representative operations; endRun().
  //    Preserve failing steps by ending the run in your error handler, then stop.
  // Release lock/close reader in finally. Do NOT emit keys, PINs or raw APDUs.
}
