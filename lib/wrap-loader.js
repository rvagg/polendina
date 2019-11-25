const path = require('path')

function loader (src) {
  return src
}

loader.pitch = function pitch (remainingRequest) {
  const argv = this.query

  // probably redundant
  if (remainingRequest === path.resolve(argv.outputDir, 'bundle-run.js')) {
    return
  }

  // wrap the test in a function that is only called when we want it called
  return `
    const registry = require(${JSON.stringify(`!!${path.resolve(argv.outputDir, 'test-registry.js')}`)})
    registry.argv = JSON.parse('${JSON.stringify(argv)}')
    registry.tests.push({
      name: JSON.parse('${JSON.stringify(path.relative(process.cwd(), remainingRequest))}'),
      load: () => { return require(${JSON.stringify(`!!${remainingRequest}`)}) }
    })
  `
}

module.exports = loader
