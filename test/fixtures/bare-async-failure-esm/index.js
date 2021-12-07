export default function test () {
  return new Promise((resolve, reject) => setTimeout(() => resolve('bare test fixture'), 500))
}
