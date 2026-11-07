#!/usr/bin/env node

import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { log } from './lib/log.js'
import { Polendina } from './polendina.js'
import { PageError } from './lib/page-error.js'

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
  .option('static', {
    type: 'string',
    describe: 'Serve a directory at / with --page-url (page mode and mocha only)',
    requiresArg: true
  })
  .option('page-url', {
    type: 'string',
    describe: 'Load a same-origin page path from --static before running mocha tests',
    requiresArg: true
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
    if (argv.static !== undefined || argv.pageUrl !== undefined) {
      if (!argv.static || !argv.pageUrl) {
        throw new Error('--static and --page-url require each other')
      }
      if (!argv.page || argv.worker || argv.serviceworker) {
        throw new Error('--static and --page-url require page mode only')
      }
      if (argv.runner !== 'mocha') {
        throw new Error('--static and --page-url require --runner=mocha')
      }
      const origin = 'http://localhost'
      if (!argv.pageUrl.startsWith('/') ||
          argv.pageUrl.startsWith('//') ||
          new URL(argv.pageUrl, origin).origin !== origin) {
        throw new Error('--page-url must be a same-origin path starting with a single /')
      }
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

  let errors
  try {
    errors = await polendina.run()
  } finally {
    if (argv.cleanup) {
      log(`Removing output directory: ${polendina.outputDir}`)
      await polendina.cleanup()
    }
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
    console.error(err instanceof PageError ? err.message : err.stack || err)
    if (err.details) {
      console.error(err.details)
    }
    process.exit(1)
  })
