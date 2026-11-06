/* globals describe it */

import { assert } from 'chai'

describe('consumer page', () => {
  it('loads native modules, styles and URL state in the supplied page', () => {
    const app = document.querySelector('#app')
    assert.strictEqual(globalThis.window, globalThis)
    assert.strictEqual(app.textContent, 'native ESM loaded café ?view=page #consumer')
    assert.strictEqual(window.location.search, '?view=page')
    assert.strictEqual(window.location.hash, '#consumer')
    assert.deepStrictEqual(window.pageState, {
      greeting: 'native ESM loaded café',
      query: '?view=page',
      hash: '#consumer'
    })
    assert.strictEqual(window.getComputedStyle(app).color, 'rgb(12, 34, 56)')

    document.querySelector('#increment').click()
    assert.strictEqual(app.dataset.count, '1')
  })
})
