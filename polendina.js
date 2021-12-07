const { promisify } = require('util')
const path = require('path')
const fs = require('fs').promises
const http = require('http')
const st = require('st')
const rimraf = promisify(require('rimraf'))
const webpack = promisify(require('webpack'))
const { merge } = require('webpack-merge')
const puppeteer = require('./lib/puppeteer')

class Polendina {
  constructor (options) {
    this._options = options

    if (this._options.runner === 'mocha') {
      this._runnerModule = 'mocha-run.js'
    } else if (this._options.runner === 'tape') {
      this._runnerModule = 'tape-run.js'
    } else if (this._options.runner.startsWith('bare-')) {
      this._runnerModule = 'bare-run.js'
    } else {
      throw new Error(`Unknown runner ${this._options.runner}`)
    }

    this._mode = {
      page: this._options.page,
      worker: this._options.worker,
      serviceworker: this._options.serviceworker
    }

    this.outputDir = path.resolve(process.cwd(), this._options.outputDir)
  }

  async build () {
    let webpackConfig = require('./lib/webpack.config')(process.env, this._options, this._runnerModule)

    if (this._options.runner === 'tape') {
      webpackConfig = merge(webpackConfig, {
        resolve: {
          fallback: {
            stream: path.join(__dirname, 'node_modules', 'stream-browserify'),
            path: path.join(__dirname, 'node_modules', 'path-browserify')
          }
        },
        plugins: [
          new webpack.ProvidePlugin({
            process: 'process/browser'
          })
        ]
      })
    }

    if (this._options.webpackConfig) {
      const userConfig = require(path.join(process.cwd(), this._options.webpackConfig))
      webpackConfig = merge(webpackConfig, userConfig)
    }

    await fs.mkdir(this.outputDir, { recursive: true })
    const copyFiles = ['index.html', 'test-registry.js', 'page-run.js', 'common-run.js', this._runnerModule]
    if (this._options.runner.startsWith('bare-')) {
      copyFiles.push('bare.js')
    }
    await Promise.all(copyFiles.map((file) => {
      return fs.copyFile(path.join(__dirname, 'resources', file), path.join(this.outputDir, file))
    }))

    const stats = await webpack(webpackConfig)
    const info = stats.toJson()

    if (stats.hasErrors()) {
      console.error(info.errors)
      process.exit(1)
    }

    if (stats.hasWarnings()) {
      for (const warning of info.warnings) {
        console.warn('Bundling warning: ', warning)
      }
    }

    this.bundleFile = info.assetsByChunkName.main[0]

    if (this._options.stats) {
      this.statsFile = path.join(webpackConfig.output.path, 'webpack-stats.json')
      await fs.writeFile(this.statsFile, JSON.stringify(info), 'utf8')
    }
  }

  async run () {
    let errors
    for (const m of ['page', 'worker', 'serviceworker']) {
      if (this._mode[m]) {
        errors = await this._executeMode(m)
        if (errors) {
          break
        }
      }
    }
    return errors
  }

  async cleanup () {
    // TODO: let's be more careful .. only delete dir if it contains just the files we created
    return rimraf(this.outputDir)
  }

  _executeMode (mode) {
    const mount = st({
      path: this.outputDir,
      index: 'index.html',
      url: '/',
      cache: false
    })
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        mount(req, res, () => {
          res.statusCode = 404
          res.end('Nope')
        })
      })
      server.on('error', reject)
      server.listen(() => {
        const port = server.address().port
        puppeteer(this.outputDir, port, this._options.timeout, mode, this._options.runner, this._options.coverage)
          .then((errors) => {
            if (this._options.runner !== 'mocha') {
              console.log() // whitespace pls
            }
            server.close(() => {
              resolve(errors)
            })
          })
          .catch(reject)
      })
    })
  }
}

module.exports = Polendina
