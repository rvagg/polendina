import { assert } from 'chai'
import index from '../index.js'

console.log('testing bare fixture subdir')
assert.strictEqual(index, 'bare test fixture')
assert.ok(true, 'yep')
