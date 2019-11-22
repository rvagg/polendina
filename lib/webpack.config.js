const path = require('path')
const glob = require('glob')

module.exports = function (env, argv) {
  if (!argv.outputDir) {
    throw new Error('no --output-dir specified')
  }

  if (!argv._) {
    throw new Error('no --test-files specified')
  }

  const bundleRun = path.resolve(argv.outputDir, 'bundle-run.js')
  const testFiles = argv._.reduce((p, c) => {
    return p.concat(glob.sync(c, { absolute: true }))
  }, []).concat([bundleRun])

  return {
    mode: 'development',
    entry: testFiles,
    output: {
      path: path.resolve(process.cwd(), argv.outputDir),
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
    node: {
      fs: 'empty'
    },
    module: {
      rules: [{
        test: testFiles,
        exclude: [/node_modules/, bundleRun],
        use: [{
          loader: require.resolve('./wrap-loader.js'),
          options: argv
        }]
      }]
    }
  }
}
