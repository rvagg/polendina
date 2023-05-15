/* globals describe it */

import assert from 'assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { runCommand } from './common.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

const cli = path.join(__dirname, '../polendina-node-cli.js')

function runCli (mode, cwd) {
  return runCommand(`${cli} ${mode} test*.js`, cwd)
}

function removeTiming (stdout) {
  return stdout.replace(/Took [\d.]+ seconds/, 'Took X seconds')
}

for (const type of ['cjs', 'esm']) {
  const bareSyncFixture = path.join(__dirname, `fixtures/bare-sync${type === 'esm' ? '-esm' : ''}`)
  const bareSyncFailureFixture = path.join(__dirname, `fixtures/bare-sync-failure${type === 'esm' ? '-esm' : ''}`)
  const bareAsyncFixture = path.join(__dirname, `fixtures/bare-async${type === 'esm' ? '-esm' : ''}`)
  const bareAsyncFailureFixture = path.join(__dirname, `fixtures/bare-async-failure${type === 'esm' ? '-esm' : ''}`)

  describe(`polendina-node bare-sync (${type})`, function () {
    this.timeout(60000)
    it('pass', async () => {
      const expected =
`testing is not in worker
  ✔ test-1.js
testing bare fixture
  ✔ test-2.js
Took X seconds
`
      const { stdout, stderr, code } = await runCli('bare-sync', bareSyncFixture)
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      assert.strictEqual(removeTiming(stdout), expected)
    })

    it('failure', async () => {
      const expected =
`testing is not in worker
  ✔ test-1.js
testing bare fixture
  ✘ test-2.js
Took X seconds
`
      const { stdout, stderr, code } = await runCli('bare-sync', bareSyncFailureFixture)
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      assert.strictEqual(removeTiming(stdout), expected)
      assert.ok(stderr.includes('AssertionError: faily mcfailface'), 'stderr contains expected output')
    })
  })

  describe(`polendina-node bare-async (${type})`, function () {
    this.timeout(60000)
    it('pass', async () => {
      const expected =
`testing is not in worker
  ✔ test-1.js
  test-2.js
testing bare fixture
    ✔ test1
    ✔ test2
Took X seconds
`
      const { stdout, stderr, code } = await runCli('bare-async', bareAsyncFixture)
      if (code !== 0) {
        console.error(stderr)
      }
      assert.strictEqual(code, 0, 'exited with zero exit code')
      assert.strictEqual(removeTiming(stdout), expected)
    })

    it('failure', async () => {
      const expected =
`testing is not in worker
  ✔ test-1.js
  test-2.js
testing bare fixture
    ✔ test1
    ✘ test2
Took X seconds
`
      const { stdout, stderr, code } = await runCli('bare-async', bareAsyncFailureFixture)
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      assert.strictEqual(removeTiming(stdout), expected)
      assert.ok(stderr.includes('AssertionError: faily mcfailface'), 'stderr contains expected output')
    })
  })
}
