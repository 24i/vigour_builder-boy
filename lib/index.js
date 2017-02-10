// const browserresolve = require('browser-resolve')
const boy = require('./struct')
const fs = require('fs')
const chalk = require('chalk')
const hash = require('string-hash')
const { isExternal, fill, logError } = require('./util')

const buildBoy = (path, opt, cb) => {
  if (typeof opt === 'function') cb = opt
    // opts -- dest, and watch: false
  fs.realpath(path, (err, real) => { // eslint-disable-line
    if (!real) throw new Error('no entry ' + path) // make this error nice
    var f
    boy.set({ [real]: true })
    boy.get([real, 'result'], {}).on((val, stamp, t) => {
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
        setTimeout(() => { f = true }, 500)
      } else {
        f = true
      }
      cb(err, code)
    })
  })
  return boy
}

const moreBuild = (real, rdy) => {
  console.log(chalk.grey(fill('-', process.stdout.columns)))
  console.log(`👲  builder-boy build ${chalk.blue(real)}`)
  var d = Date.now()
  const file = boy.get(real, {})

  build(real, file).then(([ node, { browserNode = { code: '' }, inlineBrowser = { code: '' } } ]) => {
    console.log(`👲  ${chalk.green('build')} in ${chalk.green(Date.now() - d)} ms`)
    console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')
    const id = '$' + hash(file.key) // can be memoized
    if (file.get('any', '').compute()) {
      node.code += `\n\nmodule.exports = ${id}_$ALL$`
      browserNode.code += `\n\nmodule.exports = ${id}_$ALL$`
    } else if (file.get('hasDefault', '').compute()) {
      node.code += `\n\nmodule.exports = ${id}`
      browserNode.code += `\n\nmodule.exports = ${id}`
    }

    // need to remove exports etc ofc but not for now
    inlineBrowser.code = `(function (global) { ${inlineBrowser.code} })(window)`

    rdy(null, {
      node: node.code,
      browser: browserNode.code,
      inlineBrowser: inlineBrowser.code,
      dependencies: {
        node: node.deps,
        browser: browserNode.deps,
        inlineBrowser: inlineBrowser.deps
      }
    })
  }).catch(err => {
    if (err.file) {
      console.log(`\n   ${chalk.red(err.message)}`)
      console.log(`   ${chalk.blue(err.file)}`)
      const line = err.message.match(/\((\d+):(\d+)\)/)
      if (line) logError(line, err)
    } else {
      console.log(err)
    }
    console.log(`👲  ${chalk.red('error')} in ${chalk.red(Date.now() - d)} ms`)
    console.log(chalk.grey(fill('-', process.stdout.columns)), '\n')
    rdy(err)
  })
}

const build = (name, root) => {
  const finish = (result, includeExternal, field = 'result') => {
    const deps = {}
    var code = ''
    const compile = module => {
      if (!module) return ''
      if (!includeExternal && module.external) {
        deps[module.externalName] = true // add version here
        code = code + `\n // FILE: ${module.name}\n` + module.external
      } else {
        module.deps.forEach(dep => {
          const depen = result[dep]
          result[dep] = null
          compile(depen)
        })
        code = code + `\n // FILE: ${module.name}\n` + module[field]
      }
    }
    compile(result[name])
    return { code, deps }
  }
  return Promise.all([
    buildNormal(name, root).then(finish),
    buildBrowser(name, root).then(result => {
      const browserNode = finish(JSON.parse(JSON.stringify(result)))
      const inlineBrowser = finish(JSON.parse(JSON.stringify(result)), true, 'es5')
      return { browserNode, inlineBrowser }
    })
  ])
}

const Build = (depsKey, includeExternal) => {
  const builder = (name, root, traversed = {}) => {
    var result, deps
    const file = boy.get(name, {})

    if (!includeExternal && isExternal(file)) {
      return file.get('result', '').once(val => val.compute()).then(() => {
        traversed[name] = { external: file.externalUse.compute(), name, deps: [], result: file.externalUse.compute() }
      })
    }

    return file.get('result', '')
      .once(val => {
        result = val.compute()
        return result
      })
      .then(() => {
        if (result instanceof Error) {
          traversed.ERROR = result
          throw result
        }

        deps = file.get(depsKey, {}).map(({ key }) => key)
        const es5 = file.es5.compute() || result

        traversed[name] = {
          result,
          deps,
          es5,
          name
        }

        const externalName = isExternal(file)
        if (externalName) {
          traversed[name].externalName = externalName
          traversed[name].external = file.externalUse.compute()
        }

        return Promise.all(
          deps.map(key => new Promise(resolve => {
            if (!(key in traversed)) {
              resolve(builder(key, root, traversed))
            } else {
              resolve()
            }
          }))).then(() => traversed)
      })
  }

  return builder
}

const buildNormal = Build('dependencies', true)
const buildBrowser = Build('browser', true)

module.exports = buildBoy
