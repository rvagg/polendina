/* globals describe it */

const fixture = require('./')
const { assert } = require('chai')

describe('test suite 3', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })
})
