const exclude = require('../exclude')
const chalk = require('chalk')

exports.condition = file => file.external || exclude(file)

exports.parse = file => new Promise((resolve, reject) => {
  const id = file.id.compute()
  if (exclude(file)) {
    const result = `var ${id} = require('${file.external || file.key}')`
    // can do fallbacks here (for example for buildins)
    resolve({ result, es5: result })
  } else {
    const js = file.root().plugins.js
    resolve(js.parse(file))
  }
})

const inline = (file, result, type, opts) => type === 'inline' ||
  opts.inline && opts.inline.includes(file.external) ||
  file.virtual

exports.compileDeps = inline

console.log(inline)

exports.compile = (file, result, type, opts, traversed, module) => {
  const id = file.id.compute()
  if (traversed[id] && traversed[id].stamp === module.stamp) {
    // need to do an array if we want to choose the best version
    const version = chalk.blue(traversed[id].file.version)
    const colored = chalk.blue(type)
    let str = `   ${colored} double ${chalk.blue(file.external)} use ${version}`
    if (traversed[id].file.version !== file.version) {
      str += ` over ${chalk.blue(file.version)}`
    }
    console.log(str)
    return
  }
  traversed[id] = { file, stamp: module.stamp }
  if (inline(file, result, type, opts)) {
    result.code += '\n' + (type === 'inline' ? file.es5.compute() : file.result.compute())
  } else {
    if (file.external === 'vigour-ua/navigator') {
      if (!result.ua) result.ua = {}
      result.ua.file = {
        val: file.id.compute(),
        start: result.code.length
      }
      result.code += '\n' + `var ${id} = require('${file.external}')`
      result.ua.file.end = result.code.length
    } else {
      result.code += '\n' + `var ${id} = require('${file.external}')`
    }
  }
}
