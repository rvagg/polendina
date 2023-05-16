const { assert } = require('chai')
const index = require('../')

module.exports.test1 = async function () {
  console.log('testing bare fixture subdir')
  assert.strictEqual(await index(), 'bare test fixture')
}

module.exports.test2 = async function () {
  assert.ok(true, 'yep')
}
