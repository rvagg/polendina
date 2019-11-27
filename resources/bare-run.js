// in-browser test runner for bare-sync and bare-async, at end of bundle

const { registry, executionQueue, log, setup } = require('./common-run')
const BareRunner = require('./bare')

setup().then(async () => {
  const runner = new BareRunner(log, registry.tests)
  const errors = await runner[registry.argv.runner === 'bare-sync' ? 'runBareSync' : 'runBareAsync']()
  executionQueue(() => global.polendinaEnd(errors ? 1 : 0))
})
