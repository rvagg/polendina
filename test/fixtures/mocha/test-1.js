/* globals describe it */

const fixture = require('./')
const { assert } = require('chai')

describe('test suite 1', () => {
  it('test case 1', () => {
    assert.strictEqual(fixture, 'polendina test')
  })

  it('test case 2', () => {
    assert.ok(true, 'all good')
  })

  it('test case 3', () => {
    assert.strictEqual(require('!!raw-loader!./fixture.txt').default, 'raw fixture') // eslint-disable-line import/no-webpack-loader-syntax
  })
})
