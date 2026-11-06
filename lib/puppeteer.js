import fs from 'fs'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import puppeteer from 'puppeteer'
import { log, logRaw, logWrite, flushLogs } from './log.js'

// package managers that block dependency install scripts skip puppeteer's
// browser download, so run its installer on first use instead
async function ensureBrowser () {
  if (fs.existsSync(await puppeteer.executablePath())) {
    return
  }
  const installer = createRequire(import.meta.url).resolve('puppeteer/install.mjs')
  const code = await new Promise((resolve, reject) => {
    spawn(process.execPath, [installer], { stdio: ['ignore', 2, 2] })
      .on('error', reject)
      .on('close', resolve)
  })
  if (code !== 0) {
    throw new Error(`puppeteer browser install exited with code ${code}`)
  }
}

export function run (outputDir, port, timeout, mode, runner, pageUrl) {
  let browser
  let page
  let lastCall
  let deadline
  let startup = pageUrl !== undefined
  let ended = false
  let endErrors
  let settled = false
  let settling

  let resolveRun
  let rejectRun
  const result = new Promise((resolve, reject) => {
    resolveRun = resolve
    rejectRun = reject
  })

  const finish = (err, errors) => {
    if (settling) {
      return settling
    }

    settled = true
    startup = false
    clearTimeout(lastCall)
    clearTimeout(deadline)

    settling = (async () => {
      try {
        flushLogs(true)
      } catch (error) {
        err ||= error
      }
      try {
        if (browser) {
          await browser.close()
        }
      } catch (error) {
        err ||= error
      }
      if (err) {
        throw err
      }
      return errors
    })()
    settling.then(resolveRun, rejectRun)
    return settling
  }

  const fail = (err) => {
    if (!settled) {
      finish(err)
    }
  }

  const scheduleEnd = () => {
    if (settled) {
      return
    }
    if (lastCall) {
      clearTimeout(lastCall)
    }
    lastCall = setTimeout(() => {
      finish(null, endErrors)
    }, 100)
  }

  async function start () {
    await ensureBrowser()
    browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    page = (await browser.pages())[0]

    page.on('error', (error) => console.error(error))
    page.on('pageerror', (error) => {
      if (pageUrl) {
        fail(new Error(`page error: ${error.message}`))
      } else {
        console.error(error)
      }
    })
    if (startup) {
      page.on('requestfailed', (request) => {
        if (!startup) {
          return
        }
        const failure = request.failure()
        fail(new Error(`request failed: ${request.url()}${failure ? ` (${failure.errorText})` : ''}`))
      })
      page.on('response', (response) => {
        if (startup && response.status() >= 400) {
          fail(new Error(`request failed: ${response.url()} (HTTP ${response.status()})`))
        }
      })
      await page.exposeFunction('polendinaReady', () => {
        startup = false
      })
    }

    await page.exposeFunction('polendinaEnd', (errors) => {
      if (!settled && !ended) {
        ended = true
        endErrors = errors
        scheduleEnd()
      }
    })
    await page.exposeFunction('polendinaLog', (args) => {
      logRaw(args.shift(), args.shift(), args)
      if (ended) {
        scheduleEnd()
      }
    })
    await page.exposeFunction('polendinaWrite', (args) => {
      logWrite(args)
      if (ended) {
        scheduleEnd()
      }
    })

    const origin = `http://localhost:${port}`
    const url = pageUrl ? `${origin}${pageUrl}` : `${origin}/?mode=${mode}&runner=${runner}`
    log(`Running ${runner} ${mode} tests with Puppeteer via\n                ${url}`)
    if (runner !== 'mocha') {
      log()
    }

    deadline = setTimeout(() => {
      fail(new Error(`timeout: tests did not finish cleanly after ${timeout} seconds`))
    }, timeout * 1000)
    deadline.unref()

    await page.goto(url)
    if (pageUrl) {
      if (new URL(page.url()).origin !== origin) {
        throw new Error(`page URL changed origin: ${page.url()}`)
      }
      await page.evaluate((url) => new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.charset = 'utf-8'
        script.src = url
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`could not load test bundle: ${url}`))
        document.head.appendChild(script)
      }), `${origin}/__polendina/bundle.js`)
    }
  }

  start().catch(fail)
  return result
}
