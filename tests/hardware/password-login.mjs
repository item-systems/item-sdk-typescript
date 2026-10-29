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

assert.ok(['044D2AB2971490','04384D82971490'].includes(process.env.ITEM_TEST_UID),
  'Only an explicitly authorized diagnostic UID; the bridge checks the exact selection')
const action=process.argv[2]
assert.ok(['bootstrap','inspect','login','retire','negative','wallet'].includes(action))
const logfile=process.env.ITEM_TEST_LOG
assert.ok(logfile, 'Set ITEM_TEST_LOG to retain qualification evidence')
function log(event,fields={}) {
  const line=JSON.stringify({time:new Date().toISOString(),event,action,...fields})
  console.log(line);appendFileSync(logfile,line+'\n')
}
const random=n=>new Uint8Array(randomBytes(n))
const transport=createTransport({passwordQualification:true})
const transmit=transport.transmit.bind(transport)
transport.transmit=async bytes=>{
  const start=performance.now(), reply=await transmit(bytes)
  log('apdu',{header:Buffer.from(bytes.slice(0,4)).toString('hex'),
    sw:Buffer.from(reply.slice(-2)).toString('hex'),responseBytes:reply.length-2,ms:Math.round(performance.now()-start)})
  return reply
}
const tunnel=new ItemSecureTunnel(transport,random)
const uac=new UacManager(tunnel), init=new InitializationManager(tunnel)
// Public diagnostic fixtures only, intentionally not printed in evidence logs.
const password='123456', pairing=Uint8Array.from({length:32},(_,i)=>i)
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
    await login()
  } else if(action==='login') {
    for(let i=0;i<3;i++){await login();await tunnel.close()}
    const group=await login(9,7);assert.equal(group.capabilities,0)
    await assert.rejects(uac.create(10,65535),/6986/)
    log('passed',{test:'group_does_not_inherit_member_admin_capabilities'})
  } else if(action==='retire') {
    await login();await init.retireBootstrap();assert.equal(tunnel.isOpen,false)
    await login();assert.equal((await init.query()).info.phase,'retired')
    log('passed',{test:'password_login_after_bootstrap_retirement'})
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
  } else if(action==='wallet') {
    await login()
    const masters=new MasterKeyManager(tunnel), rings=new KeyRingManager(tunnel), posix=new PosixManager(tunnel)
    assert.equal((await masters.getStats()).length,0,'Wallet stage is not replayable')
    const master=await masters.generate()
    const publicKey=await rings.derive(master,new Uint8Array(),0)
    assert.equal(publicKey.length,65)
    assert.deepEqual(await rings.exportPublicKey(0),publicKey)
    await posix.chown(2,0,1,9);await posix.chmod(2,0,0o650)
    await login(9,7)
    const digest=createHash('sha256').update('ITEM password group qualification').digest()
    assert.equal(p256.verify(await rings.sign(0,digest),digest,publicKey,{lowS:false}),true)
    log('passed',{test:'group_POSIX_sign_real_P256_signature'})
    await login(8)
    await assert.rejects(rings.sign(0,digest),/6982|6986/)
    log('passed',{test:'nonmember_POSIX_sign_denied'})
  }
  log('complete')
}catch(error){log('failed',{message:error.message});process.exitCode=1}
finally{await tunnel.close()}
