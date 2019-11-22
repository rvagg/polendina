const tape = require('tape')
const fixture = require('./')

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
  if (typeof importScripts === 'function') {
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
