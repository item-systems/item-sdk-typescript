const mod = require('../dist/cjs/index.cjs')

if (!mod.Item) {
  throw new Error('Expected CJS build to export Item')
}

if (!mod.constants || !mod.constants.NeoN3NetworkOptions) {
  throw new Error('Expected CJS build to export constants.NeoN3NetworkOptions')
}

console.log('CJS smoke test passed')
