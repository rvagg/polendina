const path = require('path')
const { pathToFileURL } = require('url')
const puppeteer = require('puppeteer')
const { error, logRaw, logWrite } = require('./log')

async function run (outputDir, timeout) {
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

  function end () {
    lastCall = setTimeout(() => {
      executionQueue.then(() => {
        executionQueue = null
        browser.close()
      })
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

  await page.exposeFunction('polendinaEnd', () => {
    end()
  })
  await page.exposeFunction('polendinaLog', (args) => {
    logRaw(args)
    maybeEnd()
  })
  await page.exposeFunction('polendinaWrite', (args) => {
    logWrite(args)
    maybeEnd()
  })

  await page.goto(pathToFileURL(path.join(process.cwd(), outputDir, 'index.html')).toString())

  setTimeout(() => {
    error(`Error, timeout: tests did not finish cleanly after ${timeout} seconds`)
    browser.close()
    process.exit(1)
  }, timeout * 1000).unref()
}

module.exports = run
