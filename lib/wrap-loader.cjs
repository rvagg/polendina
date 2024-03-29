// webpack loader for test files, wrap them in a function and "register" them with
// a central registry so they can be pulled out by the test runner and loaded at
// an appropriate time. Some tests will execute straight away if we don't defer with
// a function wrap but we need better control over timing.

const path = require('path')

function wrapLoader (src) {
  return src
}

wrapLoader.pitch = function pitch (remainingRequest) {
  const argv = this.query

  // probably redundant
  if (remainingRequest === path.resolve(argv.outputDir, 'bundle-run.js')) {
    return
  }

  // wrap the test in a function that is only called when we want it called
  return `
    const { registry } = require('./${path.relative(path.dirname(remainingRequest), path.resolve(argv.outputDir, 'test-registry.cjs')).replace(/\\/g, '/')}')
    registry.argv = JSON.parse(${JSON.stringify(JSON.stringify(argv))})
    registry.tests.push({
      name: JSON.parse('${JSON.stringify(path.normalize(path.relative(process.cwd(), remainingRequest))).replace(/\\+/g, '/')}'),
      load: () => { return require(${JSON.stringify(`!!./${path.basename(remainingRequest)}`)}) }
    })
    module.exports = {}
  `
}

module.exports = wrapLoader
