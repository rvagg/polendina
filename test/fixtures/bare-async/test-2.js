const assert = require('assert')
const index = require('./')

module.exports.test1 = async function () {
  console.log('testing bare fixture')
  assert.strictEqual(await index(), 'bare test fixture')
}

module.exports.test2 = async function () {
  assert.ok(true, 'yep')
}
