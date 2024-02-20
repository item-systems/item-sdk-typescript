import { NeonInvoker } from "@cityofzion/neon-invoker";
import { NeonParser } from "@cityofzion/neon-parser";
import { Quests, constants } from "../../dist/esm";
// @ts-ignore
import Neon from "@cityofzion/neon-core";
import { assert } from "chai";
import { AccountQuestPermissions } from "../../dist/esm/types";
import { NodePermissions } from "../../dist/esm/types/quests";

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Stateless Quests', function () {
  this.timeout(60000)

  const node = constants.NetworkOption.MainNet
  const quests = new Quests({
    node
  })


  it('should get the total users', async() => {
    const res = await quests.totalAccounts()
    assert.isAbove(res, 0)

    const questJSON = await quests.getQuestJSON({
      questId: 1
    })
    console.log(questJSON)
  })


  it('should get the total quests', async() => {
    const res = await quests.totalQuests()
    assert.isAtLeast(res, 0)
  })

  it('should get the total nodes', async() => {
    const res = await quests.totalNodes()
    assert.isAbove(res, 0)
  })

  it('should get the total edges', async() => {
    const res = await quests.totalEdges()
    assert.isAtLeast(res, 0)
  })

  it('should get a user', async() => {
    const res = await quests.getUserJSON({
      address: 'NbqrwJjunsTWkAJNz55saYSuYxDwCGgmVD'
    })
    console.log(res)
    assert.exists(res.account_id)
    assert.exists(res.permissions)

    assert.exists((res.permissions as AccountQuestPermissions).contract_upgrade)
    assert.exists((res.permissions as AccountQuestPermissions).set_permissions)
    assert.exists((res.permissions as AccountQuestPermissions).create_quest)
  })

  it('should get a node', async() => {
    const res = await quests.getNodeJSON({
      nodeId: 1
    })
    assert.equal(res.nodeId, 1)
    assert.equal(res.label, 'origin')
    assert.isAtLeast(res.edges.length, 0)
    assert.equal(res.permissions, NodePermissions.PUBLIC)
  })

})
