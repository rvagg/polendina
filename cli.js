#!/usr/bin/env node

const { promisify } = require('util')
const path = require('path')
const fs = require('fs').promises
const http = require('http')
const st = require('st')
const rimraf = promisify(require('rimraf'))
const webpack = promisify(require('webpack'))
const puppeteer = require('./puppeteer')
const { log } = require('./log')

const argv = require('yargs')
  .usage('$0 testfile.js [testfile2.js [tests/**/test*.js ...] ]')
  .option('output-dir', {
    type: 'string',
    describe: 'Location for temporary build resources',
    default: path.join(process.cwd(), 'build')
  })
  .option('page', {
    type: 'boolean',
    describe: 'Run tests in standard browser page',
    default: true
  })
  .option('worker', {
    type: 'boolean',
    describe: 'Run tests in a WebWorker',
    default: false
  })
  .option('cleanup', {
    type: 'boolean',
    describe: 'Remove the output-dir after execution',
    default: false
  })
  .option('timeout', {
    type: 'number',
    describe: 'Number of seconds to wait before auto-failing the test suite',
    default: 30
  })
  .option('express-reporter', {
    type: 'string',
    describe: 'Specify the Express reporter',
    requiresArg: true
  })
  .help('help')
  .demandCommand(1, 'You must supply at least one test file')
  .check((argv) => {
    if (!argv.page && !argv.worker) {
      throw new Error('No mode specified, use one or more of `--page`, `--worker`')
    }
    if (argv.timeout <= 0) {
      throw new Error(`Invalid timeout value (${argv.timeout})`)
    }
    if (!argv.outputDir) {
      throw new Error('--output-dir required')
    }
    return true
  })
  .argv

const webpackConfig = require('./resources/webpack.config')(process.env, argv)

async function run () {
  const outputDir = path.resolve(process.cwd(), argv.outputDir)
  const mode = {
    page: argv.page,
    worker: argv.worker
  }

  log(`Setting up output directory: ${outputDir} ...`)

  await fs.mkdir(outputDir, { recursive: true })
  await Promise.all(['index.html', 'mocha-run.js'].map((file) => {
    return fs.copyFile(path.join(__dirname, 'resources', file), path.join(outputDir, file))
  }))

  const stats = await webpack(webpackConfig)

  const info = stats.toJson()

  if (stats.hasErrors()) {
    console.error(info.errors)
    process.exit(1)
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings)
  }

  log(`Created bundle: ${path.join(outputDir, info.assetsByChunkName.main[0])} ...`)

  const statsFile = path.join(webpackConfig.output.path, 'webpack-stats.json')
  await fs.writeFile(statsFile, JSON.stringify(info), 'utf8')

  log(`Wrote: ${statsFile} ...`)

  async function cleanup () {
    if (argv.cleanup) {
      log(`Removing output directory: ${outputDir}`)
      await rimraf(outputDir)
    }
  }

  if (mode.page) {
    const errors = await execute(outputDir, argv.timeout, 'page')
    if (errors) {
      await cleanup()
      return process.exit(errors)
    }
  }
  if (mode.worker) {
    const errors = await execute(outputDir, argv.timeout, 'worker')
    if (errors) {
      await cleanup()
      return process.exit(errors)
    }
  }

  await cleanup()
}

function execute (outputDir, timeout, mode) {
  log(`Running ${mode} tests with Puppeteer ...`)

  const mount = st({ path: outputDir, index: 'index.html' })
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      mount(req, res, () => {
        res.statusCode = 404
        res.end('Nope')
      })
    })
    server.on('error', reject)
    server.listen(() => {
      puppeteer(argv.outputDir, server.address().port, timeout, mode)
        .then((errors) => {
          server.close(() => {
            resolve(errors)
          })
        })
        .catch(reject)
    })
  })
}

run().catch((err) => {
  console.error(err.stack || err)
  if (err.details) {
    console.error(err.details)
  }
  process.exit(1)
})
