/* globals describe it WorkerGlobalScope ServiceWorkerGlobalScope */

const assert = require('assert')

describe('test suite 2 - worker', () => {
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
