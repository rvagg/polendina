// in-browser setup and runner for Mocha, at end of bundle

// the browser bundle is UMD in mocha<=11 and an ES module in mocha>=12; both set
// the instance on the global, so that's our lowest common denominator
import 'mocha/mocha.js'
import { registry, executionQueue, log, setup } from './common-run.js'

async function runMocha () {
  const mochaLocal = globalThis.mocha
  mochaLocal.setup({ reporter: registry.argv.mochaReporter, ui: 'bdd' })
  // mocha@7 deprecated useColors()
  if (typeof mochaLocal.color === 'function') {
    mochaLocal.color(true)
  } else if (typeof mochaLocal.useColors === 'function') {
    mochaLocal.useColors(true)
  }

  // the well-behaved reporters, like spec, are easy to intercept
  mochaLocal.constructor.reporters.Base.consoleLog = log.info

  for (const mod of registry.tests) {
    await mod.load()
  }

  let errors = 0
  mochaLocal
    .run((_errors) => { errors = _errors })
    .on('end', (...args) => {
      executionQueue(() => globalThis.polendinaEnd(errors))
    })
}

setup().then(runMocha)
