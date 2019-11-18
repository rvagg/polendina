const defaultOptions = {
  reporter: 'spec'
}

function loader (src) {
  return src
}

loader.pitch = function pitch (remainingRequest) {
  const options = Object.assign(defaultOptions, this.query)

  return `
    require("!script-loader!mocha/mocha.js");
    mocha.setup({ reporter: '${options.reporter}', ui: 'bdd' })
    require(${JSON.stringify(`!!${remainingRequest}`)})
  `
  // require(${JSON.stringify(`!!${require.resolve('./resources/mocha-run.js')}`)})
}

module.exports = loader
