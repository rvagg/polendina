/* globals describe it */

// setup.js installs polendina from a packed tarball into consumers outside
// this repository; check that layout is the hoisted one a real install has
// and that each consumer carries only its own runner

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { consumers } from './common.js'

const present = (dir, ...segments) => fs.promises.access(path.join(dir, ...segments))
const absent = (dir, ...segments) => assert.rejects(present(dir, ...segments))

describe('packed install', function () {
  it('hoists polendina dependencies into every consumer tree', async () => {
    for (const dir of Object.values(consumers())) {
      await absent(dir, 'node_modules/polendina/node_modules/stream-browserify')
      await present(dir, 'node_modules/stream-browserify')
    }
  })

  it('installs each runner only in its own consumer', async () => {
    const { mocha, mocha11, tape, bare } = consumers()
    await present(mocha, 'node_modules/mocha')
    await present(mocha11, 'node_modules/mocha')
    await present(tape, 'node_modules/tape')
    await absent(mocha, 'node_modules/tape')
    await absent(tape, 'node_modules/mocha')
    await absent(bare, 'node_modules/mocha')
    await absent(bare, 'node_modules/tape')
  })

  it('installs the previous mocha major in its consumer', async () => {
    const { mocha, mocha11 } = consumers()
    const major = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'node_modules/mocha/package.json'))).version.split('.')[0]
    assert.strictEqual(major(mocha11), '11')
    assert.notStrictEqual(major(mocha), '11')
  })

  it('does not install mocha or tape in polendina itself', async () => {
    for (const dir of Object.values(consumers())) {
      await absent(dir, 'node_modules/polendina/node_modules/mocha')
      await absent(dir, 'node_modules/polendina/node_modules/tape')
    }
  })
})
