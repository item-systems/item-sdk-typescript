import test from 'node:test'
import assert from 'node:assert/strict'
import { PosixManager } from '@item-systems/item/mobile'

test('POSIX resource verbs match firmware 70/71/72 and STAT target prefix', async () => {
  const calls=[]
  const manager=new PosixManager({tunnel:async (...args)=>{
    calls.push(args)
    return args[0]===0x70 ? Uint8Array.of(2,3,0,7,0,9,0x41,0xed) : new Uint8Array()
  }})
  assert.deepEqual(await manager.stat(2,3),{type:2,id:3,uid:7,gid:9,mode:0x41ed,frozen:true})
  await manager.chmod(2,3,0o650);await manager.chown(2,3,7,9)
  assert.deepEqual(calls,[
    [0x70,2,3,new Uint8Array()],
    [0x71,2,3,Uint8Array.of(1,0xa8)],
    [0x72,2,3,Uint8Array.of(0,7,0,9)],
  ])
})
test('POSIX rejects truncated, trailing, historical and mismatched metadata', async () => {
  for(const bytes of [[],[0,7,0,9,1,0xed],[2,3,0,7,0,9,1],
      [2,3,0,7,0,9,1,0xed,0],[1,3,0,7,0,9,1,0xed],[2,4,0,7,0,9,1,0xed]]) {
    const manager=new PosixManager({tunnel:async()=>Uint8Array.from(bytes)})
    await assert.rejects(manager.stat(2,3))
  }
})
test('POSIX mutation failures and malformed acknowledgements are not retried', async () => {
  for(const method of ['chmod','chown']) {
    for(const error of [null,new Error('Disconnected')]) {
      let calls=0
      const manager=new PosixManager({tunnel:async()=>{calls++;if(error)throw error;return Uint8Array.of(0)}})
      await assert.rejects(manager[method](2,3,7,9));assert.equal(calls,1)
    }
  }
})
