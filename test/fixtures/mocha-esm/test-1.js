/* globals describe it */

import fixture from './index.js'
import { assert } from 'chai'

describe('test suite 1', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })
})
