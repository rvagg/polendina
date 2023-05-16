import { assert } from 'chai'
import index from '../index.js'

export async function test1 () {
  console.log('testing bare fixture subdir')
  assert.strictEqual(await index(), 'bare test fixture')
}

export async function test2 () {
  assert.ok(true, 'yep')
}
