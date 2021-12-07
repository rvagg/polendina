// in-browser test runner for bare-sync and bare-async, at end of bundle

import { registry, executionQueue, log, setup } from './common-run.js'
import { BareRunner } from './bare.js'

setup().then(async () => {
  const runner = new BareRunner(log, registry.tests)
  const errors = await runner[registry.argv.runner === 'bare-sync' ? 'runBareSync' : 'runBareAsync']()
  executionQueue(() => globalThis.polendinaEnd(errors ? 1 : 0))
})
