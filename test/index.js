const build = require('../')
const test = require('tape')
const { testBuild, generate } = require('./util') //eslint-disable-line

test('imports', t => {
  build('./test/imports/a.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('imports', results, t)
      t.end()
    }
  })
})

test('jsx-any', t => {
  build('./test/jsx-any/index.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('jsx-any', results, t)
      t.end()
    }
  })
})

test('simple', t => {
  build('./test/basic/a.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('basic', results, t)
      t.end()
    }
  })
})

test('polyfill', t => {
  build('./test/polyfill/a.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('polyfill', results, t)
      t.end()
    }
  })
})

test('env - override', t => {
  build('./test/env/index.js', {
    nowatch: true,
    targets: [ 'inline' ],
    env: { beurs: 'ha!' }
  }, (err, results, boy) => {
    if (!err) {
      testBuild('env', results, t)
      t.end()
    }
  })
})

test('env - inherit', t => {
  process.env.beurs = 'ha!'
  build('./test/env/index.js', {
    nowatch: true,
    targets: [ 'inline' ]
  }, (err, results, boy) => {
    if (!err) {
      testBuild('env', results, t)
      t.end()
    }
  })
})

test('ua', t => {
  build('./test/ua/index.js', {
    nowatch: true,
    targets: [ 'node' ]
    // inline: [ 'brisky-render' ]
  }, (err, results, boy) => {
    console.log(results.ua.node.select)
    if (!err) {
      testBuild('ua', results.ua.node.builds, t)
      t.end()
    }
  })
})

test('virtual', t => {
  build({
    virtual: {
      virtual: true,
      code: 'export default \'hahaha\''
    }
  }, { nowatch: true }, (err, results, boy) => {
    if (!err) {
      build('./test/virtual/index.js', { nowatch: true }, (err, results, boy) => {
        if (!err) {
          testBuild('virtual', results, t)
          t.end()
        }
      })
    }
  })
})

test('package - error', t => {
  build('./test/pkg/index.js', {
    nowatch: true,
    targets: [ 'node' ]
  }, (err, results, boy) => {
    if (err) {
      t.ok(err.file.indexOf('package.json') !== -1, 'err gets file path')
      t.end()
    }
  })
})

test('json', t => {
  build('./test/json/index.js', {
    nowatch: true,
    targets: [ 'node' ]
  }, (err, results, boy) => {
    if (!err) {
      testBuild('json', results, t)
      t.end()
    }
  })
})

test('error', t => {
  build('./test/error/index.js', {
    nowatch: true,
    targets: [ 'node' ]
  }, (err, results, boy) => {
    if (err) {
      t.equal(err.message, 'Cannot find module "hello" (1:0)')
      t.end()
    }
  })
})

test('nested', t => {
  build('./test/nested/index.js', {
    nowatch: true,
    targets: [ 'inline' ]
  }, (err, results, boy) => {
    if (!err) {
      testBuild('nested', results, t)
      t.end()
    }
  })
})

test('jsx-body', t => {
  build('./test/jsx-body/index.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('jsx-body', results, t)
      t.end()
    }
  })
})

test('jsx-basic', t => {
  build('./test/jsx-basic/index.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('jsx-basic', results, t)
      t.end()
    } else {
      console.log(err)
    }
  })
})

test('jsx-multi', t => {
  build('./test/jsx-multi/index.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('jsx-multi', results, t)
      t.end()
    } else {
      console.log(err)
    }
  })
})

test('jsx-object', t => {
  build('./test/jsx-object/index.js', { nowatch: true }, (err, results, boy) => {
    if (!err) {
      testBuild('jsx-object', results, t)
      t.end()
    } else {
      console.log(err)
    }
  })
})
