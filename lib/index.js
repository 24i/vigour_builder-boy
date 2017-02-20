const boy = require('./boy')
const fs = require('fs')
const chalk = require('chalk')
const { fill, logError } = require('./log')
// const ua = require('./ua')
const options = require('./options')
// const build = require('./build')

const errorHandler = (err, filepath) => {
  if (err.file) {
    console.log(`\n   ${chalk.red(err.message)}`)
    console.log(`   ${chalk.blue(err.file)}`)
    const line = err.message.match(/\((\d+):(\d+)\)/)
    if (line) logError(line, err)
  } else {
    console.log(err)
  }
  console.log(`👲  ${chalk.red('error')} ${chalk.blue(filepath)}`)
  console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')
}

const api = (path, opt, cb) => {
  if (typeof opt === 'function') {
    cb = opt
    opt = {}
  }
  opt = options(boy, opt)

  const start = (err, real, val) => {
    if (err) {
      errorHandler(err)
      cb(err)
    } else {
      let first
      let start

      if (val) {
        let arr = []
        for (let key in val) {
          arr.push(boy.add({ real: key, val: val[key] }))
        }
        start = Promise.all(arr).then(result => result[0])
      } else {
        start = boy.add({ real })
      }

      const update = (val, stamp, t) => {
        if (first) {
          first = false
          builder(real, (err, code) => {
            first = true
            cb(err, code, boy)
          }, opt)
        }
      }

      start.then(({ node, browser }) => {
        if (browser !== node) browser.get('result', {}).on(update) // fires too many listeners
        node.get('result', {}).on(update)
        builder({ node, browser }, (err, code) => {
          if (err) {
            setTimeout(() => { first = true }, 500)
          } else {
            first = true
          }
          cb(err, code, boy)
        }, opt)
      })
    }
  }

  if (typeof path === 'object') {
    start(false, Object.keys(path)[0], path)
  } else {
    fs.realpath(path, start)
  }
  return boy
}

const builder = ({ node, browser }, cb, opt) => {
  console.log(chalk.grey(fill('-', process.stdout.columns)))
  console.log(`👲  builder-boy build ${chalk.blue(node.key)}`)

  console.log(node)

  // var d = Date.now()
  // this is wrong!

  // build(start, file, opt).then(({ browser, inline, node }) => {
  //   const id = file.id()
  //   const results = { dependencies: {} }

  //   const anyExports = file.get('any', '').compute()
  //   const defaultExports = file.get('hasDefault', '').compute()

  //   if (browser) {
  //     if (anyExports) browser.code += `\n\nmodule.exports = ${id}_$ALL$`
  //     if (defaultExports) browser.code += `\n\nmodule.exports = ${id}`
  //     results.dependencies.browser = browser.deps
  //     results.browser = browser.code
  //   }

  //   if (node) {
  //     if (anyExports) node.code += `\n\nmodule.exports = ${id}_$ALL$`
  //     if (defaultExports) node.code += `\n\nmodule.exports = ${id}`
  //     if (node.ua && Object.keys(node.ua).length > 0) {
  //       // node.ua = ua(node)
  //       if (node.ua) {
  //         console.log('  ', chalk.blue(`generated ${
  //           chalk.green(node.ua.val.length)
  //         } code branches based on user agent`))
  //       }
  //     }
  //     results.dependencies.node = node.deps
  //     results.node = node.code
  //   }

  //   if (inline) {
  //     if (inline.env) {
  //       console.log(
  //         `   ${chalk.green('inline process.env')}`, '\n    ',
  //         Object.keys(inline.env).map(val => `${val}: ${inline.env[val]}`).join('\n     ')
  //       )
  //     }
  //     inline.code = `(function (global, process) { \n${inline.code};\n })(window, {})`
  //     results.dependencies.inline = inline.deps
  //     results.inline = inline.code
  //   }

  //   console.log(`👲  ${
  //     chalk.green('build')
  //   } ${
  //     chalk.blue(start)
  //   } in ${
  //     chalk.green(Date.now() - d)
  //   } ms`)
  //   console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')

  //   cb(null, results)
  // }).catch(err => {
  //   errorHandler(err, start)
  //   cb(err)
  // })
}

module.exports = api
