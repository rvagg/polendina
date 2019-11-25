const assert = require('assert')
const index = require('.')

console.log('testing bare fixture')
assert.strictEqual(index, 'bare test fixture')
assert.fail('nope', 'faily mcfailface')
