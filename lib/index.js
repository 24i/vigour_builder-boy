// const browserresolve = require('browser-resolve')
const boy = require('./struct')
const fs = require('fs')
const chalk = require('chalk')
const hash = require('string-hash')

const buildBoy = (path, opt, cb) => {
  if (typeof opt === 'function') cb = opt
  // opts -- dest, and watch: false
  fs.realpath(path, (err, real) => { // eslint-disable-line
    var f
    boy.set({ [ real ]: true })
    boy.get([ real, 'result' ], {}).on((val, stamp, t) => {
      if (f) {
        f = false
        moreBuild(real, (err, code) => {
          f = true
          cb(err, code)
        })
      }
    })
    moreBuild(real, (err, code) => {
      if (err) {
        setTimeout(() => { f = true }, 20)
      } else {
        f = true
      }
      cb(err, code)
    })
  })
  return boy
}

const fill = (str, len) => (new Array(len)).join(str)

const moreBuild = (real, rdy) => {
  console.log(chalk.grey(fill('-', process.stdout.columns)))
  console.log(`👲  builder-boy build ${chalk.blue(real)}`)
  var d = Date.now()
  const file = boy.get(real, {})

  // buildBrowser

  build(real, file).then(result => {
    // console.log('yo yo yo', result)
    var node = result[0]
    var browser = result[1]

    console.log(`👲  ${chalk.green('build')} in ${chalk.green(Date.now() - d)} ms`)
    console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')
    // console.log(result.slice(-20))
    const id = '$' + hash(file.key) // can be memoized
    // node build
    if (file.get('any', '').compute()) {
      console.log('gots any!', file.get('any').compute())
      node += `\n\nmodule.exports = ${id}_$ALL$`
    } else if (file.get('default', '').compute()) {
      console.log('gots default!')
      node += `\n\nmodule.exports = ${id}`
    }

    // now browser build
    rdy(null, { node, browser })
  }).catch(err => {
    if (err.file) {
      console.log(`\n   ${chalk.red(err.message)}`)
      console.log(`   ${chalk.blue(err.file)}`)
      const line = err.message.match(/\((\d+):(\d+)\)/)
      if (line) {
        const nr = 1 * line[1]
        const char = 1 * line[2]
        const file = fs.readFileSync(err.file)
        const lines = file.toString().split('\n')
        lines.forEach((val, i) => {
          if (i > nr - 5 && i < nr + 5) {
            var linenr = i + ' '
            linenr = chalk.grey((fill(' ', 5 - linenr.length)) + linenr)
            if (i === nr - 1) {
              console.log(`   ${linenr} ${chalk.red(val)}`)
              console.log(`   ${fill(' ', char - 1 + 7)}${chalk.red('^')}`)
            } else {
              console.log(`   ${linenr} ${val}`)
            }
          }
        })
        console.log('\n')
      }
    }
    console.log(`👲  ${chalk.red('error')} in ${chalk.red(Date.now() - d)} ms`)
    console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')
    rdy(err)
  })
}

const build = (name, root) => Promise.all([
  buildNormal(name, root),
  buildBrowser(name, root)
])

// now lets start doing external deps as well
// here were going to handle circulair deps
const buildNormal = (name, root, traversed = {}) => {
  var result
  const file = boy.get(name, {})
  return file.get('result', '')
    .once(val => {
      result = val.compute()
      return result
    })
    .then(() => Promise.all(
      file.get('dependencies', {}).map(({ key }) => new Promise(resolve => {
        if (!(key in traversed)) {
          traversed[key] = true
          resolve(buildNormal(key, root, traversed))
        } else {
          resolve('')
        }
      }))
    ))
    .then(resolved => {
      resolved.forEach(val => {
        if (val instanceof Error) {
          throw val
        }
      })
      if (result instanceof Error) {
        return result
      }
      // lets return browser and non browser or make extra build function that does browser
      return `${resolved.join('\n')}\n// ${name}\n${result}`
    })
}

const buildBrowser = (name, root, traversed = {}) => {
  var result
  const file = boy.get(name, {})
  return file.get('result', '')
  .once(val => {
    result = val.compute()
    return result
  })
  .then(() => Promise.all(
    file.get('dependencies', {}).map(({ key }) => new Promise(resolve => {
      if (!(key in traversed)) {
        traversed[key] = true
        resolve(buildBrowser(key, root, traversed))
      } else {
        resolve('')
      }
    }))
  ))
  .then(resolved => {
    resolved.forEach(val => {
      if (val instanceof Error) {
        throw val
      }
    })
    if (result instanceof Error) {
      return result
    }
    // lets return browser and non browser or make extra build function that does browser
    return `${resolved.join('\n')}\n// ${name}\n${result}`
  })
}

module.exports = buildBoy
