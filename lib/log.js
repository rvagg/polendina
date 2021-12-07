import process from 'process'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'

const tty = process.stdout.isTTY && process.stderr.isTTY

function brand (error) {
  const brand = 'polendina ☞'
  return tty ? `${colors[error ? 'red' : 'green'](brand)}` : brand
}

export function log (msg) {
  if (msg === undefined) {
    return console.log()
  }
  console.log(`  ${brand()}   ${tty ? colors.gray.italic(msg) : msg}`)
}

export function error (msg) {
  console.log(`  ${brand(true)}   ${tty ? colors.gray.italic(msg) : msg}`)
}

export function logRaw (type, args) {
  if (!tty) {
    args = args.map((a) => typeof a === 'string' ? stripAnsi(a) : a)
  }
  console[type === 'info' ? 'log' : type].apply(null, args)
}

export function logWrite (args) {
  args = Array.isArray(args) ? args : [args]
  process.stdout.write.apply(process.stdout, args)
}
