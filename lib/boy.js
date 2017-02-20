const { create } = require('brisky-struct')
const hash = require('string-hash')
const findPkg = require('find-pkg')
const { dirname } = require('path')
const fs = require('fs')

const exclude = require('./exclude')
const watch = require('./watch')
const browserResolve = require('./resolve')

// default plugins
const js = require('./plugins/js')
const json = require('./plugins/json')
const external = require('./plugins/external')

const onError = (err, code) => {
  console.log('error?? -->', err)
  err.file = code.parent().key
  code.parent().set({ result: { val: err } })
}

const pathIsExternal = dep => dep[0] !== '.' && dep[0] !== '/'

  // boy.add({ require: 'require path', from: file, real, val }) // what if no file?
  // - import <--- listener that sets external -- prob best -- if listeners get is a bit shit to use -- also it becomes async (resolved) -- only relevant for code
  // - key === full-path
  // -> inline // true or false
  // -> raw
  // - id

const createId = ({ node, browser }, val) => new Promise((resolve, reject) => {
  if ((val && val.vritual) || exclude(node)) {
    resolve({ node, browser, id: node })
  } else {
    findPkg('.', (err, pkgPath) => {
      if (err) {
        reject(err)
      } else {
        fs.readFile(pkgPath, (err, data) => {
          if (err) {
            reject(err)
          } else {
            const name = JSON.parse(data.toString()).name
            pkgPath = pkgPath.split('/').slice(0, -1)
            const idpath = node.split('/').slice(pkgPath.length)
            idpath.unshift(name)
            const id = { val: idpath }
            resolve({ node, browser, id })
          }
        })
      }
    })
  }
})

const resolvePaths = (require, from) => new Promise((resolve, reject) => {
  const basedir = from.vritual ? from.vritual === true ? false : from.vritual : dirname(from.key)
  browserResolve(require, { basedir }, (err, paths) => {
    if (err) {
      const exists = from.root().get(require)
      if (exists && exists.virtual) {
        paths = { node: require, browser: require }
      } else {
        let cnt = 0
        cnt++
        const lines = from.code.compute().split('\n')
        for (let i = 0; i < lines.length; i++) {
          cnt += (lines[i].length)
          if (cnt > from.code.compute().start) {
            err.message += ` "${require}" (${i + 1}:0)`
            break
          }
        }
        reject(err)
        return
      }
    }
    resolve(paths)
  })
})

const boy = create({
  inject: [ watch ],
  define: {
    add ({ require, from, real, val }, stamp) {
      return new Promise((resolve, reject) => {
        if (real && this.get(real)) {
          resolve({
            node: this.get(real),
            browser: this.get(real)
          })
        } else {
          const result = real || exclude(require)
            ? createId({ node: real || require }, val)
            : resolvePaths(require, from).then(paths => createId(paths, val))

          result.then(({ node, browser, id }) => {
            if (!val) val = {}
            if (typeof val !== 'object') val = { val }
            if (!val.val) val.val = true
            val.inline = (require && (!pathIsExternal(require) && !exclude(require))) || (val && val.virtual)
            val.id = id // '$' + hash(id)
            this.set({ [node]: val })
            if (browser && browser !== node) {
              this.set({ [browser]: val })
            }
            resolve({
              node: this[node],
              browser: browser ? this[browser] : this[node]
            })
          }).catch(err => reject(err))
        }
      })
    }
  },
  props: {
    plugins: {
      type: 'struct',
      props: {
        default: {
          props: {
            condition: true,
            parse: true,
            compile: true
          }
        }
      }
    },
    default: {
      props: { virtual: true },
      id: {
        $transform: val => {
          if (Array.isArray(val)) {
            return '$' + hash(val.join('/'))
          }
        }
      },
      code: {
        val: '',
        on: {
          data: {
            parse (val, stamp, code) {
              if (val !== null) {
                const file = code.parent()
                const plugins = code.root().plugins
                const keys = plugins.keys()
                var plugin
                for (let i = 0, len = keys.length; i < len; i++) {
                  if (plugins[keys[i]].condition && plugins[keys[i]].condition(file)) {
                    plugin = plugins[keys[i]].parse
                  }
                }
                if (!plugin) plugin = plugins.js
                plugin.parse(file)
                  .then(val => file.set(val))
                  .catch(err => onError(err, code))
              }
            }
          }
        }
      }
    }
  },
  plugins: {
    js,
    json,
    external
  }
})

module.exports = boy
