import path from 'path'
import assert from 'assert'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(path.dirname(import.meta.url))
const cli = path.join(__dirname, '../polendina-cli.js')

export async function runCli (cwd, args) {
  return runCommand(`${cli} test*.js test/test*.js --cleanup ${args || ''}`, cwd)
}

export async function runCommand (command, cwd) {
  return new Promise((resolve, reject) => {
    const args = command.split(' ').filter(Boolean)
    execFile(process.execPath, args, { cwd }, (err, stdout, stderr) => {
      const code = err ? err.code : 0
      if (!code) {
        try {
          assert.strictEqual(stderr.toString(), '', 'no stderr')
        } catch (e) {
          return reject(e)
        }
      }
      const out = { stdout: stdout.toString(), stderr: stderr.toString(), code }
      resolve(out)
    })
  })
}
