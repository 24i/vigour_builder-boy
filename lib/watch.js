const chokidar = require('chokidar')
const fs = require('fs')
const { isExternal } = require('./util')

module.exports = (boy, stamp) => {
  const readTheBoy = filename => fs.readFile(filename, (err, data) => {
    if (err) return console.log(err)
    const boychild = boy.get(filename)
    if (boychild) {
      boychild.set({ code: data.toString() })
    }
  })
  var watcher
  boy.set({
    props: {
      default: {
        on: {
          data: {
            watch (val, stamp, file) {
              if (isExternal(file)) {
                console.log('is external!', file.key)
                file.set({ code: '' })
                return
              }

              if (val !== null) {
                if (file.key === 'undefined') {
                  throw new Error('illegal deps', file.key)
                }
                fs.readFile(file.key, (err, data) => {
                  if (err) {
                    file.set({
                      result: { val: err }
                    }, stamp)
                    return
                  }
                  file.set({ code: data.toString() })
                })
              } else {
                watcher.unwatch(file.key)
              }
            }
          }
        }
      }
    }
  }, stamp)
}
