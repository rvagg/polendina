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

  if (registry.argv.runner === 'tape') {
    runTape()
  } else if (registry.argv.runner === 'mocha') {
    runMocha()
  }
}

start()
