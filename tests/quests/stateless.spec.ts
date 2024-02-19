import { NeonInvoker } from "@cityofzion/neon-invoker";
import { NeonParser } from "@cityofzion/neon-parser";
import { Quest } from "../../dist/esm";
// @ts-ignore
import Neon from "@cityofzion/neon-core";
import { assert } from "chai";
import { AccountQuestPermissions } from "../../dist/esm/types";
import { NodePermissions } from "../../dist/esm/types/quests";

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Stateless Quests', function () {
  this.timeout(60000)

  const scriptHash = Quest.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Quest({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  it('should get the total users', async() => {
    const quests = await getSDK()
    const res = await quests.totalAccounts()
    assert.isAbove(res, 0)
  })

  it('should get the total quests', async() => {
    const quests = await getSDK()
    const res = await quests.totalQuests()
    assert.isAtLeast(res, 0)
  })

  it('should get the total nodes', async() => {
    const quests = await getSDK()
    const res = await quests.totalNodes()
    assert.isAbove(res, 0)
  })

  it('should get the total edges', async() => {
    const quests = await getSDK()
    const res = await quests.totalEdges()
    assert.isAtLeast(res, 0)
  })

  it('should get a user', async() => {
    const quests = await getSDK()
    const res = await quests.getUserJSON({
      address: 'NbqrwJjunsTWkAJNz55saYSuYxDwCGgmVD'
    })
    assert.exists(res.account_id)
    assert.exists(res.permissions)

    assert.exists((res.permissions as AccountQuestPermissions).contract_upgrade)
    assert.exists((res.permissions as AccountQuestPermissions).set_permissions)
    assert.exists((res.permissions as AccountQuestPermissions).create_quest)
  })

  it('should get a node', async() => {
    const quests = await getSDK()
    const res = await quests.getNodeJSON({
      nodeId: 1
    })
    assert.equal(res.nodeId, 1)
    assert.equal(res.label, 'origin')
    assert.isAtLeast(res.edges.length, 0)
    assert.equal(res.permissions, NodePermissions.PUBLIC)
  })
})
