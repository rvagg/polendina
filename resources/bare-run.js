// in-browser test runner for bare-sync and bare-async, at end of bundle

const { registry, executionQueue, log, setup } = require('./common-run')

async function runBare (exec) {
  let errors = 0
  for (const mod of registry.tests) {
    try {
      await exec(mod)
    } catch (err) {
      await log.error(err.stack || String(err))
      if (err.details) {
        await log.error(String(err.details))
      }
      errors = 1
      break
    }
  }
  executionQueue(() => global.polendinaEnd(errors))
}

async function execBare (name, fn, indent) {
  try {
    await fn()
    await log.info(`${indent ? '  ' : ''}  \u001b[32m✔\u001b[39m ${name}`)
  } catch (err) {
    log.info(`${indent ? '  ' : ''}  \u001b[31m✘\u001b[39m ${name}`)
    throw err
  }
}

async function runBareSync () {
  return runBare((mod) => execBare(mod.name, mod.load))
}

async function runBareAsync () {
  return runBare(async (mod) => {
    const exp = mod.load()
    if (typeof exp === 'function') {
      return execBare(mod.name, exp)
    }
    await log.info(`  ${mod.name}`)
    for (const name in exp) {
      const fn = exp[name]
      if (typeof fn === 'function') {
        await execBare(name, fn, true)
      }
    }
  })
}

setup().then(() => {
  if (registry.argv.runner === 'bare-sync') {
    return runBareSync()
  }
  if (registry.argv.runner === 'bare-async') {
    return runBareAsync()
  }
})
