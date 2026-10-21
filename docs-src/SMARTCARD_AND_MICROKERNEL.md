# Smartcard and Microkernel Architecture

This guide covers interacting with ITEM smartcard hardware running JavaCard v3.x Microkernel firmware, including the secure channel protocol, APDU interfaces, in-band bytecode loading, SIO plugin governance, and resource lifecycle management.

## Overview

The SDK exports the `smartcard` namespace from the root package:

```ts
import { smartcard } from '@item-systems/item'
```

The smartcard subsystem provides:
- **Card Reader & Transports**: Transport abstraction supporting PC/SC (`PcscTransport`), WebCard, and deterministic `MockTransport` for testing and automation.
- **Secure Channel (v1)**: End-to-end encrypted session establishment (`SecureChannel`) using ECDH P-256 agreement, SHA-512 KDF, AES-256-CBC encryption (ISO 9797 Method 2 padding), and AES-CMAC message integrity.
- **In-Band CAP Bytecode Loader**: Streaming compiled JavaCard `.cap` binaries directly into on-card Flash memory over the encrypted tunnel (`InBandBytecodeLoader`).
- **SIO Plugin Management**: Complete administrative control over on-card Shareable Interface Object (SIO) plugins (`PluginManager`), managing POSIX UIDs, permission modes, 2 KB Flash storage quotas, and active NDEF provider assignment.
- **v3.5 Microkernel Resource Lifecycle**: Querying MasterKey statistics, KeyRing derivation state, reference counting invariants, and initiating graceful deprecation policies (`MasterKeySetPolicyCommand`, `KeyRingSetPolicyCommand`).

---

## Architecture and Security Model

The ITEM JavaCard v3.x firmware implements a decoupled, zero-crypto microkernel architecture.

```
                      +---------------------------------------+
                      |         Host Client / TS SDK          |
                      +---------------------------------------+
                                          |
                        APDU Tunnel (INS 0x30 / Secure Channel)
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| JavaCard Microkernel (ItemApplet - AID: FF6974656D73797302010000)                |
|                                                                                   |
|  +--------------------+  +---------------------+  +----------------------------+  |
|  |   UAC & POSIX RBAC |  | Dynamic StoragePool |  |       PluginRegistry       |  |
|  |  (Identities/UIDs) |  |   (2 KB Blocks)     |  |       (Slots 0..7)         |  |
|  +--------------------+  +---------------------+  +----------------------------+  |
|                                                              |                    |
|                        JavaCard SIO Inter-Applet Bus         |                    |
|             +-----------------------+------------------------+                    |
|             |                       |                        |                    |
|             v                       v                        v                    |
|  +---------------------+ +--------------------+ +-------------------------------+ |
|  |   CryptoRegistry    | |   EnclaveApplet    | |       KeyRingCacheApplet      | |
|  | (Standalone Engines)| | (Encrypted Storage)| | (NDEF Fast-Path Contactless)  | |
|  +---------------------+ +--------------------+ +-------------------------------+ |
+-----------------------------------------------------------------------------------+
```

### Key Invariants

1. **Zero Outer APDUs**: Once provisioned, secondary plugins and cryptographic engines reject direct unauthenticated external APDUs (`SW=0x6D00`). All management must be routed via SIO inside the encrypted tunnel (`TunnelCommand` / `INS 0x30`).
2. **POSIX Access Control**: Kernel resources (MasterKeys, KeyRings, Enclaves, Storage Blocks, Plugins) enforce standard POSIX permission masks (`rwxr-xr-x` / octal mode) against the caller's authenticated UID/GID.
3. **Reference-Counted Resource Deletion**: Deletion of MasterKeys or KeyRings is rejected (`SW_RESOURCE_IN_USE` / `0x6A18`) if dependent derived rings or active SIO acquisitions exist.
4. **Graceful Deprecation**: Resources can be flagged as deprecated (`FLAG_DEPRECATED` / `0x8000`). Deprecated keys can continue to authenticate existing sessions, but reject new key derivations (`SW_RESOURCE_DEPRECATED` / `0x6A19`).

