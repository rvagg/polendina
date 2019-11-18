#!/usr/bin/env node

const { promisify } = require('util')
const path = require('path')
const fs = require('fs').promises
const webpack = promisify(require('webpack'))
const argv = require('yargs').argv
const webpackConfig = require('./resources/webpack.config')(process.env, argv)
const puppeteer = require('./puppeteer')
const { log } = require('./log')

const defaultTimeout = 30

async function run () {
  const outputDir = path.join(process.cwd(), argv.outputDir)
  const timeout = argv.timeout > 0 ? argv.timeout : defaultTimeout

  log(`Setting up output directory: ${outputDir} ...`)

  await fs.mkdir(outputDir, { recursive: true })
  await Promise.all(['index.html', 'worker.js', 'mocha-run.js'].map((file) => {
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

  log('Running tests with Puppeteer ...')

  await puppeteer(argv.outputDir, timeout)
}

run().catch((err) => {
  console.error(err.stack || err)
  if (err.details) {
    console.error(err.details)
  }
  process.exit(1)
})
