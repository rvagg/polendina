// in-browser setup and runner for Tape, at end of bundle

const tape = require('tape')
const { registry, setup, executionQueue } = require('./common-run')

function runTape () {
  const { Transform } = require('stream')
  let failures = 0

  const stream = new Transform({
    transform (chunk, encoding, callback) {
      executionQueue(() => {
        global.polendinaWrite(chunk.toString())
          .catch(callback)
          .then(callback)
      })
    },

    flush (callback) {
      executionQueue(() => {
        global.polendinaEnd(failures)
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
    mod.load()
  }
}

setup().then(runTape)