---

## Establishing a Secure Tunnel

All administrative commands require wrapping in a `TunnelCommand` (`INS 0x30`) after establishing an encrypted session.

```ts
import { smartcard } from '@item-systems/item'

const {
  CardReader,
  PcscTransport,
  SecureChannel,
  CommandApdu,
  StatusWord,
} = smartcard

// 1. Initialize reader and transport
const transport = new PcscTransport()
const reader = new CardReader(transport)
await reader.connect()

// 2. Select Microkernel ItemApplet
const ITEM_APPLET_AID = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x02, 0x01, 0x00, 0x00])
const selectResp = await reader.sendCommand(new CommandApdu(0x00, 0xa4, 0x04, 0x00, ITEM_APPLET_AID))

if (selectResp.getSW() !== StatusWord.OK) {
  throw new Error(`Failed to select ItemApplet: SW=0x${selectResp.getSW().toString(16)}`)
}

// 3. Perform SecureChannel v1 handshake (ECDH P-256)
const channel = new SecureChannel(reader)
await channel.open()
```

---

## In-Band CAP Bytecode Streaming

Compiled JavaCard CAP files (e.g. plugins or standalone cryptographic engines) can be uploaded directly to the card Flash memory without using GlobalPlatform factory keys.

```ts
import * as fs from 'fs'
import { smartcard } from '@item-systems/item'

const { InBandBytecodeLoader } = smartcard

const loader = new InBandBytecodeLoader(reader)

// Read compiled CAP file bytes
const capBytes = fs.readFileSync('path/to/my-plugin.cap')
const packageAid = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00, 0x05])

console.log('Streaming CAP file in-band over secure tunnel...')
const cardCodeHash = await loader.streamCap(capBytes, packageAid, (bytesStreamed, totalBytes) => {
  const percent = Math.round((bytesStreamed / totalBytes) * 100)
  console.log(`Progress: ${bytesStreamed}/${totalBytes} bytes (${percent}%)`)
})

console.log(`Verified on-card bytecode SHA-256: ${Buffer.from(cardCodeHash).toString('hex')}`)
```

### How It Works

1. **`INS_PACKAGE_BEGIN` (`0x55`)**: Sends total file length and Package AID; microkernel allocates a streaming session slot.
2. **`INS_PACKAGE_STREAM` (`0x56`)**: Streams CAP chunks (default 220 bytes) into transient Flash buffers.
3. **`INS_PACKAGE_COMMIT` (`0x57`)**: Finalizes streaming, computes SHA-256 hash ($H_{code}$), validates package header integrity, and returns the verified 32-byte digest.

---

## SIO Plugin Management

Once an applet package is loaded and instantiated, use `PluginManager` to govern its lifecycle in the `PluginRegistry`.

```ts
import { smartcard } from '@item-systems/item'

const { PluginManager } = smartcard

const pluginManager = new PluginManager(reader)

// 1. Register a new plugin
const PLUGIN_AID = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00, 0x05, 0x01])
const assignedUid = 10
const assignedGid = 1
const posixMode = 0x01ed // 0755: rwxr-xr-x
const quotaBlocks = 15   // 15 * 2 KB = 30 KB Flash memory quota

const slotId = await pluginManager.register(PLUGIN_AID, assignedUid, assignedGid, posixMode, quotaBlocks)
console.log(`Plugin registered successfully into Slot ${slotId}`)

// 2. Query plugin metadata
const info = await pluginManager.query(slotId)
if (info) {
  console.log(`Slot ${info.slotId}: UID=${info.uid}, GID=${info.gid}, Quota=${info.quotaBlocks * 2} KB`)
  console.log(`Bytecode Hash: ${Buffer.from(info.codeHash).toString('hex')}`)
}

// 3. Update POSIX permissions or storage quota
await pluginManager.update(slotId, 0x01c0 /* 0700 */, 20 /* 40 KB */)

// 4. Delegate active NDEF emulation provider (if plugin supports NDEF frontend)
await pluginManager.setActiveNdefProvider(slotId)

// 5. Unregister / delete plugin
await pluginManager.delete(slotId)
```

