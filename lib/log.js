const colors = require('ansi-colors')
const stripAnsi = require('strip-ansi')
const tty = process.stdout.isTTY && process.stderr.isTTY

function brand (error) {
  const brand = 'polendina ☞'
  return tty ? `${colors[error ? 'red' : 'green'](brand)}` : brand
}

function log (msg) {
  if (msg === undefined) {
    return console.log()
  }
  console.log(`  ${brand()}   ${tty ? colors.gray.italic(msg) : msg}`)
}

function error (msg) {
  console.log(`  ${brand(true)}   ${tty ? colors.gray.italic(msg) : msg}`)
}

function logRaw (args) {
  if (!tty) {
    args = args.map((a) => typeof a === 'string' ? stripAnsi(a) : a)
  }
  console.log.apply(null, args)
}

function logWrite (args) {
  args = Array.isArray(args) ? args : [args]
  process.stdout.write.apply(process.stdout, args)
}

module.exports = { log, error, logRaw, logWrite }
