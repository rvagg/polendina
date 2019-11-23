/* globals WorkerGlobalScope ServiceWorkerGlobalScope */

const tape = require('tape')

tape('test suite 1 - worker', (t) => {
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && global instanceof ServiceWorkerGlobalScope) {
    t.test('is in serviceworker', (t) => {
      t.strictEqual(typeof ServiceWorkerGlobalScope, 'function')
      t.end()
    })
  } else if (typeof WorkerGlobalScope !== 'undefined' && global instanceof WorkerGlobalScope) {
    t.test('is in worker', (t) => {
      t.strictEqual(typeof WorkerGlobalScope, 'function')
      t.end()
    })
  } else {
    t.test('is not in worker', (t) => {
      t.strictEqual(typeof WorkerGlobalScope, 'undefined')
      t.end()
    })
  }
})

tape('test suite 2 - failure', (t) => {
  t.test('test case 1', (t) => {
    t.fail('bork')
    t.end()
  })
})
