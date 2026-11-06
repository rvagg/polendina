/* globals describe it */

describe('consumer page errors', () => {
  it('surfaces asynchronous application errors', async () => {
    await window.triggerAsyncPageError()
  })
})
