import test from 'node:test'
import assert from 'node:assert/strict'
import { scryptSync, randomBytes, createHash, createHmac, hkdfSync } from 'node:crypto'
import { secp256k1 as p256, hashToCurve } from '@noble/curves/secp256k1.js'
import { cbc } from '@noble/ciphers/aes'
import * as sdk from '@item-systems/item/mobile'
import * as passwordCore from '../../dist/esm/smartcard/mobile/password.js'
const { passwordSubject } = passwordCore
class Spake2Client extends passwordCore.Spake2Client {
  constructor(w,random) { super(w,random,2) }
}
const passwordScalar=(...args)=>passwordCore.passwordScalar(...args,2)
const passwordParameters=bytes=>passwordCore.passwordParameters(bytes,2)
const enrollPassword=(t,id,p,uid,r)=>passwordCore.enrollPassword(t,id,p,uid,r,5,2)
import { hex, unhex } from '../../dist/esm/smartcard/mobile/bytes.js'

test('K1 password profile matches independent OpenSSL scrypt, binds card and member, normalizes Unicode only', async () => {
  const uid = 'ab'.repeat(16), salt = new Uint8Array(16).fill(3)
  const expected = scryptSync('café', Buffer.concat([Buffer.from('ITEM_PASSWORD_K1_V1'),salt,Buffer.from(uid,'hex'),Buffer.from([0,7])]),
    40,{N:32768,r:8,p:1,maxmem:40*1024*1024})
  const n=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
  const value=BigInt('0x'+expected.toString('hex'))%n
  const actual=await passwordScalar('cafe\u0301',salt,uid,7)
  assert.equal(hex(actual),value.toString(16).padStart(64,'0'))
  assert.notEqual(hex(actual),hex(await passwordScalar('café',salt,uid,8)))
  assert.notEqual(hex(actual),hex(await passwordScalar('café',salt,'cd'.repeat(16),7)))
  await assert.rejects(passwordScalar('123',salt,uid,7),/4–256/)
  await assert.rejects(passwordScalar('abcd\uD800',salt,uid,7),/text/)
})

test('K1 invalid RNG, malformed points, UID0 and malformed retry metadata fail closed', () => {
  const w=new Uint8Array(32);w[31]=3
  assert.throws(()=>new Spake2Client(w,()=>new Uint8Array(31)))
  assert.throws(()=>new Spake2Client(w,()=>new Uint8Array(32)))
  const c=new Spake2Client(w,()=>{const x=new Uint8Array(32);x[31]=7;return x})
  assert.throws(()=>c.finish(new Uint8Array(65),new Uint8Array(),new Uint8Array(),new Uint8Array()))
  assert.throws(()=>passwordSubject({identityId:0,password:'123456'}))
  assert.throws(()=>passwordParameters(new Uint8Array(19)))
  const p=new Uint8Array(19);p[0]=1;p[17]=5;p[18]=6
  assert.throws(()=>passwordParameters(p))
})

test('K1 enrollment sends one versioned credential and erases the password-equivalent buffer', async () => {
  let retained,calls=0
  const tunnel={async tunnel(ins,p1,p2,data){calls++;assert.equal(ins,0x84);assert.equal(p2,7);retained=data;assert.equal(data.length,51);assert.equal(data[0],5);assert.equal(data[1],2);return Uint8Array.of(2)}}
  assert.equal(await enrollPassword(tunnel,7,'123456','ab'.repeat(16),n=>new Uint8Array(n).fill(4)),2)
  assert.equal(calls,1)
  assert.ok(retained.every(b=>b===0))
})

