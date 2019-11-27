class BareRunner {
  constructor (log, tests) {
    this.log = log
    this.tests = tests
  }

  async runBare (exec) {
    for (const mod of this.tests) {
      try {
        await exec(mod)
      } catch (err) {
        await this.log.error(err.stack || String(err))
        if (err.details) {
          await this.log.error(String(err.details))
        }
        return true
      }
    }

    return false
  }

  async execBare (name, fn, indent) {
    try {
      await fn()
      await this.log.info(`${indent ? '  ' : ''}  \u001b[32m✔\u001b[39m ${name}`)
    } catch (err) {
      this.log.info(`${indent ? '  ' : ''}  \u001b[31m✘\u001b[39m ${name}`)
      throw err
    }
  }

  async runBareSync () {
    return this.runBare((mod) => this.execBare(mod.name, mod.load))
  }

  async runBareAsync () {
    return this.runBare(async (mod) => {
      const exp = mod.load()
      if (typeof exp === 'function') {
        return this.execBare(mod.name, exp)
      }
      await this.log.info(`  ${mod.name}`)
      let found = false
      for (const name in exp) {
        const fn = exp[name]
        if (typeof fn === 'function') {
          found = true
          await this.execBare(name, fn, true)
        }
      }
      if (!found) {
        throw new Error(`Did not find any async test function exports in ${mod.name}`)
      }
    })
  }
}

module.exports = BareRunner
