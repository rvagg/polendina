/* globals describe it */

import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { runCli } from './common.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))
const webpackMergeFixture = path.join(__dirname, 'fixtures/webpack-merge')

describe('basic webpack-merge', function () {
  this.timeout(60000)
  it('should run with a custom config', async () => {
    const expected = `
assert.ok() is a function
WOOP is set
  ✔ test.js
`
    const { stdout, code } = await runCli(webpackMergeFixture, '--runner=bare-sync --webpack-config webpack.config.js')
    assert.strictEqual(code, 0, 'exited with zero exit code')
    if (!stdout.includes(expected)) {
      console.error(stdout)
    }
    assert.ok(stdout.includes(expected), 'stdout contains expected test output')
    assert.ok(stdout.includes('Running bare-sync page tests with Puppeteer'), 'stdout contains expected output for running in page')
  })

  it('should fail without a custom config', async () => {
    const expectedStdout = `
assert.ok() is a function
  ✘ test.js
`
    const expectedStderr = 'WOOP is not defined'

    const { stdout, stderr, code } = await runCli(webpackMergeFixture, '--runner=bare-sync')
    assert.strictEqual(code, 1, 'exited with zero exit code')
    assert.ok(stdout.includes(expectedStdout), 'stdout contains expected test output')
    assert.ok(stderr.includes(expectedStderr), 'stderr contains expected test output')
    assert.ok(stdout.includes('Running bare-sync page tests with Puppeteer'), 'stdout contains expected output for running in page')
  })
})
