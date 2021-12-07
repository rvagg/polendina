/* globals WorkerGlobalScope ServiceWorkerGlobalScope */

import tape from 'tape'
import fixture from './index.js'

tape('test suite 1', (t) => {
  t.test('test case 1', (t) => {
    t.strictEqual(fixture, 'polendina test')
    t.end()
  })

  t.test('test case 2', (t) => {
    t.ok(true, 'all good')
    t.end()
  })
})

tape('test suite 2 - worker', (t) => {
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

tape('test suite 3', (t) => {
  t.test('test case 1', (t) => {
    t.strictEqual(fixture, 'polendina test')
    t.end()
  })

  t.test('test case 2', (t) => {
    t.ok(true, 'all good')
    t.end()
  })
})
