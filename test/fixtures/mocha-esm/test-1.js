/* globals describe it */

import fixture from './index.js'
import raw from '!!raw-loader!./fixture.txt' // eslint-disable-line import/no-webpack-loader-syntax
import { assert } from 'chai'

describe('test suite 1', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })

  it('test case 3', () => {
    assert.strictEqual(raw, 'raw fixture\n')
  })
})
