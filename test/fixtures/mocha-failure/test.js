/* globals describe it WorkerGlobalScope ServiceWorkerGlobalScope */
const { assert } = require('chai')

describe('test suite 1 - worker', () => {
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && global instanceof ServiceWorkerGlobalScope) {
    it('is in serviceworker', () => {
      assert.strictEqual(typeof ServiceWorkerGlobalScope, 'function')
    })
  } else if (typeof WorkerGlobalScope !== 'undefined' && global instanceof WorkerGlobalScope) {
    it('is in worker', () => {
      assert.strictEqual(typeof WorkerGlobalScope, 'function')
    })
  } else {
    it('is not in worker', () => {
      assert.strictEqual(typeof WorkerGlobalScope, 'undefined')
    })
  }
})

describe('test suite 2 - failing', () => {
  it('should fail', () => {
    throw new Error('failing test')
  })
})
