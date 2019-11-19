/* global describe it */

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

describe('test suite 2 - worker', () => {
  if (typeof importScripts === 'function') {
    it('is in worker', () => {
      assert.strictEqual(typeof WorkerGlobalScope, 'function')
    })
  } else {
    it('is not in worker', () => {
      assert.strictEqual(typeof WorkerGlobalScope, 'undefined')
    })
  }
})

describe('test suite 3', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })
})
