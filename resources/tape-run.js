// in-browser setup and runner for Tape, at end of bundle

import tape from 'tape'
import { registry, setup, executionQueue } from './common-run.js'
import { Transform } from 'stream'

async function runTape () {
  let failures = 0

  const stream = new Transform({
    transform (chunk, encoding, callback) {
      executionQueue(() => {
        globalThis.polendinaWrite(chunk.toString())
          .catch(callback)
          .then(callback)
      })
    },

    flush (callback) {
      executionQueue(() => {
        globalThis.polendinaEnd(failures)
          .catch(callback)
          .then(callback)
      })
    }
  })

  tape.getHarness({ stream })

  tape.getHarness().onFailure((...args) => {
    failures = 1
  })

  for (const mod of registry.tests) {
    await mod.load()
  }
}

setup().then(runTape)
