/* globals describe it */

import assert from 'assert'
import { runCli } from './common.js'

function removeTimings (stdout) {
  return stdout.replace(/\(\d+ms\)/g, '(Xms)')
}

// the consumers to run against, with the spec reporter's pass symbol, which
// differs by major in the browser bundle
const ticks = { mocha: '\u2714', mocha11: '\u2705' }

for (const [consumerName, type] of Object.keys(ticks).flatMap((c) => ['cjs', 'esm'].map((t) => [c, t]))) {
  const mochaFixture = `mocha${type === 'esm' ? '-esm' : ''}`
  const mochaFailureFixture = `mocha-failure${type === 'esm' ? '-esm' : ''}`

  describe(`basic mocha (${type}, ${consumerName})`, function () {
    this.timeout(60000)
    const expectedTemplate = `
  test suite 1
    ${ticks[consumerName]} test case 1
    ${ticks[consumerName]} test case 2

  test suite 2 - worker
    ${ticks[consumerName]} is WORKER

  test suite 3
    ${ticks[consumerName]} test case 1
    ${ticks[consumerName]} test case 2
`

    it('should run in page', async () => {
      const { stdout, stderr, code } = await runCli(consumerName, mochaFixture, [])
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in worker', async () => {
      const { stdout, stderr, code } = await runCli(consumerName, mochaFixture, ['--worker', '--page=false'])
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should run in serviceworker', async () => {
      const { stdout, stderr, code } = await runCli(consumerName, mochaFixture, ['--serviceworker', '--page=false'])
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should run in page, worker and serviceworker', async () => {
      const { stdout, stderr, code } = await runCli(consumerName, mochaFixture, ['--worker', '--serviceworker'])
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')

      let expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')

      expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })
  })

  describe(`failing mocha (${type}, ${consumerName})`, function () {
    this.timeout(60000)
    const expectedTemplate = `
  test suite 1 - worker
    ${ticks[consumerName]} is WORKER

  test suite 2 - failing
    1) should fail


  1 passing (Xms)
  1 failing

  1) test suite 2 - failing
       should fail:
     Error: failing test
`

    it('should fail in page', async () => {
      let { stdout, code } = await runCli(consumerName, mochaFailureFixture, [])
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in worker', async () => {
      let { stdout, code } = await runCli(consumerName, mochaFailureFixture, ['--worker', '--page=false'])
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in serviceworker', async () => {
      let { stdout, code } = await runCli(consumerName, mochaFailureFixture, ['--serviceworker', '--page=false'])
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      if (!stdout.includes(expected)) {
        console.error(stdout)
      }
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in page and not run in worker', async () => {
      let { stdout, code } = await runCli(consumerName, mochaFailureFixture, ['--worker'])
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      let found = stdout.indexOf(expected)
      assert.ok(found > -1, 'stdout contains expected test output')
      found = stdout.indexOf(expected, found + 1)
      assert.ok(found === -1, 'stdout doesn\'t contain second instance of expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in page')
      assert.ok(!stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout doesn\'t contain expected output for running in worker')
    })
  })
}
