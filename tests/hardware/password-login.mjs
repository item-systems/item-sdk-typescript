/** Opt-in, destructive public-fixture qualification; never use on a wallet.
 * Requires an explicitly UID-pinned freshly installed diagnostic card.
 * bootstrap enrolls public test credentials but does not retire UID0 until
 * native PAKE has succeeded. Each subsequent action is explicit, not a retry.
 */
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { ItemSecureTunnel } from '../../dist/esm/smartcard/mobile/tunnel.js'
import { InitializationManager } from '../../dist/esm/smartcard/mobile/initialization.js'
import { UacManager, MasterKeyManager, KeyRingManager, PosixManager, MicrokernelClient, CryptoRegistryClient } from '../../dist/esm/smartcard/mobile/managers.js'
import { enrollPassword } from '../../dist/esm/smartcard/mobile/password.js'
import { createTransport } from './omni-transport.mjs'
import { p256 } from '@noble/curves/nist.js'

assert.ok(['044D2AB2971490','04384D82971490','04384C82971490','04384E82971490'].includes(process.env.ITEM_TEST_UID),
  'Only an explicitly authorized diagnostic UID; the bridge checks the exact selection')
const action=process.argv[2]
assert.ok(['bootstrap','inspect','login','retire','retired-inspect','negative','locked','wallet','wallet-existing'].includes(action))
const logfile=process.env.ITEM_TEST_LOG
assert.ok(logfile, 'Set ITEM_TEST_LOG to retain qualification evidence')
function log(event,fields={}) {
  const line=JSON.stringify({time:new Date().toISOString(),event,action,...fields})
  console.log(line);appendFileSync(logfile,line+'\n')
}
const random=n=>new Uint8Array(randomBytes(n))
const transport=createTransport({passwordQualification:true})
const transmit=transport.transmit.bind(transport)
let sequence=0
transport.transmit=async bytes=>{
  const start=performance.now()
  const metadata={sequence:++sequence,header:Buffer.from(bytes.slice(0,4)).toString('hex'),requestBytes:bytes.length}
  log('apdu_start',metadata)
  try {
    const reply=await transmit(bytes)
    log('apdu',{...metadata,sw:Buffer.from(reply.slice(-2)).toString('hex'),
      responseBytes:reply.length-2,ms:Math.round(performance.now()-start)})
    if(process.env.ITEM_TEST_FAILURE_DIAGNOSTICS==='1' && action==='bootstrap'
        && bytes[1]===0x25 && bytes[2]===1
        && Buffer.from(reply.slice(-2)).toString('hex')==='6982') {
      // Explicit lab-only admin inspection BEFORE the SDK's required disconnect
      // clears RAM traces. The original PIN failure is still returned unchanged.
      // Never retry PIN or expose this diagnostic session as a successful login.
      await captureFailureDiagnostics()
    }
    return reply
  } catch(error) {
    // Never print payloads, keys or exception text potentially containing APDUs.
    log('apdu_transport_failure',{...metadata,ms:Math.round(performance.now()-start),
      outcome:'unknown; stop and inspect, do not replay'})
    throw error
  }
}
const tunnel=new ItemSecureTunnel(transport,random)
const uac=new UacManager(tunnel), init=new InitializationManager(tunnel)
// Public diagnostic fixtures only, intentionally not printed in evidence logs.
const password='123456', pairing=Uint8Array.from({length:32},(_,i)=>i)
async function captureFailureDiagnostics() {
  const expected=tunnel.info?.uid
  const diagnostic=new ItemSecureTunnel({
    connect:async()=>true, disconnect:async()=>{},
    transmit:async bytes=>{
      const start=performance.now(),reply=await transmit(bytes)
      log('diagnostic_admin_apdu',{header:Buffer.from(bytes.slice(0,4)).toString('hex'),
        requestBytes:bytes.length,responseBytes:reply.length-2,
        sw:Buffer.from(reply.slice(-2)).toString('hex'),ms:Math.round(performance.now()-start)})
      return reply
    },
  },random)
  try {
    assert.equal((await diagnostic.connect()).uid,expected)
    await diagnostic.open(pairing)
    assert.equal((await new UacManager(diagnostic).current()).uid,0)
    const data=await diagnostic.tunnel(0x16)
    assert.equal(data.length,23);assert.equal(data[14],0x4b);assert.equal(data[15],1)
    log('password_failure_trace',{operation:data[16],stage:data[17],exceptionKind:data[18],
      reason:(data[19]<<8)|data[20],transactionDepth:data[21],outcome:data[22]})
    log('memory_at_failure',{info:await new MicrokernelClient(diagnostic).getMemoryDiagnostics()})
  }catch(error){log('diagnostic_inspection_failed',{errorType:error.name})}
  finally{await diagnostic.close()}
}
async function login(target=1,member=target,secret=password) {
  const start=performance.now()
  await tunnel.openWithPassword({identityId:target,credentialIdentityId:member,password:secret})
  assert.equal(tunnel.authenticatedIdentityId,target)
  assert.equal(tunnel.authenticatedCredentialIdentityId,member)
  const current=await uac.current();assert.equal(current.uid,target)
  log('passed',{test:'password_login',target,member,capabilities:current.capabilities,ms:Math.round(performance.now()-start)})
  return current
}
try {
  log('start',{uid:process.env.ITEM_TEST_UID,reader:'Identiv uTrust 3700 F CL Reader'})
  if(action==='inspect') {
    await tunnel.connect();await tunnel.open(pairing)
    log('initialization',{info:(await init.query()).info})
    for(const uid of [1,7,8,9,12]) log('identity',{info:await uac.query(uid)})
    log('memory',{info:await new MicrokernelClient(tunnel).getMemoryDiagnostics()})
    const registry=new CryptoRegistryClient(tunnel)
    for(const slot of [0,1,2]) log('engine',{info:await registry.querySlot(slot)})
    // Public GET only; no PAKE BEGIN, confirmation or retry-budget mutation.
    const parameters=await transport.transmit(Uint8Array.of(0xa0,0x25,0,0,6,1,0,1,0,1,0))
    assert.equal(Buffer.from(parameters.slice(-2)).toString('hex'),'9000')
    assert.equal(parameters.length,21)
    log('password_budget',{uid:1,limit:parameters[17],remaining:parameters[18]})
  } else if(action==='bootstrap') {
    const info=await tunnel.connect();assert.equal(info.paired,false,'Already paired; do not replay enrollment')
    await tunnel.pair(pairing);await tunnel.open(pairing)
    assert.equal((await uac.current()).uid,0)
    await init.configureCardAuthentication({mode:'none'})
    for(const [uid,caps,limit] of [[1,65535,10],[7,65535,5],[8,0,3],[12,0,3]]) {
      await uac.create(uid,caps)
      assert.equal(await enrollPassword(tunnel,uid,password,info.uid,random,limit),0)
      log('enrolled',{uid,limit})
    }
    await uac.create(9,0);assert.equal(await uac.addCredential(9,4,Uint8Array.of(0,7)),0)
    log('passed',{test:'public_fixture_enrollment'})
    log('memory_before_password_provider',{info:await new MicrokernelClient(tunnel).getMemoryDiagnostics()})
    await login()
  } else if(action==='login') {
    for(let i=0;i<3;i++){await login();await tunnel.close()}
    const group=await login(9,7);assert.equal(group.capabilities,0)
    await assert.rejects(uac.create(10,65535),/6986/)
    log('passed',{test:'group_does_not_inherit_member_admin_capabilities'})
  } else if(action==='retire' || action==='retired-inspect') {
    if(action==='retire') {
      await login();await init.retireBootstrap();assert.equal(tunnel.isOpen,false)
    }
    await login();assert.equal((await init.query()).info.phase,'retired')
    log('passed',{test:'password_login_after_bootstrap_retirement'})
    assert.equal(await uac.query(0),null)
    log('memory_after_retirement',{info:await new MicrokernelClient(tunnel).getMemoryDiagnostics()})
  } else if(action==='negative') {
    await assert.rejects(login(8,8,'654321'),/6982/)
    assert.equal(tunnel.isOpen,false);await tunnel.close()
    await login(8);await tunnel.close()
    for(let i=0;i<3;i++){
      await assert.rejects(login(12,12,'654321'),/6982/)
      assert.equal(tunnel.isOpen,false);await tunnel.close()
    }
    await assert.rejects(login(12),/locked|6983/i)
    log('passed',{test:'wrong_password_budget_survives_reconnect_and_locks'})
    await assert.rejects(login(9,8),/6982/)
    await login()
    log('passed',{test:'nonmember_rejected_admin_unaffected'})
  } else if(action==='locked') {
    await tunnel.connect()
    const parameters=await transport.transmit(Uint8Array.of(0xa0,0x25,0,0,6,1,0,12,0,12,0))
    assert.equal(Buffer.from(parameters.slice(-2)).toString('hex'),'9000')
    assert.equal(parameters.length,21);assert.equal(parameters[18],0,'Requires exhausted public fixture')
    // Bypass only the HOST's budget precheck to prove the card itself denies
    // BEGIN after reconnect. This public point carries no password or key.
    const point=p256.getPublicKey(Uint8Array.from({length:32},(_,i)=>i===31?1:0),false)
    const reply=await transport.transmit(Uint8Array.of(0xa0,0x25,1,0,71,1,0,12,0,12,0,...point))
    assert.equal(Buffer.from(reply).toString('hex'),'6983')
    log('passed',{test:'card_enforces_PIN_lockout_without_SDK_precheck'})
  } else if(action==='wallet' || action==='wallet-existing') {
    await login()
    const masters=new MasterKeyManager(tunnel), rings=new KeyRingManager(tunnel), posix=new PosixManager(tunnel)
    let publicKey
    if(action==='wallet') {
      assert.equal((await masters.getStats()).length,0,'Wallet stage is not replayable')
      const master=await masters.generate()
      publicKey=await rings.derive(master,new Uint8Array(),0)
    } else {
      assert.equal((await masters.getStats()).length,1,'Expected prior acknowledged diagnostic master')
      const resource=await posix.stat(2,0)
      assert.equal(resource.uid,1);assert.equal(resource.mode,0o700)
      publicKey=await rings.exportPublicKey(0)
      log('passed',{test:'existing_diagnostic_ring_inspected_no_key_generation_replayed'})
    }
    assert.equal(publicKey.length,65)
    assert.deepEqual(await rings.exportPublicKey(0),publicKey)
    await posix.chown(2,0,1,9);await posix.chmod(2,0,0o650)
    assert.deepEqual(await posix.stat(2,0),{type:2,id:0,uid:1,gid:9,mode:0o650,frozen:false})
    await login(9,7)
    const digest=createHash('sha256').update('ITEM password group qualification').digest()
    assert.equal(p256.verify(await rings.sign(0,digest),digest,publicKey,{lowS:false}),true)
    log('passed',{test:'group_POSIX_sign_real_P256_signature'})
    await login(8)
    await assert.rejects(rings.sign(0,digest),/6982|6986/)
    log('passed',{test:'nonmember_POSIX_sign_denied'})
  }
  log('complete')
}catch(error){log('failed',{errorType:error.name,
  message:error.name==='AssertionError' ? 'Qualification assertion failed; stopped without replay' : error.message,
  location:error.stack?.match(/password-login\.mjs:\d+:\d+/)?.[0]});process.exitCode=1}
finally{await tunnel.close()}
