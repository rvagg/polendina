/* globals describe it WorkerGlobalScope ServiceWorkerGlobalScope */

const fixture = require('./')
const assert = require('assert')

describe('test suite 1', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })
})
