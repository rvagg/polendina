const { assert } = require('chai')

assert.strictEqual(typeof assert.ok, 'function')
console.log('assert.ok() is a function')
assert.strictEqual(WOOP, 'woop') // eslint-disable-line
console.log('WOOP is set')
