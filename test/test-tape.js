/* globals describe it */

const assert = require('assert')
const path = require('path')
const { runCli } = require('./common')

const tapeFixture = path.join(__dirname, 'fixtures/tape')

describe('basic tape', function () {
  this.timeout(20000)

  it('should run in page', async () => {
    const { stdout, code } = await runCli(tapeFixture, '--runner=tape')
    assert.strictEqual(code, 0, 'exited with zero exit code')
    const expected = `
TAP version 13
# test suite 1
# test case 1
ok 1 should be equal
# test case 2
ok 2 all good
# test suite 2 - worker
# is not in worker
ok 3 should be equal
# test suite 3
# test case 1
ok 4 should be equal
# test case 2
ok 5 all good

1..5
# tests 5
# pass  5

# ok
`

    assert.ok(stdout.includes(expected), 'stdout contains expected test output')
    assert.ok(stdout.includes('Running tape page tests with Puppeteer'), 'stdout contains expected output for running in page')
  })

  it('should run in worker', async () => {
    const { stdout, code } = await runCli(tapeFixture, '--runner=tape --worker --page=false')
    assert.strictEqual(code, 0, 'exited with zero exit code')
    const expected = `
TAP version 13
# test suite 1
# test case 1
ok 1 should be equal
# test case 2
ok 2 all good
# test suite 2 - worker
# is in worker
ok 3 should be equal
# test suite 3
# test case 1
ok 4 should be equal
# test case 2
ok 5 all good

1..5
# tests 5
# pass  5

# ok
`

    assert.ok(stdout.includes(expected), 'stdout contains expected test output')
    assert.ok(stdout.includes('Running tape worker tests with Puppeteer'), 'stdout contains expected output for running in page')
  })
})
