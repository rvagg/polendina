// Mocha global fixtures. Packs polendina and installs it into temporary
// consumer directories outside the repository, one per test runner, each with
// only the frameworks that runner's fixtures import at the versions in
// test/consumer/package.json, then copies test/fixtures in. npm hoists polendina's dependencies into each consumer's node_modules,
// the layout a real install has and one the fixtures cannot produce from
// inside this tree. Keeping the runners apart means no runner's dependency
// tree can shadow or nest another's.
//
// Tests find the consumers through POLENDINA_CONSUMERS, a JSON object of
// name to directory. Set POLENDINA_KEEP_CONSUMERS to leave them behind.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(path.dirname(import.meta.url))
const root = path.join(__dirname, '..')
const puppeteerVersion = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/puppeteer/package.json'))).version
const template = JSON.parse(fs.readFileSync(path.join(__dirname, 'consumer/package.json'))).devDependencies

// consumer name to the packages it installs alongside polendina; a bare name
// takes its version range from test/consumer/package.json, name@range pins one
const variants = {
  mocha: ['mocha', 'chai'],
  mocha11: ['mocha@11', 'chai'],
  tape: ['tape'],
  bare: ['chai']
}

const consumers = {}

function dependency (pkg) {
  const at = pkg.indexOf('@', 1)
  if (at > 0) {
    return [pkg.slice(0, at), pkg.slice(at + 1)]
  }
  if (!template[pkg]) {
    throw new Error(`${pkg} is not in test/consumer/package.json`)
  }
  return [pkg, template[pkg]]
}

function sh (command, cwd) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' }
    exec(command, { cwd, env }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`${command}\n${stderr}`))
      }
      resolve(stdout.toString())
    })
  })
}

async function installConsumer (name, tarball, packages) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `polendina-consumer-${name}-`))
  const pkg = {
    name: `polendina-consumer-${name}`,
    private: true,
    devDependencies: {
      polendina: `file:${tarball}`,
      puppeteer: puppeteerVersion,
      ...Object.fromEntries(packages.map(dependency))
    }
  }
  await fs.promises.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
  await fs.promises.cp(path.join(__dirname, 'fixtures'), path.join(dir, 'fixtures'), {
    recursive: true,
    filter: (src) => path.basename(src) !== 'node_modules'
  })
  await sh('npm install --no-audit --no-fund --no-package-lock --prefer-offline', dir)
  return dir
}

export async function mochaGlobalSetup () {
  const packDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polendina-pack-'))
  // npm 12 reports an object keyed by package name, earlier versions an array
  const [{ filename }] = Object.values(JSON.parse(await sh(`npm pack --json --pack-destination "${packDir}"`, root)))
  const tarball = path.join(packDir, filename)
  await Promise.all(Object.entries(variants).map(async ([name, packages]) => {
    consumers[name] = await installConsumer(name, tarball, packages)
  }))
  await fs.promises.rm(packDir, { recursive: true, force: true })
  process.env.POLENDINA_CONSUMERS = JSON.stringify(consumers)
}

export async function mochaGlobalTeardown () {
  if (process.env.POLENDINA_KEEP_CONSUMERS) {
    console.log('Keeping consumers:', consumers)
    return
  }
  for (const dir of Object.values(consumers)) {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
