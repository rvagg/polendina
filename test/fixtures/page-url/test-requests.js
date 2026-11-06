/* globals describe it */

import { assert } from 'chai'

const missing = window.fetch('/expected-test-missing.js')
const failed = window.fetch('http://127.0.0.1:1/expected-test-failure.js')
  .then(() => null, (error) => error)

describe('consumer test requests', () => {
  it('handles expected HTTP and network failures during module loading', async () => {
    assert.strictEqual((await missing).status, 404)
    assert.instanceOf(await failed, TypeError)
  })
})
