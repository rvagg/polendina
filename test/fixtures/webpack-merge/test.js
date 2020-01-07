const assert = require('assert')
const qs = require('querystring')

assert.strictEqual(typeof assert.ok, 'function')
console.log('assert.ok() is a function')
assert.strictEqual(typeof qs.parse, 'function')
console.log('querystring.parse() is a function')
