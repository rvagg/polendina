/* globals mocha Mocha WorkerGlobalScope */

const registry = require('./test-registry')
const inPage =
  typeof window !== 'undefined' &&
  window.location &&
  typeof WorkerGlobalScope === 'undefined'
const inWorker = !inPage &&
  typeof WorkerGlobalScope !== 'undefined' &&
  global instanceof WorkerGlobalScope
const _consoleLog = console ? console.log : () => {}
let executionQueue = Promise.resolve()

function consoleLog (...args) {
  executionQueue = executionQueue.then(global.polendinaLog(args))
}

function setupWorkerGlobals () {
  global.polendinaLog = async function (...args) {
    global.postMessage(['polendinaLog'].concat(args))
  }

  global.polendinaWrite = async function (...args) {
    global.postMessage(['polendinaWrite'].concat(args))
  }

  global.polendinaEnd = async function (...args) {
    global.postMessage(['polendinaEnd'].concat(args))
  }
}

function runTape () {
  const tape = require('tape')
  const { Transform } = require('stream')
  let failures = 0
  let executionQueue = Promise.resolve()

  const stream = new Transform({
    transform (chunk, encoding, callback) {
      executionQueue = executionQueue && executionQueue.then(() => {
        global.polendinaWrite(chunk.toString())
          .catch(callback)
          .then(callback)
      })
    },

    flush (callback) {
      executionQueue && executionQueue.then(() => {
        global.polendinaEnd(failures)
          .catch(callback)
          .then(callback)
        executionQueue = null
      })
    }
  })

  tape.getHarness({ stream })

  tape.getHarness().onFailure((...args) => {
    failures = 1
  })

  for (const mod of registry.tests) {
    mod()
  }
}

function runMocha () {
  require('!script-loader!mocha/mocha.js') // eslint-disable-line

  mocha.setup({ reporter: registry.argv.mochaReporter, ui: 'bdd' })
  mocha.useColors(true)

  // the well-behaved reporters, like spec, are easy to intercept
  Mocha.reporters.Base.consoleLog = consoleLog

  // the poorly behaved ones, not so much, we get both console.log()
  // and process.stdout.write() reporting here
  console.log = function (...args) {
    try {
      if (/BrowserStdout.*write/.test(new Error().stack)) {
        // the BrowserStdout polyfill Mocha ships with that converts process.stdout.write() to console.log()
        // so we strip out the extra \n that necessarily inserts
        // args[0] = args[0].replace(/\n$/, '')
        executionQueue = executionQueue.then(global.polendinaWrite(args))
        return
      }
    } catch (err) {}
    consoleLog.apply(null, args)
  }

  for (const mod of registry.tests) {
    mod()
  }

  let errors = 0
  mocha
    .run((_errors) => { errors = _errors })
    .on('end', (...args) => {
      executionQueue.then(global.polendinaEnd.bind(null, errors))
    })
}

if (inWorker) {
  setupWorkerGlobals()
}

if (registry.argv.runner === 'tape') {
  runTape()
} else if (registry.argv.runner === 'mocha') {
  runMocha()
}
