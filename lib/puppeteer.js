const puppeteer = require('puppeteer')
// TODO
// const pti = require('puppeteer-to-istanbul')
// const { copyFile } = require('fs').promises
const { log, error, logRaw, logWrite } = require('./log')

// wrap our convoluted _run() function in a pure Promise that can handle
// both standard throws and the callback that ends it. _run() needs to handle
// ends in a few different ways, hence the hack.
function run (outputDir, port, timeout, mode, runner, coverage) {
  return new Promise((resolve, reject) => {
    _run(outputDir, port, timeout, mode, runner, coverage, (err, errors) => {
      if (err) {
        return reject(err)
      }
      resolve(errors)
    })
  })
}

// this can throw, or it can end via `callback()` which may or may not contain
// a runtime-error argument and a "number of errors from tests" argument.
// the callback may be triggered by proper test end or failure, or a timeout.
async function _run (outputDir, port, timeout, mode, runner, coverage, callback) {
  let executionQueue = Promise.resolve()

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const [page] = await browser.pages()

  // this works as a debounce exit method, when process.stdout.write() is used
  // instead of console.log, the output goes through the stream handling which
  // inserts delays so log output comes later than an end() signal. If we get
  // an end(), we delay for a short time and then keep delaying if we get more
  // output—it should come in steady increments after an end() as we're only
  // waiting for stream delays, not test delays at that point.
  let lastCall

  function end (errors) {
    lastCall = setTimeout(() => {
      if (!executionQueue) {
        error('end after end')
        return
      }
      executionQueue.then(async () => {
        executionQueue = null
        /* TODO
        if (coverage) {
          const jsCoverage = await page.coverage.stopJSCoverage()
          pti.write([...jsCoverage])
          await copyFile('build/bundle.js.map', '.nyc_output/js/bundle.js.map')
        }
        */
        await browser.close()
      }).catch(callback)
        .then(() => { callback(null, errors) })
    }, 100)
  }

  function maybeEnd () {
    if (lastCall) {
      clearTimeout(lastCall)
      end()
    }
  }

  // this should be a rare, or impossible event since we intercept console.log
  page.on('console', (msg) => {
    if (!executionQueue) {
      error(`log after end: ${msg.text()}`)
      return
    }
    const args = []
    executionQueue = executionQueue.then(async () => {
      logRaw('info', await Promise.all(args))
    })
    for (const arg of msg.args()) {
      args.push(arg.evaluate(n => n))
    }
    maybeEnd()
  })

  await page.exposeFunction('polendinaEnd', (errors) => {
    end(errors)
  })
  await page.exposeFunction('polendinaLog', (args) => {
    logRaw(args.shift(), args)
    maybeEnd()
  })
  await page.exposeFunction('polendinaWrite', (args) => {
    logWrite(args)
    maybeEnd()
  })

  if (coverage) {
    await page.coverage.startJSCoverage()
  }

  const url = `http://localhost:${port}/?mode=${mode}&runner=${runner}`
  log(`Running ${runner} ${mode} tests with Puppeteer via\n                ${url}`)
  if (runner !== 'mocha') {
    log()
  }

  await page.goto(url)

  setTimeout(() => {
    const err = new Error(`timeout: tests did not finish cleanly after ${timeout} seconds`)
    const cb = () => callback(err)
    browser.close().then(cb).catch(cb)
  }, timeout * 1000).unref()
}

module.exports = run
