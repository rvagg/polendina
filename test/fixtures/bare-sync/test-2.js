
const { assert } = require('chai')
const index = require('./')

console.log('testing bare fixture')
assert.strictEqual(index, 'bare test fixture')
assert.ok(true, 'yep')
