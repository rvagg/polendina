/* globals Worker Mocha mocha polendinaEnd polendinaLog polendinaWrite */

let executionQueue = Promise.resolve()

mocha.useColors(true)

function consoleLog (...args) {
  executionQueue = executionQueue.then(polendinaLog(args))
}

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

function runWorker () {
  const worker = new Worker('worker.js')
  worker.addEventListener('message', (msg) => {
    if (!Array.isArray(msg)) {
      return
    }
  }, false)
}

function runPage () {
  setTimeout(() => {
    mocha.run().on('end', () => {
      executionQueue.then(polendinaEnd)
    })
  }, 0)
}

if (window.location.search === '?worker') {
  runWorker()
} else {
  runPage()
}
