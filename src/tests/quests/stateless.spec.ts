import { Quests, constants, Utils, Item } from '../../'
// @ts-ignore
import { assert } from 'chai'
import { NodePermissions, AccountQuestPermissions } from '../../types'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Stateless Quests', function () {
  this.timeout(60000)

  const node = constants.NetworkOption.MainNet
  const quests = new Quests({
    node,
  })

  it('should get the total users', async () => {
    const res = await quests.totalAccounts()
    assert.isAbove(res, 0)

    const questJSON = await quests.getQuestJSON({
      questId: 1,
    })
    console.log(questJSON)
  })

  it('should get the total quests', async () => {
    const res = await quests.totalQuests()
    assert.isAtLeast(res, 0)
  })

  it('should get the total nodes', async () => {
    const res = await quests.totalNodes()
    assert.isAbove(res, 0)
  })

  it('should get the total edges', async () => {
    const res = await quests.totalEdges()
    assert.isAtLeast(res, 0)
  })

  it('should get a user', async () => {
    const res = await quests.getUserJSON({
      address: 'NbqrwJjunsTWkAJNz55saYSuYxDwCGgmVD',
    })
    console.log(res)
    assert.exists(res.account_id)
    assert.exists(res.permissions)

    assert.exists((res.permissions as AccountQuestPermissions).contract_upgrade)
    assert.exists((res.permissions as AccountQuestPermissions).set_permissions)
    assert.exists((res.permissions as AccountQuestPermissions).create_quest)
  })

  it('should get a node', async () => {
    const res = await quests.getNodeJSON({
      nodeId: 1,
    })
    assert.equal(res.nodeId, 1)
    assert.equal(res.label, 'origin')
    assert.isAtLeast(res.edges.length, 0)
    assert.equal(res.permissions, NodePermissions.PUBLIC)
  })

  it('Should get an edge', async () => {
    const quest = await quests.getQuestJSON({
      questId: 3,
    })

    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0],
    })
    console.log(edge)
  })

  it('should get a token', async () => {
    const item = new Item()
    const start = 1763
    const end = 1775
    for (let i = start; i <= end; i++) {
      const tok = await item.getItemJSON({
        tokenId: i,
      })
      console.log(tok)
    }
  })

  it('should parse NDEF', async () => {
    const x = [
      'https://itm.st/ap/1cf8?d=BLunI5N43pi9RSvcMNy9oLCvK3jxlvn0vZVYjLvMks69bHtGVvR7iJnxV3THfDOOukezb1i030ZgiW_6_DuAu5wAAAAADDBFAiEAufWXO62OCkbmQmyb6JNMq1LPQCnwffHwsfV0fSw1PZMCIBAsShpwtgt1aiLAhbcUMi8GdKKuXJHQRjLNTy3ZRm8p',
    ]
    x.forEach(y => {
      console.log(Utils.decodeNDEF(y))
    })
  })
})
