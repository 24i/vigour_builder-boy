const boy = require('./boy')
var stamp = 0

const finish = (traversed, opts, target, type = 'node') => {
  stamp++
  const result = { code: '' }
  const compile = module => {
    console.log(module.file.key)
    if (module.stamp === stamp) return
    module.stamp = stamp
    module.dependencies.forEach(key => compile(traversed[key]))
    module.file.compile(module.file, result, type, opts, traversed, module)
  }
  compile(traversed[target.key])
  return result
}

const build = (file, opts) => new Promise((resolve, reject) => {
  const targets = opts.targets
  const results = {}
  var cnt = targets.length

  console.log('?', targets)

  if (targets.includes('node')) {
    builder(file).then(val => {
      console.log('x???')
      results.node = finish(val, opts, file)
      if (!--cnt) resolve(results)
    }).catch(err => reject(err))
  }

  if (targets.includes('browser') || targets.includes('inline')) {
    builder(file).then(val => {
      if (targets.includes('browser')) {
        results.browser = finish(val, opts, file, 'browser')
      }
      if (targets.includes('inline')) {
        results.inline = finish(val, opts, file, 'inline')
      }
      resolve(results)
    }).catch(err => reject(err))
  }
})

const builder = (file, deps = 'dependencies', traversed = {}) => {
  const key = file.key
  var result
  return file.get('result', {})
    .once(val => {
      result = val.compute()
      return result
    })
    .then(() => {
      if (result instanceof Error) {
        traversed.ERROR = result
        throw result
      }
      const dependencies = file.get(deps, {})
        .map(val => val.origin().parent().key)

      traversed[key] = { file, dependencies }

      return Promise.all(dependencies.map(key => new Promise(resolve => {
        if (!(key in traversed)) {
          resolve(builder(boy.get(key), deps, traversed))
        } else {
          resolve()
        }
      }))).then(() => traversed)
    })
}

module.exports = build
