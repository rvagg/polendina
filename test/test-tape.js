/* globals describe it */

import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { runCli } from './common.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

for (const type of ['cjs', 'esm']) {
  const tapeFixture = path.join(__dirname, `fixtures/tape${type === 'esm' ? '-esm' : ''}`)
  const tapeFailureFixture = path.join(__dirname, `fixtures/tape-failure${type === 'esm' ? '-esm' : ''}`)

  describe(`basic tape (${type})`, function () {
    this.timeout(60000)
    const expectedTemplate = `
TAP version 13
# test suite 1
# test case 1
ok 1 should be strictly equal
# test case 2
ok 2 all good
# test suite 2 - worker
# is WORKER
ok 3 should be strictly equal
# test suite 3
# test case 1
ok 4 should be strictly equal
# test case 2
ok 5 all good

1..5
# tests 5
# pass  5

# ok
`

    it('should run in page', async () => {
      const { stdout, stderr, code } = await runCli(tapeFixture, '--runner=tape')
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape page tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in worker', async () => {
      const { stdout, stderr, code } = await runCli(tapeFixture, '--runner=tape --worker --page=false')
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape worker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in serviceworker', async () => {
      const { stdout, stderr, code } = await runCli(tapeFixture, '--runner=tape --serviceworker --page=false')
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in page, worker and serviceworker', async () => {
      const { stdout, stderr, code } = await runCli(tapeFixture, '--runner=tape --worker --serviceworker')
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')

      let expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })
  })

  describe(`failing tape (${type})`, function () {
    this.timeout(60000)
    const expectedTemplate = `
TAP version 13
# test suite 1 - worker
# is WORKER
ok 1 should be strictly equal
# test suite 2 - failure
# test case 1
not ok 2 bork
  ---
    operator: fail
    stack: |-
      Error: bork
  ...

1..2
# tests 2
# pass  1
# fail  1
`

    it('should fail in page', async () => {
      let { stdout, code } = await runCli(tapeFailureFixture, '--runner=tape')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape page tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in worker', async () => {
      let { stdout, code } = await runCli(tapeFailureFixture, '--runner=tape --worker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in serviceworker', async () => {
      let { stdout, code } = await runCli(tapeFailureFixture, '--runner=tape --serviceworker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running tape serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in page and not run in worker', async () => {
      let { stdout, code } = await runCli(tapeFailureFixture, '--runner=tape --worker')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      let found = stdout.indexOf(expected)
      assert.ok(found > -1, 'stdout contains expected test output')
      found = stdout.indexOf(expected, found + 1)
      assert.ok(found === -1, 'stdout doesn\'t contain second instance of expected test output')
      assert.ok(stdout.includes('Running tape page tests with Puppeteer'), 'stdout contains expected output for running in page')
      assert.ok(!stdout.includes('Running tape worker tests with Puppeteer'), 'stdout doesn\'t contain expected output for running in worker')
    })
  })
}
