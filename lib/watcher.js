const builtin = require('is-builtin-module')
const { create } = require('brisky-struct')
const noderesolve = require('resolve')
const chokidar = require('chokidar')
const acorn = require('acorn')
const astw = require('astw')
const fs = require('fs')
const hash = require('string-hash')
const { dirname } = require('path')
var watcher

const readTheBoy = filename => fs.readFile(filename, (err, data) => {
  if (err) return console.log(err)
  const boychild = boy.get(filename)
  if (boychild) boychild.set({ code: data.toString() })
})

const boy = create({
  props: {
    default: {
      on: {
        data: {
          watch (val, stamp, file) {
            if (val !== null) {
              fs.readFile(file.key, (err, data) => {
                if (err) return console.log(err)
                file.set({ code: data.toString() })
                // watch
                if (watcher) {
                  watcher.add(file.key)
                } else {
                  watcher = chokidar.watch(file.key, {
                    ignoreInitial: true
                  }).on('change', readTheBoy)
                }
              })
            } else {
              watcher.unwatch(file.key)
            }
          }
        }
      },
      exports: {
        default: {
          props: {
            dependencies: true
          }
        }
      },
      code: {
        val: '',
        on: {
          data: {
            parsecode (val, stamp, code) {
              if (val !== null) {
                var computed = code.compute()
                var insertId = []

                const ast = acorn.parse(computed, {
                  ecmaVersion: 6,
                  sourceType: 'module',
                  allowReserved: true,
                  allowReturnOutsideFunction: true,
                  allowHashBang: true
                })

                const file = code.parent()
                const id = '$' + hash(file.key) // can be memoized
                const walk = astw(ast)
                const dependencies = []
                const resolveopts = { basedir: dirname(file.key) }

                const add = dep => {
                  if (!builtin(dep)) {
                    dependencies.push(new Promise((resolve, reject) => {
                      noderesolve(dep, resolveopts, (err, resolved) => {
                        if (err) return reject(err)
                        fs.realpath(resolved, (err, realfile) => {
                          if (err) return reject(err)
                          boy.set({ [realfile]: true })
                          resolve(realfile)
                        })
                      })
                    }))
                  }
                }

                walk(node => {
                  if (node.type === 'Identifier') {
                    if (node.name === 'require') {
                      if (node.parent.arguments) {
                        add(node.parent.arguments[0].value)
                      }
                    } else {
                      // here do some love with names
                      if (!(
                            node.parent &&
                            node.parent.type === 'Property' &&
                            node.parent.parent &&
                            node.parent.parent.type === 'ObjectExpression'
                          ) &&
                        !(
                          node.parent && node.parent.type === 'MemberExpression'
                          )
                      ) {
                        if (insertId[insertId.length - 1] !== node.start) {
                          insertId.push(node.start)
                        }
                      }
                    }
                  } else if (node.type === 'ImportDeclaration') {
                    add(node.source.value)
                  }
                })

                var build = ''
                var j = 0
                for (let i = 0; i < computed.length; i++) {
                  if (i === insertId[j]) {
                    build += id
                    j++
                  }
                  build += computed[i]
                }

                // store dependencies
                Promise.all(dependencies).then(resolvedpaths => file.set({
                  exports: {
                    default: { // @todo not always on default
                      dependencies: resolvedpaths
                    }
                  }
                }))

                console.log('\n---------------------------')
                console.log(computed)
                console.log('\n---------------------------')
                console.log(build)
              }
            }
          }
        }
      }
    }
  }
})

module.exports = boy
