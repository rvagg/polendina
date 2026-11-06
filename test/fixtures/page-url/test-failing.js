/* globals describe it */

import { assert } from 'chai'

describe('consumer page failures', () => {
  it('counts the first failure', () => {
    assert.fail('first consumer failure')
  })

  it('counts the second failure', () => {
    assert.fail('second consumer failure')
  })
})
