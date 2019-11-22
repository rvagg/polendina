const puppeteer = require('puppeteer')
const { log, error, logRaw, logWrite } = require('./log')

function run (outputDir, port, timeout, mode, runner) {
  return new Promise((resolve, reject) => {
    _run(outputDir, port, timeout, mode, runner, (err, errors) => {
      if (err) {
        return reject(err)
      }
      resolve(errors)
    })
  })
}

async function _run (outputDir, port, timeout, mode, runner, callback) {
  let executionQueue = Promise.resolve()

  const browser = await puppeteer.launch()
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
      executionQueue.then(() => {
        executionQueue = null
        return browser.close()
      })
        .catch(callback)
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
      logRaw(await Promise.all(args))
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
    logRaw(args)
    maybeEnd()
  })
  await page.exposeFunction('polendinaWrite', (args) => {
    logWrite(args)
    maybeEnd()
  })

  const url = `http://localhost:${port}/?mode=${mode}&runner=${runner}`
  log(`Loading tests via ${url}`)
  if (runner === 'tape') {
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
