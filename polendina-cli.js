#!/usr/bin/env node

import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { log } from './lib/log.js'
import { Polendina } from './polendina.js'

const start = Date.now()
const argv = yargs(hideBin(process.argv))
  .usage('$0 testfile.js [testfile2.js [tests/**/test*.js ...] ]')
  .option('runner', {
    alias: 'r',
    type: 'string',
    describe: 'The test runner to use',
    choices: ['mocha', 'tape', 'bare-sync', 'bare-async'],
    default: 'mocha'
  })
  .option('output-dir', {
    alias: 'o',
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
  .option('serviceworker', {
    type: 'boolean',
    describe: 'Run tests in a ServiceWorker',
    default: false
  })
  .option('stats', {
    type: 'boolean',
    describe: 'Write webpack-stats.json with bundle',
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
  .option('coverage', {
    type: 'boolean',
    describe: 'Enable coverage reporting',
    default: false,
    hidden: true
  })
  .option('webpack-config', {
    type: 'string',
    describe: 'Supply a path to a webpack.config.js to merge into Polendina\'s Webpack config (use with caution)',
    requiresArg: true
  })
  .option('mocha-reporter', {
    type: 'string',
    describe: 'Specify the Mocha reporter',
    default: 'spec',
    requiresArg: true
  })
  .help('help')
  .demandCommand(1, 'You must supply at least one test file')
  .check((argv) => {
    if (!argv.page && !argv.worker && !argv.serviceworker) {
      throw new Error('No mode specified, use one or more of `--page`, `--worker`, `--serviceworker`')
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

;(async () => {
  const polendina = new Polendina(argv)

  log(`Setting up output directory: ${polendina.outputDir} ...`)
  await polendina.build()
  log(`Created bundle: ${path.join(polendina.outputDir, polendina.bundleFile)} ...`)
  if (polendina.statsFile) {
    log(`Created stats: ${polendina.statsFile} ...`)
  }

  const errors = await polendina.run()

  if (argv.cleanup) {
    log(`Removing output directory: ${polendina.outputDir}`)
    await polendina.cleanup()
  }

  let time = (Date.now() - start) / 1000
  if (time > 10) {
    time = Math.round(time)
  } else {
    time = Math.round(time * 10) / 10
  }

  log(`Took ${time} second${time === 1 ? '' : 's'}`)

  if (errors) {
    return process.exit(errors)
  }
})()
  .catch((err) => {
    console.error(err.stack || err)
    if (err.details) {
      console.error(err.details)
    }
    process.exit(1)
  })
