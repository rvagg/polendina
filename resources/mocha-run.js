// in-browser setup and runner for Mocha, at end of bundle

const mochaExport = require('mocha/mocha.js')
const { registry, executionQueue, log, setup } = require('./common-run')

function runMocha () {
  // mocha@8 exports what we want, mocha@7 sets a global
  const mochaLocal = global.mocha ? global.mocha : mochaExport
  global._mocha = mochaLocal
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
    mod.load()
  }

  let errors = 0
  mochaLocal
    .run((_errors) => { errors = _errors })
    .on('end', (...args) => {
      executionQueue(() => global.polendinaEnd(errors))
    })
}

setup().then(runMocha)
