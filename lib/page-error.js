export class PageError extends Error {
  constructor (message, details) {
    super(message)
    this.name = 'PageError'
    this.details = details
  }
}
