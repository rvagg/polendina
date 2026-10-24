/* globals describe it */

import assert from 'assert'
import { runNodeCli } from './common.js'

function removeTiming (stdout) {
  return stdout.replace(/Took [\d.]+ seconds/, 'Took X seconds')
}

for (const type of ['cjs', 'esm']) {
  const bareSyncFixture = `bare-sync${type === 'esm' ? '-esm' : ''}`
  const bareSyncFailureFixture = `bare-sync-failure${type === 'esm' ? '-esm' : ''}`
  const bareAsyncFixture = `bare-async${type === 'esm' ? '-esm' : ''}`
  const bareAsyncFailureFixture = `bare-async-failure${type === 'esm' ? '-esm' : ''}`

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
      const { stdout, stderr, code } = await runNodeCli('bare', bareSyncFixture, 'bare-sync')
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
      const { stdout, stderr, code } = await runNodeCli('bare', bareSyncFailureFixture, 'bare-sync')
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
      const { stdout, stderr, code } = await runNodeCli('bare', bareAsyncFixture, 'bare-async')
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
      const { stdout, stderr, code } = await runNodeCli('bare', bareAsyncFailureFixture, 'bare-async')
      assert.strictEqual(code, 1, 'exited with non-zero exit code')
      assert.strictEqual(removeTiming(stdout), expected)
      assert.ok(stderr.includes('AssertionError: faily mcfailface'), 'stderr contains expected output')
    })
  })
}
