import path from 'path'
import assert from 'assert'
import { execFile } from 'child_process'

// consumers installed by setup.js, one per runner, named by its variants table
export function consumers () {
  return JSON.parse(process.env.POLENDINA_CONSUMERS)
}

export function consumer (name) {
  const dir = consumers()[name]
  if (!dir) {
    throw new Error(`no consumer named ${name}`)
  }
  return dir
}

// runs the installed polendina CLI from inside a copied fixture directory;
// resolved at call time because consumers exist only once setup.js has run
export async function runCli (consumerName, fixture, args = []) {
  const dir = consumer(consumerName)
  const cli = path.join(dir, 'node_modules/polendina/polendina-cli.js')
  return runCommand(cli, ['test*.js', 'test/test*.js', '--cleanup', ...args], path.join(dir, 'fixtures', fixture))
}

export async function runNodeCli (consumerName, fixture, mode) {
  const dir = consumer(consumerName)
  const cli = path.join(dir, 'node_modules/polendina/polendina-node-cli.js')
  return runCommand(cli, [mode, 'test*.js'], path.join(dir, 'fixtures', fixture))
}

export async function runCommand (script, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], { cwd }, (err, stdout, stderr) => {
      const code = err ? err.code : 0
      if (!code) {
        try {
          assert.strictEqual(stderr.toString(), '', 'no stderr')
        } catch (e) {
          return reject(e)
        }
      }
      resolve({ stdout: stdout.toString(), stderr: stderr.toString(), code })
    })
  })
}
