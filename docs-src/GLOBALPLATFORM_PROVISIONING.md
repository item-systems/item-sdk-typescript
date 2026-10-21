# GlobalPlatform Card Manager & Silicon Provisioning Guide

This guide describes how to provision, flash, and manage JavaCard secure elements (such as NXP J3R180 JCOP4 SmartMX3) using the `item-sdk-typescript` GlobalPlatform subsystem (`smartcard.globalplatform`).

---

## 1. Overview & Architecture

JavaCard secure element lifecycle consists of two primary operational phases:

1. **Phase 1: Silicon Bootstrap & GlobalPlatform Flashing**
   - Direct communication with the **Card Manager / Issuer Security Domain (ISD)** using GlobalPlatform Card Specification v2.2/v2.3.
   - Mutual authentication via **SCP02** (Triple-DES / Retail MAC) or **SCP03** (AES-128/256 / AES-CMAC).
   - Clean wiping of old packages (`DELETE`).
   - Loading compiled CAP binaries in chunked segments (`INSTALL [for load]` -> `LOAD`).
   - Instantiating applets and configuring initial parameters (`INSTALL [for install & make selectable]`).

2. **Phase 2: In-Band Microkernel Administration**
   - Establishing an E2E encrypted **Secure Tunnel** (`smartcard.securechannel.v1`) to the ITEM Microkernel (`ItemApplet`).
   - In-band plugin registration, dynamic SIO cryptographic engine binding, and MasterKey/KeyRing derivation.

```
+-----------------------------------------------------------------------------------+
|                        GlobalPlatform Silicon Provisioner                         |
|                     (smartcard.globalplatform.provisioner)                        |
+-----------------------------------------------------------------------------------+
                                          |
                        +-----------------------------------+
                        |     GlobalPlatformCardManager     |
                        |      (SELECT, DELETE, LOAD, INST) |
                        +-----------------------------------+
                                          |
                        +-----------------------------------+
                        |     SCP02 / SCP03 Secure Session  |
                        |     (Mutual Auth, C-MAC, C-DEC)   |
                        +-----------------------------------+
                                          |
                      CardReader & Transport Layer (PCSC / WebCard / Mock)
```

---

## 2. GlobalPlatform API Surface

All GlobalPlatform modules are exported under the `smartcard.globalplatform` namespace:

```typescript
import { smartcard } from '@item-systems/item'

const {
  GlobalPlatformCardManager,
  GlobalPlatformProvisioner,
  GpSecurityLevel,
  DEFAULT_ISD_AID,
  Scp02Session,
  Scp03Session,
} = smartcard.globalplatform
```

### Key Set Configuration

```typescript
import { hexToUint8 } from '@item-systems/item/smartcard/utils'

// Default factory test key set (404142...4F)
const keySet = {
  version: 0x01,
  encKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
  macKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
  dekKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
}
```

---

## 3. High-Level Provisioning Example (11-CAP Topology)

```typescript
import fs from 'node:fs'
import { smartcard } from '@item-systems/item'

async function flashSilicon(reader: smartcard.CardReader) {
  await reader.connect()

  const provisioner = new smartcard.globalplatform.GlobalPlatformProvisioner(reader)

  const topology: smartcard.globalplatform.CapTopologyEntry[] = [
    {
      name: '01_item-api',
      packageAid: 'FF6974656D7379730300FF',
      capBytes: fs.readFileSync('./build/item-api.cap'),
      isLibrary: true,
    },
    {
      name: '02_item-javacard',
      packageAid: 'FF6974656D737973030000',
      capBytes: fs.readFileSync('./build/item-javacard.cap'),
      appletAid: 'FF6974656D73797303000000',
      instanceAid: 'FF6974656D73797303000000',
      privileges: '00',
      installParams: '0108100800', // 1 MasterKey slot, 8 KeyRings, 16 StorageBlocks
    },
    {
      name: '03_cryptoregistry',
      packageAid: 'FF6974656D737973030003',
      capBytes: fs.readFileSync('./build/item-plugin-cryptoregistry.cap'),
      appletAid: 'FF6974656D73797303000301',
      instanceAid: 'FF6974656D73797303000301',
    },
    {
      name: '04_engine-secp256r1',
      packageAid: 'FF6974656D737973040002',
      capBytes: fs.readFileSync('./build/item-engine-secp256r1.cap'),
      appletAid: 'FF6974656D73797304000201',
      instanceAid: 'FF6974656D73797304000201',
    },
  ]

  await provisioner.provisionTopology(topology, {
    keySet: {
      version: 0x01,
      encKey: smartcard.hexToUint8(process.env.NFI_FACTORY_ENC_KEY!),
      macKey: smartcard.hexToUint8(process.env.NFI_FACTORY_MAC_KEY!),
      dekKey: smartcard.hexToUint8(process.env.NFI_FACTORY_DEK_KEY!),
    },
    cleanWipeExisting: true,
    existingAidsToDelete: [
      'FF6974656D737973030000', // item-javacard
      'FF6974656D7379730300FF', // item-api
    ],
    onProgress: (step, current, total) => {
      console.log(`[${current}/${total}] ${step}`)
    },
  })

  console.log('Silicon flashed successfully.')
}
```

---

## 4. Low-Level Card Manager Operations

```typescript
const cardManager = new smartcard.globalplatform.GlobalPlatformCardManager(reader)

// 1. Select Issuer Security Domain (Card Manager)
await cardManager.selectCardManager()

// 2. Open Secure Channel (SCP02) with mutual authentication
const session = await cardManager.openSecureChannelScp02(keySet)

// 3. Delete existing package
await cardManager.delete('FF6974656D737973030000', true)

// 4. Load compiled CAP binary
const capBytes = fs.readFileSync('item-javacard.cap')
await cardManager.loadCap(capBytes, 'FF6974656D737973030000')

// 5. Instantiate and make selectable
await cardManager.installAndMakeSelectable(
  'FF6974656D737973030000',
  'FF6974656D73797303000000',
  'FF6974656D73797303000000',
  '00',
  '0108100800'
)
```
