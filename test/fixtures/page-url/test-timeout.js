/* globals describe it */

describe('consumer page timeout', () => {
  it('waits for the consumer page', async () => {
    await window.holdPageTestOpen()
  })
})
