#!/usr/bin/env node

const start = Date.now()
const glob = require('glob')
const path = require('path')
const stripAnsi = require('strip-ansi')
const tty = process.stdout.isTTY && process.stderr.isTTY
const BareRunner = require('./resources/bare')
const argv = require('yargs')
  .command('bare-sync <test files..>', 'Run synchronous tests using a plain require(file)')
  .command('bare-async <test files..>', 'Run tests by executing exported functions from files as async')
  .demandCommand()
  .help('help')
  .check((argv) => {
    if (argv._[0] !== 'bare-sync' && argv._[0] !== 'bare-async') {
      throw new Error('Run with either `bare-sync` or `bare-async`')
    }
    return true
  })
  .argv

function cleanLog (to) {
  return (...args) => {
    if (!tty) {
      args = args.map((a) => typeof a === 'string' ? stripAnsi(a) : a)
    }
    to.apply(null, args)
  }
}

async function run () {
  const mode = argv._[0]
  const testFiles = argv.testfiles.reduce((p, c) => {
    return p.concat(glob.sync(c, { absolute: true }))
  }, [])

  // our globs may be fruitless
  if (!testFiles.length) {
    throw new Error(`No test files found: '${argv._.join(' ')}'`)
  }

  const tests = testFiles.map((f) => {
    return {
      name: path.relative(process.cwd(), f),
      load: () => require(path.resolve(process.cwd(), f))
    }
  })
  const log = {
    error: cleanLog(console.error),
    info: cleanLog(console.log)
  }
  const runner = new BareRunner(log, tests)
  const errors = await runner[mode === 'bare-sync' ? 'runBareSync' : 'runBareAsync']()
  return errors
}

run()
  .catch((err) => {
    console.error(err.stack || err)
    if (err.details) {
      console.error(err.details)
    }
    process.exit(1)
  })
  .then((errors) => {
    let time = (Date.now() - start) / 1000
    if (time > 10) {
      time = Math.round(time)
    } else {
      time = Math.round(time * 10) / 10
    }

    console.log(`Took ${time} second${time === 1 ? '' : 's'}`)

    process.exit(errors)
  })
