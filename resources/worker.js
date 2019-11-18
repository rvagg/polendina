function polendinaLog (...args) {
  postMessage(['polendinaLog'].concat(args))
}

function polendinaWrite (...args) {
  postMessage(['polendinaWrite'].concat(args))
}

function polendinaEnd (...args) {
  postMessage(['polendinaEnd'].concat(args))
}

importScripts('bundle.js')
