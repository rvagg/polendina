import { greeting } from './sibling.js'

const app = document.querySelector('#app')
const increment = document.querySelector('#increment')
let count = 0

app.textContent = `${greeting} ${window.location.search} ${window.location.hash}`
window.pageState = { greeting, query: window.location.search, hash: window.location.hash }

increment.addEventListener('click', () => {
  count += 1
  app.dataset.count = String(count)
})

window.triggerAsyncPageError = () => new Promise((resolve) => {
  setTimeout(() => {
    resolve()
    throw new Error('asynchronous page error')
  }, 0)
})

window.holdPageTestOpen = () => new Promise(() => {})
