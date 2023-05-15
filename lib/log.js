import process from 'process'
import colors from 'ansi-colors'
import stripAnsi from 'strip-ansi'

const tty = process.stdout.isTTY && process.stderr.isTTY
let logQueue = []
let logSeq = -1

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

export function logRaw (type, seq, args) {
  if (!tty) {
    args = args.map((a) => typeof a === 'string' ? stripAnsi(a) : a)
  }
  logQueue.push({
    type: type === 'info' ? 'log' : type,
    args,
    seq
  })
  flushLogs(false)
}

export function flushLogs (force) {
  while (true) {
    const lastLen = logQueue.length
    logQueue = logQueue.filter((le) => {
      const next = le.seq === -1 || le.seq === logSeq + 1
      if (force || next) {
        console[le.type].apply(null, le.args)
        if (le.seq !== -1) {
          logSeq++
        }
      } else if (le.seq < logSeq) {
        throw new Error(`Unexpected log output sequencing (${le.seq}<${logSeq})`)
      }
      return !next
    })
    if (lastLen === logQueue.length) {
      break
    }
  }
  if (force) {
    logSeq = -1
  }
}

export function logWrite (args) {
  args = Array.isArray(args) ? args : [args]
  process.stdout.write.apply(process.stdout, args)
}
