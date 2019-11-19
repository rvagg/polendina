/* globals self Worker WorkerGlobalScope postMessage importScripts Mocha mocha polendinaEnd polendinaLog polendinaWrite */

const inPageLoadingWorker = typeof window !== 'undefined' && window.location && window.location.search === '?worker'
const inWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
let executionQueue = Promise.resolve()

function consoleLog (...args) {
  executionQueue = executionQueue.then(polendinaLog(args))
}

function runWorker () {
  const worker = new Worker('mocha-run.js')
  worker.addEventListener('message', (msg) => {
    if (!Array.isArray(msg.data)) {
      return
    }

    if (!self[msg.data[0]]) {
      console.log.apply(console, msg.data)
    } else {
      self[msg.data[0]].apply(null, msg.data.slice(1))
    }
  }, false)
}

if (inWorker) {
  self.polendinaLog = function (...args) {
    postMessage(['polendinaLog'].concat(args))
  }

  self.polendinaWrite = function (...args) {
    postMessage(['polendinaWrite'].concat(args))
  }

  self.polendinaEnd = function (...args) {
    postMessage(['polendinaEnd'].concat(args))
  }

  polendinaLog('Running in worker')
  importScripts('bundle.js')
}

if (!inPageLoadingWorker || inWorker) {
  mocha.useColors(true)

  if (typeof polendinaLog !== 'undefined') {
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
          executionQueue = executionQueue.then(polendinaWrite(args))
          return
        }
      } catch (err) {}
      consoleLog.apply(null, args)
    }
  } else { // dev case, where this file is loaded directly, not the normal case
    self.polendinaLog = console.log
    self.polendinaWrite = console.log
    self.polendinaEnd = () => console.log('ENDED')
  }

  setTimeout(() => {
    mocha.run().on('end', () => {
      executionQueue.then(polendinaEnd)
    })
  }, 0)
} else if (inPageLoadingWorker) {
  runWorker()
}
