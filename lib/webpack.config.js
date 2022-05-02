import path from 'path'
import glob from 'glob'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

export function webpackConfig (env, options, runner) {
  const bundleRun = path.normalize(path.resolve(options.outputDir, runner))
  const testFiles = options._.reduce((p, c) => {
    return p.concat(glob.sync(c, { absolute: true }))
  }, []).map(path.normalize)

  // our globs may be fruitless
  if (!testFiles.length) {
    throw new Error(`No test files found: '${options._.join(' ')}'`)
  }

  testFiles.push(bundleRun)

  return {
    mode: 'development',
    context: process.cwd(),
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
    module: {
      exprContextCritical: false, // mocha stil has a require.resolve resulting in a noisy warning
      rules: [
        {
          test: testFiles,
          exclude: [/node_modules/, bundleRun],
          type: 'javascript/auto', // needed so the wrap-loader can get a sync require() in
          use: [{
            loader: path.resolve(__dirname, 'wrap-loader.cjs'),
            options: options
          }]
        }
      ]
    }
  }
}
