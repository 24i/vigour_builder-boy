const builtin = require('is-builtin-module')
const { create } = require('brisky-struct')
const noderesolve = require('resolve')
const chokidar = require('chokidar')
const fs = require('fs')
const astwalker = require('./astwalker')

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
        props: {
          default: {
            code: ''
          }
        }
      },
      code: {
        val: '',
        on: {
          data: {
            parsecode (val, stamp, code) {
              if (val !== null) {
                astwalker(code).then(val => {
                  console.log(val)
                }).catch(err => {
                  console.log('wrong', err)
                })
                // imports
                // require
                // build

                // const file = code.parent()

                // const resolveopts = { basedir: dirname(file.key) }

                // const add = (dep, exports) => {
                //   if (!builtin(dep)) {
                //     noderesolve(dep, resolveopts, (err, resolved) => {
                //       if (err) return console.log(err)
                //       fs.realpath(resolved, (err, realfile) => {
                //         if (err) return console.log(err)
                //         boy.set({
                //           [file.key]: {
                //             dependencies: {
                //               [realfile]: true
                //             }
                //           },
                //           [realfile]: {
                //             dependents: {
                //               [file.key]: true
                //             },
                //             exports
                //           }
                //         })
                //       })
                //     })
                //   }
                // }

              }
            }
          }
        }
      }
    }
  }
})

module.exports = boy
