---
name: item-sdk-typescript
description: Integrate or debug ITEM TypeScript mobile NFC, secure-tunnel, GlobalPlatform, and firmware-management workflows. Use for ITEM SDK code and card workflow questions, not generic Neo N3 contract work.
---

Read [firmware-workflows.md](references/firmware-workflows.md) before choosing APIs
or proposing card operations. It distinguishes portable mobile APIs from desktop
CardReader APIs and records the firmware v3.5.4 qualification boundary.

Inspect the project's installed SDK version and import path first. Use the actual
exported signatures; do not translate Python names mechanically. Check return
values and registry metadata rather than treating public-key bytes as ring IDs or
algorithm IDs as allocated engine slots.

For a phone, keep the mobile import graph free of Node crypto, PC/SC and Python.
Use an injected platform CSPRNG and host-owned NFC transport. Separate selected
card identity, cached observations, physical presence and authenticated session.

Debug with read-only inspection first. A request to explain or review does not
authorize pairing, key generation, erasure, installation or signing. Before an
authorized mutation, establish the intended card identity and expected state.
After transport loss, stop; reconnect and inspect before proposing recovery.
Never blindly replay a state-changing APDU whose result is unknown.

Keep pairing/factory keys, private seeds and tunnel material out of logs. Report
instruction, status word, timing, response length, step and outcome certainty.
Distinguish SDK tests, emulator results and physical-card evidence. Do not claim
that the presence of a manager implements or qualifies the corresponding firmware
feature. Do not use the provisioner as the firmware source of truth; use pinned
release manifests and qualification/setup evidence.