// Independent server transcript/HKDF/HMAC via Node/OpenSSL. Only public curve
// operations share Noble. No SDK protocol helper is used to produce peer proofs.
function passwordPeer(options={}) {
  const uid='ab'.repeat(16), salt=new Uint8Array(16).fill(3), limit=3
  const M=p256.ProjectivePoint.fromHex('04ee43df9dc974e2d3e0918943141fd984fbee3b8c25c5583c058774d10200e82049f0bc76a7c2429b95872752a9e3cec23c0204d2fa30450eac7e798216e3b17c')
  const N=p256.ProjectivePoint.fromHex('04b122e318f0b0aef72254960bc7377b36654d6b15ad8f35deccc38c19ef3e1b34e95ec204e5986646e2a712ec5abbe1291fcf89d2d990d091573dbe4e95fa12fd')
  const stretched=scryptSync('123456',Buffer.concat([Buffer.from('ITEM_PASSWORD_K1_V1'),salt,Buffer.from(uid,'hex'),Buffer.from([0,7])]),
    40,{N:32768,r:8,p:1,maxmem:40*1024*1024})
  const w=BigInt('0x'+stretched.toString('hex'))%p256.CURVE.n
  const wb=Buffer.from(w.toString(16).padStart(64,'0'),'hex')
  const lv=b=>{const n=Buffer.alloc(8);n.writeUInt32LE(b.length);return Buffer.concat([n,b])}
  const calls=[], conn={connected:false}, confirmed=[]
  let keys, ca, cb, iv, target, authenticated=false, attempts=0
  const transport={
    async connect(){conn.connected=true;return true},
    async disconnect(){conn.connected=false;authenticated=false},
    async transmit(request) {
      calls.push([request[1],request[2]])
      const ok=data=>sdk.concat(data,sdk.unhex('9000'))
      if(request[1]===0xa4){
        const tlv=(t,b)=>sdk.concat(Uint8Array.of(t,b.length),b)
        const body=sdk.concat(tlv(1,Uint8Array.of(0)),tlv(0xa3,sdk.unhex(uid)),
          tlv(0xa4,p256.getPublicKey(new Uint8Array(32).fill(1),false)),tlv(0xa5,Uint8Array.of(2)),
          tlv(0xa6,Uint8Array.of(3,5,0)),tlv(0xa7,Uint8Array.of(2)),tlv(0xa8,Uint8Array.of(1,1,5,4)),
          tlv(0xa9,Uint8Array.of(2,2,0,0)))
        return ok(sdk.concat(Uint8Array.of(0xa1,body.length),body))
      }
      if(request[1]===0x25){
        if(request[2]===3)return ok(Uint8Array.of(options.badVersion?2:1,0,options.otherMechanism?99:2,0,65,0,65))
        if(request[2]===0)return ok(sdk.concat(Uint8Array.of(2),salt,Uint8Array.of(limit,options.locked?0:limit-attempts)))
        if(request[2]===1){
          attempts++
          if(options.lostBegin)throw new Error('RF lost after attempt reserved')
          const subject=request.slice(5,11);target=subject[2]
          const pa=request.slice(11),y=37n
          const pb=p256.ProjectivePoint.BASE.multiply(y).add(N.multiply(w)).toRawBytes(false)
          const k=p256.ProjectivePoint.fromHex(pa).subtract(M.multiply(w)).multiply(y).toRawBytes(false)
          const tt=Buffer.concat([lv(Buffer.concat([Buffer.from('ITEM_PASSWORD_K1_V1'),subject])),lv(Buffer.from(uid,'hex')),lv(pa),lv(pb),lv(k),lv(wb)])
          const digest=createHash('sha256').update(tt).digest()
          const ck=Buffer.from(hkdfSync('sha256',digest.subarray(16),Buffer.alloc(0),
            Buffer.concat([Buffer.from('ConfirmationKeys'),Buffer.from([1,5,4,2]),salt,Buffer.from([limit])]),32))
          ca=createHmac('sha256',ck.subarray(0,16)).update(tt).digest()
          cb=createHmac('sha256',ck.subarray(16)).update(tt).digest()
          keys=Buffer.from(hkdfSync('sha256',digest.subarray(0,16),digest,Buffer.from('ITEM_PASSWORD_TUNNEL_K1_V1'),96))
          iv=keys.subarray(64,80)
          return ok(options.malformedPoint?new Uint8Array(65):pb)
        }
        if(!sdk.equal(request.slice(5),ca))return sdk.unhex('6982')
        if(options.lostFinal)throw new Error('RF lost after final confirmation')
        confirmed.push(request.slice(5));authenticated=true
        if(options.badConfirmation)cb[0]^=1
        return ok(cb)
      }
      assert.equal(request[1],0x30);assert.ok(authenticated)
      const ct=request.slice(21),tag=sdk.cbcMac(keys.subarray(32,64),sdk.concat(request.slice(0,5),new Uint8Array(11),ct))
      assert.deepEqual(request.slice(5,21),tag)
      const plain=sdk.unpad(cbc(keys.subarray(0,32),iv,{disablePadding:true}).decrypt(ct))
      assert.equal(plain[1],0x81)
      const result=Uint8Array.of(0,options.wrongReceipt?8:target,0,1,1,1,1)
      const enc=cbc(keys.subarray(0,32),tag,{disablePadding:true}).encrypt(sdk.pad(sdk.concat(result,sdk.unhex('9000'))))
      iv=sdk.cbcMac(keys.subarray(32,64),sdk.concat(Uint8Array.of(enc.length+16),new Uint8Array(15),enc))
      return ok(sdk.concat(iv,enc))
    }
  }
  return {tunnel:new sdk.ItemSecureTunnel(transport,n=>new Uint8Array(randomBytes(n))),calls,conn,confirmed}
}
for(const target of [7,9])test('K1 single password login authenticates selected identity/group '+target,async()=>{
  const p=passwordPeer()
  await p.tunnel.openWithPassword({identityId:target,credentialIdentityId:7,password:'123456'})
  assert.equal(p.tunnel.isOpen,true);assert.equal(p.tunnel.authenticatedIdentityId,target)
  assert.equal(p.tunnel.authenticatedCredentialIdentityId,7);assert.equal(p.tunnel.cardAuthenticationStatus,'password')
  assert.deepEqual(p.calls,[[0xa4,4],[0x25,3],[0x25,0],[0x25,1],[0x25,2],[0x30,0]])
})
for(const option of ['locked','lostBegin','lostFinal','malformedPoint','badConfirmation','wrongReceipt','badVersion','otherMechanism'])
  test('K1 password '+option+' never retries or falls back',async()=>{
    const p=passwordPeer({[option]:true})
    await assert.rejects(p.tunnel.openWithPassword({identityId:7,password:'123456'}))
    assert.equal(p.tunnel.isOpen,false);assert.equal(p.tunnel.authenticatedIdentityId,null)
    assert.equal(p.conn.connected,false);assert.ok(p.calls.filter(([ins,step])=>ins===0x25&&step===1).length<=1)
    assert.ok(p.calls.every(([ins])=>ins!==0x20&&ins!==0x11))
    if(option==='badVersion'||option==='otherMechanism')assert.ok(p.calls.every(([ins,step])=>ins!==0x25||step===3))
  })
