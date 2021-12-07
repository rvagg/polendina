/* globals WorkerGlobalScope ServiceWorkerGlobalScope */

const { assert } = require('chai')

module.exports = async function () {
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && global instanceof ServiceWorkerGlobalScope) {
    console.log('testing is in serviceworker')
    assert.strictEqual(typeof ServiceWorkerGlobalScope, 'function')
  } else if (typeof WorkerGlobalScope !== 'undefined' && global instanceof WorkerGlobalScope) {
    console.log('testing is in worker')
    assert.strictEqual(typeof WorkerGlobalScope, 'function')
  } else {
    console.log('testing is not in worker')
    assert.strictEqual(typeof WorkerGlobalScope, 'undefined')
  }
}