---

## Microkernel Lifecycle & Resource Management

Inspect and govern cryptographic master keys, derived key rings, reference counts, and deprecation policies.

```ts
import { smartcard } from '@item-systems/item'

const {
  MasterKeyStatsCommand,
  MasterKeyStatsResponse,
  MasterKeySetPolicyCommand,
  MasterKeyDeleteCommand,
  KeyRingSetPolicyCommand,
  KeyRingDeleteCommand,
  MicrokernelResourceFlags,
  TunnelCommand,
  StatusWord,
} = smartcard

// Helper to execute commands through tunnel
async function sendTunneled(cmd: smartcard.CommandApdu) {
  const tunnel = new TunnelCommand(cmd.toArray())
  const resp = await reader.sendCommand(tunnel)
  return new smartcard.ResponseAPDU(resp.getData())
}

// 1. Inspect MasterKey stats & reference counts
const statsResp = await sendTunneled(new MasterKeyStatsCommand())
const parsedStats = new MasterKeyStatsResponse(statsResp.toArray())

for (const key of parsedStats.getKeys()) {
  console.log(`MasterKey Slot ${key.slotId}:`)
  console.log(`  Reference Count : ${key.refCount} (active derived rings / anchors)`)
  console.log(`  Flags           : 0x${key.flags.toString(16)} (Deprecated: ${key.isDeprecated})`)
  console.log(`  Is Tunnel Anchor: ${key.isTunnelAnchor}`)
}

// 2. Deprecate a MasterKey (prevents new derivations, retains existing sessions)
const masterSlot = 0
await sendTunneled(new MasterKeySetPolicyCommand(masterSlot, MicrokernelResourceFlags.FLAG_DEPRECATED))
console.log(`MasterKey ${masterSlot} marked as DEPRECATED.`)

// 3. Attempting deletion while refCount > 0
const deleteResp = await sendTunneled(new MasterKeyDeleteCommand(masterSlot))
if (deleteResp.getSW() === StatusWord.RESOURCE_IN_USE) {
  console.warn(`Cannot delete MasterKey ${masterSlot}: Resource still in use by derived KeyRings.`)
}

// 4. Deprecate a specific KeyRing
const ringId = 1
await sendTunneled(new KeyRingSetPolicyCommand(ringId, MicrokernelResourceFlags.FLAG_DEPRECATED))
```

---

## Status Word Matrix (v3.5 Microkernel)

| Status Word | Constant | Description |
|:---|:---|:---|
| `0x9000` | `StatusWord.OK` | Command succeeded. |
| `0x6A18` | `StatusWord.RESOURCE_IN_USE` | Cannot delete resource: `refCount > 0`. |
| `0x6A19` | `StatusWord.RESOURCE_DEPRECATED` | Key is deprecated; derivations/operations disallowed. |
| `0x6985` | `StatusWord.CONDITIONS_NOT_SATISFIED` | Preconditions failed (e.g. attempting to delete active tunnel anchor). |
| `0x6986` | `StatusWord.COMMAND_NOT_ALLOWED` | Command forbidden by security policy or lifecycle state. |
| `0x6987` | `StatusWord.POSIX_PERMISSION_DENIED` | Caller UID/GID lacks required POSIX permission bits (`rwx`). |
| `0x6988` | `StatusWord.CAPABILITY_REQUIRED` | Caller identity lacks required UAC capability bitmask. |
| `0x6D00` | `StatusWord.INS_NOT_SUPPORTED` | Outer APDU rejected (Zero-Outer-APDU policy enforced). |
| `0x6A84` | `StatusWord.STORAGE_EXHAUSTED` | StoragePool or quota exceeded. |

---

## Related Documentation

- [API Overview](API_OVERVIEW.md)
- [Workflow Playbooks](WORKFLOW_PLAYBOOKS.md)
- [Security and Production Integration Guidance](SECURITY_AND_PRODUCTION_GUIDANCE.md)
