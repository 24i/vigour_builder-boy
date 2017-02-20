const buble = require('buble')
const regenerator = require('regenerator')
const chalk = require('chalk')
const asyncToGen = require('async-to-gen')
const hasLocalVar = require('./localvar')
// const { showcode } = require('../util')

const hasEs6 = (node, es6) => {
  const type = node.type
  if (
    type === 'ObjectPattern' ||
    type === 'TemplateLiteral' ||
    type === 'ArrowFunctionExpression' ||
    type === 'RestElement' ||
    (node.kind === 'let' || node.kind === 'const') ||
    type === 'Property' && (node.shorthand || node.computed)
  ) {
    es6.val = true
  }

  if (node.async === true) {
    es6.val = true
    es6.generator = true
    es6.async = true
  }

  if (type === 'FunctionExpression' && node.generator === true) {
    es6.generator = true
    es6.val = true
  }

  if (node.name === 'Promise' && !hasLocalVar(node)) {
    es6.val = true
    es6.promise = true
  }

  if (
    node.name === 'fetch' && type === 'Identifier' &&
    (
      node.parent.type === 'CallExpression' ||
      (
        node.parent.type === 'MemberExpression' &&
        node.parent.object.name === 'global' &&
        !hasLocalVar(node.parent.object)
      ) ||
      (
        node.parent.type === 'MemberExpression' &&
        node.parent.object.name === 'window' &&
        !hasLocalVar(node.parent.object)
      )
    ) &&
    !hasLocalVar(node)) {
    es6.val = true
    es6.fetch = true
  }
}

const empty = require.resolve('../../../resolve/empty.js')

const addDependency = ({ file, browser, dependencies, result }) => new Promise((resolve, reject) => {
  Promise.all([
    file.root().add({ real: empty }),
    file.root().add({ real: require.resolve(browser), val: { polyfill: true } }).then(({ node, browser }) => {
      dependencies.push({
        node: empty,
        browser: browser.key,
        polyfill: true
      })
    })
  ]).then(resolve)
})

const transpile = ({ result, es6, dependencies, file }) => new Promise((resolve, reject) => {
  var es5
  if (es6.val && !file.root().__raw__) {
    if (es6.generator || es6.promise || es6.fetch) {
      const deps = []

      if (es6.async) {
        console.log('  ', chalk.blue('has async -- convert to generator'), file.key)
        result = asyncToGen(result).toString()
      }

      if (es6.fetch) {
        console.log('  ', chalk.blue('has fetch -- add shim'), file.key)
        deps.push(addDependency({ file, browser: 'whatwg-fetch', dependencies, result }))
        // deps.push(addDependency({ node: 'node-fetch', dependencies, result }))
      }

      if (es6.generator) {
        console.log('  ', chalk.blue('has generator -- add shim'), file.key)
        es5 = regenerator.compile(result).code
        deps.push(addDependency({ file, browser: 'regenerator-runtime/runtime', dependencies, result }))
      }

      if (es6.promise) {
        console.log('  ', chalk.blue('has promise -- add shim'), file.key)
        deps.push(addDependency({ file, browser: 'promise-polyfill', dependencies, result }))
      }

      Promise.all(deps).then(() => {
        es5 = buble.transform(es5 || result).code
        resolve({ result, dependencies, es5 })
      }).catch(err => reject(err))
    } else {
      es5 = buble.transform(result).code
      resolve({ result, dependencies, es5 })
    }
  } else {
    es5 = result
    resolve({ result, dependencies, es5 })
  }
})

exports.hasEs6 = hasEs6
exports.transpile = transpile
