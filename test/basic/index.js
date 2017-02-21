const build = require('../../')
const test = require('tape')
const { testBuild } = require('../util')

test('simple', t => {
  build('./test/basic/a.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('basic', results, t)
      t.end()
    }
  })
})
