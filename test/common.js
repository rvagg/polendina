const path = require('path')
const assert = require('assert')
const { execFile } = require('child_process')
const cli = path.join(__dirname, '../polendina.js')

async function runCli (cwd, args) {
  return new Promise((resolve, reject) => {
    args = `${cli} test*.js --cleanup ${args || ''}`.split(' ').filter(Boolean)
    execFile(process.execPath, args, { cwd }, (err, stdout, stderr) => {
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

module.exports.runCli = runCli
