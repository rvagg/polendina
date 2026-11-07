import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import st from 'st'
import { rimraf } from 'rimraf'
import _webpack from 'webpack'
import { merge } from 'webpack-merge'
import { run as puppeteer } from './lib/puppeteer.js'
import { webpackConfig } from './lib/webpack.config.js'

const webpack = promisify(_webpack)

const __dirname = fileURLToPath(path.dirname(import.meta.url))
// polendina's own dependencies are found via Node resolution from this file,
// not by path: in a consumer install npm hoists them out of ./node_modules
const require = createRequire(import.meta.url)

export class Polendina {
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
    let config = webpackConfig(process.env, this._options, this._runnerModule)

    if (this._options.runner === 'tape') {
      config = merge(config, {
        resolve: {
          fallback: {
            stream: require.resolve('stream-browserify'),
            path: require.resolve('path-browserify'),
            fs: false
          }
        },
        plugins: [
          new webpack.ProvidePlugin({
            process: require.resolve('process/browser')
          })
        ]
      })
    }

    if (this._options.webpackConfig) {
      const userConfig = (await import(`file://${path.join(process.cwd(), this._options.webpackConfig)}`)).default
      config = merge(config, userConfig)
    }

    await fs.promises.mkdir(this.outputDir, { recursive: true })
    const copyFiles = ['index.html', 'test-registry.cjs', 'page-run.js', 'common-run.js', this._runnerModule]
    if (this._options.runner.startsWith('bare-')) {
      copyFiles.push('bare.js')
    }
    await Promise.all(copyFiles.map((file) => {
      return fs.promises.copyFile(path.join(__dirname, 'resources', file), path.join(this.outputDir, file))
    }))

    const stats = await webpack(config)
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
      this.statsFile = path.join(config.output.path, 'webpack-stats.json')
      await fs.promises.writeFile(this.statsFile, JSON.stringify(info), 'utf8')
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

  async _closeServer (server) {
    if (!server.listening) {
      return
    }
    await new Promise((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve())
    })
  }

  _redirectDirectory (req, res, dir, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }
    let url
    let pathname
    try {
      url = new URL(req.url, 'http://localhost')
      pathname = decodeURIComponent(url.pathname).replace(/\\/g, '/')
    } catch {
      return next()
    }
    if (url.pathname.endsWith('/') || url.pathname.startsWith('//') || /(^|\/)\./.test(pathname)) {
      return next()
    }
    const filename = path.resolve(dir, '.' + pathname)
    const relative = path.relative(dir, filename)
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      return next()
    }
    fs.stat(filename, (err, stat) => {
      if (err || !stat.isDirectory()) {
        return next()
      }
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` })
      res.end()
    })
  }

  async _executeMode (mode) {
    const outputMount = st({
      path: this.outputDir,
      index: 'index.html',
      url: this._options.static ? '/__polendina/' : '/',
      cache: false
    })
    const staticDir = this._options.static && path.resolve(process.cwd(), this._options.static)
    const staticMount = staticDir && st({
      path: staticDir,
      index: 'index.html',
      url: '/',
      cache: false
    })
    const server = http.createServer((req, res) => {
      const mount = staticMount && req.url.startsWith('/__polendina/')
        ? outputMount
        : staticMount || outputMount
      const serve = () => mount(req, res, () => {
        res.statusCode = 404
        res.end('Nope')
      })
      if (mount === staticMount) {
        this._redirectDirectory(req, res, staticDir, serve)
      } else {
        serve()
      }
    })

    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(() => {
          server.off('error', reject)
          resolve()
        })
      })
      const port = server.address().port
      const errors = await puppeteer(
        this.outputDir,
        port,
        this._options.timeout,
        mode,
        this._options.runner,
        this._options.pageUrl
      )
      if (this._options.runner !== 'mocha') {
        console.log() // whitespace pls
      }
      return errors
    } finally {
      await this._closeServer(server)
    }
  }
}