test('K1 wrong password fails before identity publication',async()=>{
  const p=passwordPeer()
  await assert.rejects(p.tunnel.openWithPassword({identityId:7,password:'654321'}))
  assert.equal(p.tunnel.isOpen,false);assert.equal(p.confirmed.length,0)
})

test('K1 masking points reproduce RFC 9380 OID-seed generation and isolate suites',async()=>{
 const M=hashToCurve(new TextEncoder().encode('M SPAKE2 seed OID 1.3.132.0.10'))
 const N=hashToCurve(new TextEncoder().encode('N SPAKE2 seed OID 1.3.132.0.10'))
 assert.equal(M.toHex(false),'04ee43df9dc974e2d3e0918943141fd984fbee3b8c25c5583c058774d10200e82049f0bc76a7c2429b95872752a9e3cec23c0204d2fa30450eac7e798216e3b17c')
 assert.equal(N.toHex(false),'04b122e318f0b0aef72254960bc7377b36654d6b15ad8f35deccc38c19ef3e1b34e95ec204e5986646e2a712ec5abbe1291fcf89d2d990d091573dbe4e95fa12fd')
 assert.ok(!M.equals(N));M.assertValidity();N.assertValidity()
 const salt=new Uint8Array(16),uid='ab'.repeat(16)
 assert.notDeepEqual(await passwordScalar('123456',salt,uid,7),await passwordCore.passwordScalar('123456',salt,uid,7))
 assert.throws(()=>passwordParameters(Uint8Array.of(1,...salt,5,5)),/parameters/)
 assert.throws(()=>passwordCore.passwordParameters(Uint8Array.of(2,...salt,5,5)),/parameters/)
 assert.throws(()=>new passwordCore.Spake2Client(new Uint8Array(32),()=>new Uint8Array(32),99),/Unsupported/)
})
