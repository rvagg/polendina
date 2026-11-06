/* globals describe it */

import assert from 'assert'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { consumer, runCommand } from './common.js'

function pageArgs (pageUrl, extra = []) {
  return [
    '--cleanup',
    '--static', '.',
    '--page-url', pageUrl,
    ...extra
  ]
}

function runPage (consumerName, testFile, pageUrl = '/site/index.html?view=page#consumer', extra = []) {
  const dir = consumer(consumerName)
  const cli = path.join(dir, 'node_modules/polendina/polendina-cli.js')
  return runCommand(cli, [testFile, ...pageArgs(pageUrl, extra)], path.join(dir, 'fixtures', 'page-url'))
}

function output ({ stdout, stderr }) {
  return `${stdout}${stderr}`
}

const ticks = { mocha: '\u2714', mocha11: '\u2705' }

for (const consumerName of Object.keys(ticks)) {
  describe(`consumer page (${consumerName})`, function () {
    this.timeout(60000)

    it('runs mocha in an ESM consumer page', async () => {
      const result = await runPage(consumerName, 'test-passing.js')
      assert.strictEqual(result.code, 0, output(result))
      assert.match(result.stdout, /consumer page/)
      assert.match(result.stdout, /1 passing/)
      assert.ok(result.stdout.includes(ticks[consumerName]), output(result))
    })

    it('lets test modules handle expected HTTP and network failures', async () => {
      const result = await runPage(consumerName, 'test-requests.js')
      assert.strictEqual(result.code, 0, output(result))
      assert.match(result.stdout, /1 passing/)
    })
  })
}

describe('consumer page failures', function () {
  this.timeout(60000)

  it('reports a missing native module URL and cleans its build output', async () => {
    const result = await runPage('mocha', 'test-passing.js', '/site/missing-module.html')
    assert.notStrictEqual(result.code, 0)
    assert.match(output(result), /not-found-module\.js/)
    assert.strictEqual(fs.existsSync(path.join(consumer('mocha'), 'fixtures', 'page-url', 'build')), false)
  })

  it('reports a missing stylesheet URL', async () => {
    const result = await runPage('mocha', 'test-passing.js', '/site/missing-style.html')
    assert.notStrictEqual(result.code, 0)
    assert.match(output(result), /not-found-style\.css/)
  })

  it('reports a network-level startup failure', async () => {
    const script = 'http://127.0.0.1:1/startup-failure.js'
    const pageUrl = `/site/slow.html?script=${encodeURIComponent(script)}`
    const result = await runPage('mocha', 'test-passing.js', pageUrl)
    assert.strictEqual(result.code, 1, output(result))
    assert.ok(result.stderr.includes(script), output(result))
    assert.match(result.stderr, /request failed:/)
    assert.doesNotMatch(result.stderr, /HTTP \d+/)
  })

  it('rejects navigation that finishes on another origin', async () => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<!doctype html><link rel="icon" href="data:,"><p>other origin</p>')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const destination = `http://127.0.0.1:${server.address().port}/landing`
      const pageUrl = `/site/redirect.html?url=${encodeURIComponent(destination)}`
      const result = await runPage('mocha', 'test-passing.js', pageUrl)
      assert.strictEqual(result.code, 1, output(result))
      assert.match(result.stderr, /page URL changed origin:/)
      assert.ok(result.stderr.includes(destination), output(result))
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  })

  it('keeps mocha failure counts', async () => {
    const result = await runPage('mocha', 'test-failing.js')
    assert.strictEqual(result.code, 2, output(result))
    assert.match(result.stdout, /2 failing/)
    assert.match(result.stdout, /first consumer failure/)
    assert.match(result.stdout, /second consumer failure/)
  })

  it('reports asynchronous page errors after injection', async () => {
    const result = await runPage('mocha', 'test-pageerror.js')
    assert.notStrictEqual(result.code, 0)
    assert.match(output(result), /asynchronous page error/)
  })

  it('applies the timeout to page tests', async () => {
    const result = await runPage('mocha', 'test-timeout.js', '/site/index.html', ['--timeout', '1'])
    assert.notStrictEqual(result.code, 0)
    assert.match(result.stderr, /timeout/i)
  })

  it('applies the timeout while navigation waits for a resource', async () => {
    let requested = false
    const server = http.createServer(() => { requested = true })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const script = `http://127.0.0.1:${server.address().port}/pending.js`
      const pageUrl = `/site/slow.html?script=${encodeURIComponent(script)}`
      const result = await runPage('mocha', 'test-passing.js', pageUrl, ['--timeout', '1'])
      assert.strictEqual(requested, true)
      assert.strictEqual(result.code, 1, output(result))
      assert.match(result.stderr, /timeout/i)
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  })
})

describe('consumer page CLI validation', function () {
  this.timeout(60000)

  const cases = [
    ['requires --page-url with --static', ['--static', 'site'], /--static and --page-url require each other/],
    ['requires --static with --page-url', ['--page-url', '/index.html'], /--static and --page-url require each other/],
    ['rejects workers', [...pageArgs('/index.html'), '--worker', '--page=false'], /--static and --page-url require page mode only/],
    ['rejects service workers', [...pageArgs('/index.html'), '--serviceworker', '--page=false'], /--static and --page-url require page mode only/],
    ['rejects non-mocha runners', [...pageArgs('/index.html'), '--runner', 'tape'], /--static and --page-url require --runner=mocha/],
    ['rejects scheme-relative page URLs', [...pageArgs('//host/index.html')], /--page-url must be a same-origin path starting with a single \//],
    ['rejects backslash page URLs', [...pageArgs('/\\host/index.html')], /--page-url must be a same-origin path starting with a single \//]
  ]

  for (const [name, args, diagnostic] of cases) {
    it(name, async () => {
      const dir = consumer('mocha')
      const cli = path.join(dir, 'node_modules/polendina/polendina-cli.js')
      const result = await runCommand(cli, ['test-passing.js', ...args], path.join(dir, 'fixtures', 'page-url'))
      assert.notStrictEqual(result.code, 0)
      assert.match(output(result), diagnostic)
    })
  }
})
