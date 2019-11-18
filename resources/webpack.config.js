const path = require('path')
const glob = require('glob')

module.exports = function (env, argv) {
  if (!argv.outputDir) {
    throw new Error('no --output-dir specified')
  }

  if (!argv.testFiles) {
    throw new Error('no --test-files specified')
  }

  const testFiles = [] // require.resolve('./mocha-overrides')]
    .concat(glob.sync(argv['test-files'], { absolute: true }))

  return {
    mode: 'development',
    entry: testFiles,
    output: {
      path: path.join(process.cwd(), argv.outputDir),
      filename: 'bundle.js'
    },
    devtool: 'cheap-module-source-map',
    optimization: {
      minimize: false
    },
    resolve: {
      modules: [
        path.join(__dirname, '../node_modules'),
        path.join(process.cwd(), 'node_modules')
      ]
    },
    resolveLoader: {
      modules: [
        path.join(__dirname, '../node_modules')
      ]
    },
    module: {
      rules: [
        {
          test: testFiles,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('../mocha-loader.js'), // 'mocha-loader',
              options: {
                reporter: 'spec'
              }
            }
          ]
        }
      ]
    }
  }
}
