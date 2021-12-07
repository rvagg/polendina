/* globals describe it */

import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { runCli } from './common.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

function removeTimings (stdout) {
  return stdout.replace(/\(\d+ms\)/g, '(Xms)')
}

for (const type of ['cjs', 'esm']) {
  const mochaFixture = path.join(__dirname, `fixtures/mocha${type === 'esm' ? '-esm' : ''}`)
  const mochaFailureFixture = path.join(__dirname, `fixtures/mocha-failure${type === 'esm' ? '-esm' : ''}`)

  describe(`basic mocha (${type})`, function () {
    this.timeout(20000)
    const expectedTemplate = `
  test suite 1
    ✅ test case 1
    ✅ test case 2

  test suite 2 - worker
    ✅ is WORKER

  test suite 3
    ✅ test case 1
    ✅ test case 2
`

    it('should run in page', async () => {
      const { stdout, code } = await runCli(mochaFixture)
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in page')
    })

    it('should run in worker', async () => {
      const { stdout, code } = await runCli(mochaFixture, '--worker --page=false')
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should run in serviceworker', async () => {
      const { stdout, code } = await runCli(mochaFixture, '--serviceworker --page=false')
      assert.strictEqual(code, 0, 'exited with zero exit code')
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should run in page, worker and serviceworker', async () => {
      const { stdout, code } = await runCli(mochaFixture, '--worker --serviceworker')
      assert.strictEqual(code, 0, 'exited with zero exit code')

      let expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in page')

      expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')

      expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })
  })

  describe(`failing mocha (${type})`, function () {
    this.timeout(20000)
    const expectedTemplate = `
  test suite 1 - worker
    ✅ is WORKER

  test suite 2 - failing
    1) should fail


  1 passing (Xms)
  1 failing

  1) test suite 2 - failing
       should fail:
     Error: failing test
`

    it('should fail in page', async () => {
      let { stdout, code } = await runCli(mochaFailureFixture)
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'not in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha page tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in worker', async () => {
      let { stdout, code } = await runCli(mochaFailureFixture, '--worker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'in worker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha worker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in serviceworker', async () => {
      let { stdout, code } = await runCli(mochaFailureFixture, '--serviceworker --page=false')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      stdout = removeTimings(stdout)
      const expected = expectedTemplate.replace(/WORKER/, 'in serviceworker')
      assert.ok(stdout.includes(expected), 'stdout contains expected test output')
      assert.ok(stdout.includes('Running mocha serviceworker tests with Puppeteer'), 'stdout contains expected output for running in worker')
    })

    it('should fail in page and not run in worker', async () => {
      let { stdout, code } = await runCli(mochaFailureFixture, '--worker')
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
