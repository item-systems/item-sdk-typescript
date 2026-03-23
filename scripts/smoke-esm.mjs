const mod = await import(new URL('../dist/esm/index.js', import.meta.url))

if (!mod.Item) {
  throw new Error('Expected ESM build to export Item')
}

if (!mod.constants?.NeoN3NetworkOptions) {
  throw new Error('Expected ESM build to export constants.NeoN3NetworkOptions')
}

console.log('ESM smoke test passed')
