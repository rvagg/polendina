/* globals mocha Mocha WorkerGlobalScope ServiceWorkerGlobalScope clients */

const registry = require('./test-registry')
const inPage =
  typeof window !== 'undefined' &&
  window.location &&
  typeof WorkerGlobalScope === 'undefined'
const inServiceWorker = !inPage &&
  typeof ServiceWorkerGlobalScope !== 'undefined' &&
  global instanceof ServiceWorkerGlobalScope
const inWorker = !inPage && !inServiceWorker &&
  typeof WorkerGlobalScope !== 'undefined' &&
  global instanceof WorkerGlobalScope
let executionQueue = Promise.resolve()

const log = {
  info: (...args) => {
    executionQueue = executionQueue.then(() => global.polendinaLog(['info'].concat(args)))
    return executionQueue
  },
  // TODO
  warn: (...args) => {
    executionQueue = executionQueue.then(() => global.polendinaLog(['warn'].concat(args)))
    return executionQueue
  },
  // TODO
  error: (...args) => {
    executionQueue = executionQueue.then(() => global.polendinaLog(['error'].concat(args)))
    return executionQueue
  }
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

function setupServiceWorkerGlobals () {
  async function _postMessage (msg) {
    for (const client of await clients.matchAll()) {
      client.postMessage(msg)
    }
  }

  global.polendinaLog = async function (...args) {
    _postMessage(['polendinaLog'].concat(args))
  }

  global.polendinaWrite = async function (...args) {
    _postMessage(['polendinaWrite'].concat(args))
  }

  global.polendinaEnd = async function (...args) {
    _postMessage(['polendinaEnd'].concat(args))
  }
}

function setupLogging () {
  console.log = function (...args) {
    try {
      if (/BrowserStdout.*write/.test(new Error().stack)) {
        // the BrowserStdout polyfill Mocha ships with that converts process.stdout.write() to console.log()
        // so we strip out the extra \n that necessarily inserts
        // args[0] = args[0].replace(/\n$/, '')
        executionQueue = executionQueue.then(() => global.polendinaWrite(args))
        return
      }
    } catch (err) {}
    log.info.apply(null, args)
  }

  // TODO: differentiate
  console.warn = log.warn
  console.error = log.error
}

function runTape () {
  const tape = require('tape')
  const { Transform } = require('stream')
  let failures = 0
  let executionQueue = Promise.resolve()

  const stream = new Transform({
    transform (chunk, encoding, callback) {
      executionQueue = executionQueue.then(() => {
        global.polendinaWrite(chunk.toString())
          .catch(callback)
          .then(callback)
      })
    },

    flush (callback) {
      executionQueue.then(() => {
        global.polendinaEnd(failures)
          .catch(callback)
          .then(callback)
      })
    }
  })

  tape.getHarness({ stream })

  tape.getHarness().onFailure((...args) => {
    failures = 1
  })

  for (const mod of registry.tests) {
    mod.load()
  }
}

function runMocha () {
  require('!script-loader!mocha/mocha.js') // eslint-disable-line

  mocha.setup({ reporter: registry.argv.mochaReporter, ui: 'bdd' })
  mocha.useColors(true)

  // the well-behaved reporters, like spec, are easy to intercept
  Mocha.reporters.Base.consoleLog = log.info

  for (const mod of registry.tests) {
    mod.load()
  }

  let errors = 0
  mocha
    .run((_errors) => { errors = _errors })
    .on('end', (...args) => {
      executionQueue.then(() => global.polendinaEnd(errors))
    })
}

async function runBareSync () {
  let errors = 0
  for (const mod of registry.tests) {
    try {
      mod.load()
      await log.info(`  \u001b[32m▸\u001b[39m ${mod.name}`)
    } catch (err) {
      log.info(`  \u001b[31m▸\u001b[39m ${mod.name}`)
      log.error(err.stack || String(err))
      if (err.details) {
        log.error(String(err.details))
      }
      errors = 1
      break
    }
  }
  executionQueue.then(() => global.polendinaEnd(errors))
}

async function start () {
  if (inWorker) {
    setupWorkerGlobals()
  } else if (inServiceWorker) {
    await new Promise((resolve, reject) => {
      global.addEventListener('activate', (event) => {
        event.waitUntil(global.clients.claim())
        setupServiceWorkerGlobals()
        resolve()
      })
    })
  }

  setupLogging()

  if (registry.argv.runner === 'tape') {
    return runTape()
  }
  if (registry.argv.runner === 'mocha') {
    return runMocha()
  }
  if (registry.argv.runner === 'bare-sync') {
    return runBareSync()
  }
}

start()
