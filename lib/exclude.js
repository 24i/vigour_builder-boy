const builtin = require('is-builtin-module')

const defaults = [
  'uws',
  'redis',
  'promise-polyfill',
  'regenerator-runtime/runtime',
  'websocket',
  'html-element/global-shim',
  'tape' // browserify it (make browserify plugin)
]

// better to use path
module.exports = path => {
  // const file.key

  // if (builtin(modulename)) {
  // if (file.root().__exclude__) {

  // }

}
