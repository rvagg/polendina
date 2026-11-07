/* globals describe it */

import { assert } from 'chai'

describe('consumer directory page', () => {
  it('redirects before resolving relative assets and preserves URL state', async () => {
    assert.strictEqual(window.location.pathname, '/site/relative/')
    assert.strictEqual(window.location.search, '?view=page&encoded=%2F+%26')
    assert.strictEqual(window.location.hash, '#consumer')
    const app = document.querySelector('#app')
    assert.strictEqual(app.textContent, 'native ESM loaded café ?view=page&encoded=%2F+%26 #consumer')
    assert.strictEqual(window.getComputedStyle(app).color, 'rgb(12, 34, 56)')
    window.location.hash = 'changed'
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.strictEqual(window.location.hash, '#changed')
  })
})
