#!/usr/bin/env node

const { promisify } = require('util')
const path = require('path')
const fs = require('fs').promises
const http = require('http')
const st = require('st')
const webpack = promisify(require('webpack'))
const argv = require('yargs').argv
const webpackConfig = require('./resources/webpack.config')(process.env, argv)
const puppeteer = require('./puppeteer')
const { log, error } = require('./log')

const defaultTimeout = 30

async function run () {
  const outputDir = path.join(process.cwd(), argv.outputDir)
  const timeout = argv.timeout > 0 ? argv.timeout : defaultTimeout
  const mode = {
    page: !!argv.page,
    worker: !!argv.worker
  }

  if (!mode.page && !mode.worker) {
    throw new Error('No mode specified, use one or more of `--page`, `--worker`')
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

  if (mode.page) {
    await execute(outputDir, timeout, 'page')
  }
  if (mode.worker) {
    await execute(outputDir, timeout, 'worker')
  }
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
        .then(() => {
          server.close(resolve)
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
