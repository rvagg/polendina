/* globals WorkerGlobalScope ServiceWorkerGlobalScope clients */

import { registry } from './test-registry.js'

const inPage =
  typeof window !== 'undefined' &&
  window.location &&
  typeof WorkerGlobalScope === 'undefined'
const inServiceWorker = !inPage &&
  typeof ServiceWorkerGlobalScope !== 'undefined' &&
  globalThis instanceof ServiceWorkerGlobalScope
const inWorker = !inPage && !inServiceWorker &&
  typeof WorkerGlobalScope !== 'undefined' &&
  globalThis instanceof WorkerGlobalScope
let _executionQueue = Promise.resolve()
let logSeq = 0

export { registry }
export function executionQueue (fn) {
  _executionQueue = _executionQueue.then(fn)
  return _executionQueue
}

export const log = {
  info: (...args) => {
    executionQueue(() => globalThis.polendinaLog(['info', logSeq++].concat(args)))
    return executionQueue
  },
  // TODO
  warn: (...args) => {
    executionQueue(() => globalThis.polendinaLog(['warn', logSeq++].concat(args)))
    return executionQueue
  },
  // TODO
  error: (...args) => {
    executionQueue(() => globalThis.polendinaLog(['error', logSeq++].concat(args)))
    return executionQueue
  }
}

function setupWorkerGlobals () {
  globalThis.polendinaLog = async function (...args) {
    globalThis.postMessage(['polendinaLog'].concat(args))
  }

  globalThis.polendinaWrite = async function (...args) {
    globalThis.postMessage(['polendinaWrite'].concat(args))
  }

  globalThis.polendinaEnd = async function (...args) {
    globalThis.postMessage(['polendinaEnd'].concat(args))
  }
}

function setupServiceWorkerGlobals () {
  async function _postMessage (msg) {
    for (const client of await clients.matchAll()) {
      client.postMessage(msg)
    }
  }

  globalThis.polendinaLog = async function (...args) {
    _postMessage(['polendinaLog'].concat(args))
  }

  globalThis.polendinaWrite = async function (...args) {
    _postMessage(['polendinaWrite'].concat(args))
  }

  globalThis.polendinaEnd = async function (...args) {
    _postMessage(['polendinaEnd'].concat(args))
  }
}

function setupLogging () {
  console.log = function (...args) {
    try {
      if (/BrowserStdout.*write/.test(new Error().stack)) {
        // the BrowserStdout polyfill (Mocha ships with among others) that converts
        // process.stdout.write() to console.log()
        // so we strip out the extra \n that necessarily inserts
        // args[0] = args[0].replace(/\n$/, '')
        executionQueue(() => globalThis.polendinaWrite(args))
        return
      }
    } catch (err) {}
    log.info.apply(null, args)
  }

  // TODO: differentiate
  console.warn = log.warn
  console.error = log.error
}

export async function setup () {
  if (inWorker) {
    setupWorkerGlobals()
  } else if (inServiceWorker) {
    await new Promise((resolve, reject) => {
      globalThis.addEventListener('activate', (event) => {
        event.waitUntil(globalThis.clients.claim())
        setupServiceWorkerGlobals()
        resolve()
      })
    })
  }

  setupLogging()
}
