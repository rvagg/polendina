/* globals describe it */

import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { runCli } from './common.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

for (const type of ['cjs', 'esm']) {
  const bareSyncFixture = path.join(__dirname, `fixtures/bare-sync${type === 'esm' ? '-esm' : ''}`)
  const bareSyncFailureFixture = path.join(__dirname, `fixtures/bare-sync-failure${type === 'esm' ? '-esm' : ''}`)

  describe(`basic bare-sync (${type})`, function () {
    this.timeout(20000)
    const expectedTemplate = `
testing is WORKER
  ✔ test-1.js
testing bare fixture
  ✔ test-2.js
`

    it('should run in page', async () => {
      const { stdout, code } = await runCli(bareSyncFixture, '--runner=bare-sync')
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync page tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in worker', async () => {
      const { stdout, code } = await runCli(bareSyncFixture, '--runner=bare-sync --worker --page=false')
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync worker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in serviceworker', async () => {
      const { stdout, code } = await runCli(bareSyncFixture, '--runner=bare-sync --serviceworker --page=false')
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in page, worker and serviceworker', async () => {
      const { stdout, code } = await runCli(bareSyncFixture, '--runner=bare-sync --worker --serviceworker')
      assert.strictEqual(code, 0, 'exited with zero exit code')

      let expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync serviceworker tests with Puppeteer'), 'stdout contains expected output for running in page')
    })
  })

  describe(`failing bare-sync (${type})`, function () {
    this.timeout(20000)
    const expectedTemplate = `
testing is WORKER
  ✔ test-1.js
testing bare fixture
  ✘ test-2.js
`
    const expectedStderr = 'AssertionError: faily mcfailface'

    it('should fail in page', async () => {
      let { stdout, stderr, code } = await runCli(bareSyncFailureFixture, '--runner=bare-sync')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync page tests with Puppeteer'), 'stdout contains expected output for running in worker')
      assert.ok(stderr.includes(expectedStderr), 'stderr contains expected output')
    })

    it('should fail in worker', async () => {
      let { stdout, stderr, code } = await runCli(bareSyncFailureFixture, '--runner=bare-sync --worker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
      assert.ok(stderr.includes(expectedStderr), 'stderr contains expected output')
    })

    it('should fail in serviceworker', async () => {
      let { stdout, stderr, code } = await runCli(bareSyncFailureFixture, '--runner=bare-sync --serviceworker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running bare-sync serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
      assert.ok(stderr.includes(expectedStderr), 'stderr contains expected output')
    })

    it('should fail in page and not run in worker', async () => {
      let { stdout, stderr, code } = await runCli(bareSyncFailureFixture, '--runner=bare-sync --worker')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = stdout.replace(/^ +at .*\n/gm, '') // stack traces
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      let found = stdout.indexOf(expected)
      assert.ok(found > -1, 'stdout contains expected test output')
      found = stdout.indexOf(expected, found + 1)
      assert.ok(found === -1, 'stdout doesn\'t contain second instance of expected test output')
      assert.ok(stdout.includes('Running bare-sync page tests with Puppeteer'), 'stdout contains expected output for running in page')
      assert.ok(!stdout.includes('Running bare-sync worker tests with Puppeteer'), 'stdout doesn\'t contain expected output for running in worker')
      assert.ok(stderr.includes(expectedStderr), 'stderr contains expected output')
    })
  })
}
