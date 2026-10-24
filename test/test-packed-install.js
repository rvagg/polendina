/* globals describe it before after */

// Installs polendina from a packed tarball into a consumer outside this
// repository and runs the CLI there. npm hoists polendina's dependencies into
// the consumer's node_modules, a layout the in-repo fixtures never produce.

import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { exec, execFile } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(path.dirname(import.meta.url))
const root = path.join(__dirname, '..')
const puppeteerVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/puppeteer/package.json'))).version

function sh (command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' } }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`${command}\n${stderr}`))
      }
      resolve(stdout.toString())
    })
  })
}

function cli (cwd, args) {
  return new Promise((resolve) => {
    const bin = path.join(cwd, 'node_modules/polendina/polendina-cli.js')
    execFile(process.execPath, [bin, ...args], { cwd }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

describe('packed install', function () {
  this.timeout(300000)
  let consumer

  before(async () => {
    consumer = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polendina-consumer-'))
    const [{ filename }] = JSON.parse(await sh(`npm pack --json --pack-destination "${consumer}"`, root))
    await fs.promises.writeFile(path.join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }))
    await fs.promises.writeFile(path.join(consumer, 'test-tape.js'), `
      const tape = require('tape')
      tape('packed', (t) => { t.ok(true, 'runs'); t.end() })
    `)
    await fs.promises.writeFile(path.join(consumer, 'test-mocha.js'), `
      /* globals describe it */
      describe('packed', () => { it('runs', () => { if (!true) throw new Error('nope') }) })
    `)
    await sh(`npm install --no-audit --no-fund --no-package-lock --prefer-offline "./${filename}" tape mocha puppeteer@${puppeteerVersion}`, consumer)
  })

  after(async () => {
    if (consumer) {
      await fs.promises.rm(consumer, { recursive: true, force: true })
    }
  })

  it('hoists dependencies', async () => {
    await assert.rejects(fs.promises.access(path.join(consumer, 'node_modules/polendina/node_modules/stream-browserify')))
    await fs.promises.access(path.join(consumer, 'node_modules/stream-browserify'))
  })

  it('runs tape', async () => {
    const { code, stdout, stderr } = await cli(consumer, ['--runner=tape', '--cleanup', 'test-tape.js'])
    if (code !== 0) {
      console.error(stdout, stderr)
    }
    assert.strictEqual(code, 0, 'exited with zero exit code')
    assert.strictEqual(stderr, '', 'no stderr')
    assert.ok(stdout.includes('ok 1 runs'), 'stdout contains tape output')
  })

  it('runs mocha', async () => {
    const { code, stdout, stderr } = await cli(consumer, ['--cleanup', 'test-mocha.js'])
    if (code !== 0) {
      console.error(stdout, stderr)
    }
    assert.strictEqual(code, 0, 'exited with zero exit code')
    assert.strictEqual(stderr, '', 'no stderr')
    assert.ok(stdout.includes('1 passing'), 'stdout contains mocha output')
  })
})
