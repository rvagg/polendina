const path = require('path')
const glob = require('glob')

module.exports = function (env, options, runner) {
  const bundleRun = path.resolve(options.outputDir, runner)
  const testFiles = options._.reduce((p, c) => {
    return p.concat(glob.sync(c, { absolute: true }))
  }, [])

  // our globs may be fruitless
  if (!testFiles.length) {
    throw new Error(`No test files found: '${options._.join(' ')}'`)
  }

  testFiles.push(bundleRun)

  return {
    mode: 'development',
    entry: testFiles,
    output: {
      path: path.resolve(process.cwd(), options.outputDir),
      filename: 'bundle.js'
    },
    devtool: 'cheap-module-source-map',
    optimization: {
      minimize: false
    },
    resolve: {
      modules: [
        path.join(process.cwd(), 'node_modules'),
        path.join(__dirname, '../node_modules')
      ]
    },
    resolveLoader: {
      modules: [
        path.join(process.cwd(), 'node_modules'),
        path.join(__dirname, '../node_modules')
      ]
    },
    node: {
      dgram: 'empty',
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      dns: 'empty',
      child_process: 'empty'
    },
    module: {
      rules: [
        {
          test: testFiles,
          exclude: [/node_modules/, bundleRun],
          use: [{
            loader: require.resolve('./wrap-loader.js'),
            options: options
          }]
        }
      ]
    }
  }
}
