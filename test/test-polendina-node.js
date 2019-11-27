/* globals describe it */

const assert = require('assert')
const path = require('path')
const { runCommand } = require('./common')
const cli = path.join(__dirname, '../polendina-node-cli.js')

const bareSyncFixture = path.join(__dirname, 'fixtures/bare-sync')
const bareSyncFailureFixture = path.join(__dirname, 'fixtures/bare-sync-failure')
const bareAsyncFixture = path.join(__dirname, 'fixtures/bare-async')
const bareAsyncFailureFixture = path.join(__dirname, 'fixtures/bare-async-failure')

function runCli (mode, cwd) {
  return runCommand(`${cli} ${mode} test*.js`, cwd)
}

function removeTiming (stdout) {
  return stdout.replace(/Took [\d.]+ seconds/, 'Took X seconds')
}

describe('polendina-node bare-sync', function () {
  this.timeout(20000)
  it('pass', async () => {
    const expected =
`testing is not in worker
  ✔ test-1.js
testing bare fixture
  ✔ test-2.js
Took X seconds
`
    const { stdout, code } = await runCli('bare-sync', bareSyncFixture)
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
    assert.ok(stderr.includes('AssertionError [ERR_ASSERTION]: \'nope\' != \'faily mcfailface\''), 'stderr contains expected output')
  })
})

describe('polendina-node bare-async', function () {
  this.timeout(20000)
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
    const { stdout, code } = await runCli('bare-async', bareAsyncFixture)
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
    assert.ok(stderr.includes('AssertionError [ERR_ASSERTION]: \'nope\' != \'faily mcfailface\''), 'stderr contains expected output')
  })
})
