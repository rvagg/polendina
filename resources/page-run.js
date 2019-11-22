/* globals self Worker */

const isLoadingWorker = /mode=worker/.test(window.location.search)
const _consoleLog = console ? console.log : () => {}

function runPage () {
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = 'bundle.js'
  document.head.appendChild(script)
}

function runWorker () {
  const worker = new Worker('bundle.js')
  worker.addEventListener('message', (msg) => {
    if (!Array.isArray(msg.data)) {
      return
    }

    if (!self[msg.data[0]]) {
      _consoleLog.apply(console, msg.data)
    } else {
      self[msg.data[0]].apply(null, msg.data.slice(1))
    }
  }, false)
}

if (isLoadingWorker) {
  runWorker()
} else {
  runPage()
}
