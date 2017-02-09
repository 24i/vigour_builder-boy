const prepImports = require('./imports')
// const chalk = require('chalk')
const hash = require('string-hash')
const acorn = require('acorn')

const blockVar = [
  'VariableDeclarator',
  'VariableDeclaration',
  'BlockStatement'
]

// const memberAssignment = [
//   'MemberExpression',
//   'AssignmentExpression'
// ]

// const blockInlinevar = [
//   'Property',
//   'ObjectPattern',
//   'VariableDeclarator',
//   'VariableDeclaration',
//   [ 'Program', 'ExportNamedDeclaration' ]
// ]

const exportsPath = [
  'MemberExpression',
  'AssignmentExpression',
  'ExpressionStatement',
  'Program'
]

const blockVarFunction = [
  'FunctionDeclaration'
]

const functionExpression = [
  'FunctionExpression'
]

const arrowFunction = [
  'ArrowFunctionExpression'
]

const blockVarFunctionInline = [
  'Property',
  'ObjectPattern',
  'FunctionDeclaration'
]

const inlinevar = [
  'Property',
  'ObjectPattern',
  'VariableDeclarator',
  'VariableDeclaration',
  [ 'Program', 'ExportNamedDeclaration' ]
]

const variableDeclaration = [
  'VariableDeclarator',
  'VariableDeclaration',
  [ 'Program', 'ExportNamedDeclaration' ]
]

const objectProperty = [
  'Property',
  'ObjectExpression'
]

const hasLocalVar = node => {
  const name = node.name
  while (node) {
    if (node.localVars && node.localVars[name]) {
      return true
    }
    node = node.parent
  }
}

const getFn = node => {
  while (node) {
    if (
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression'
    ) {
      return node
    }
    node = node.parent
  }
}

const parent = (node, arr) => {
  let len = arr.length - 1
  let i = arr.length
  node = node.parent
  while (node && i--) {
    let field = arr[len - i]
    if (typeof field === 'object') {
      let cnt = len
      for (let j = 0, len = field.length; j < len; j++) {
        if (node.type === field[j]) {
          cnt--
        }
      }
      if (cnt === len) {
        return false
      }
    } else if (node.type !== field) {
      return false
    }
    node = node.parent
  }
  return true
}

const isImport = (node) => {
  while (node) {
    if (node.type === 'ImportDeclaration') {
      return true
    }
    node = node.parent
  }
}

// call this fromStore / from list
const setStore = (node, replaceImports, insertId, store, shorthand) => {
  // console.log('setStore:', node.name, node.type, parent(node, memberAssignment), node.parent.property !== node)

  if (
    store[node.name] &&
    (((!parent(node, objectProperty) || (
      node.parent.key !== node ||
      node.parent.shorthand ||
      node.parent.computed
    )) && (node.parent.property !== node || node.parent.computed)))
  ) {
    if (!hasLocalVar(node)) {
      // also need to put import if nessecary ofc...
      if (node.parent.shorthand) {
        if (
          !shorthand[shorthand.length - 1] ||
          shorthand[shorthand.length - 1].start !== node.start
        ) {
          shorthand.push({ start: node.start, name: node.name })
        }
      }

      if (store[node.name] !== true && store[node.name].type === 'imports') {
        if (
          !replaceImports[replaceImports.length - 1] ||
          replaceImports[replaceImports.length - 1].start !== node.start
        ) {
          if (!isImport(node)) {
            replaceImports.push({ start: node.start, name: node.name, store: store[node.name] })
          }
        }
      } else if (store[node.name] === true) {
        if (insertId[insertId.length - 1] !== node.start) {
          insertId.push(node.start)
        }
      }
    }
    return true
  }
}

const identifier = (node, replaceImports, insertId, store, shorthand) => {
  if (node.name && node.type === 'Identifier') {
    if (parent(node, blockVar)) { // || parent(node, blockInlinevar)
      if (!node.parent.id.name !== node.name) {
        setStore(node, replaceImports, insertId, store, shorthand)
      } else {
        const fn = getFn(node)
        if (fn) {
          if (!fn.localVars) { fn.localVars = {} }
          fn.localVars[node.name] = true
        }
      }
    } else if (
      parent(node, blockVarFunction) ||
      parent(node, blockVarFunctionInline) ||
      parent(node, arrowFunction) ||
      parent(node, functionExpression)
    ) {
      if (node.parent.id === node && (
        node.parent.parent.type === 'Program' || node.parent.parent.type === 'ExportNamedDeclaration'
      )) {
        store[node.name] = true
        if (insertId[insertId.length - 1] !== node.start) {
          insertId.push(node.start)
        }
      } else {
        const fn = getFn(node)
        if (!fn.localVars) { fn.localVars = {} }
        fn.localVars[node.name] = true
      }
    } else if (parent(node, inlinevar) || parent(node, variableDeclaration)) {
      if (store[node.name] && store[node.name] !== true && store[node.name].type === 'imports') {
        if (
          !replaceImports[replaceImports.length - 1] ||
          replaceImports[replaceImports.length - 1].start !== node.start
        ) {
          replaceImports.push({ start: node.start, name: node.name, store: store[node.name] })
        }
      } else {
        store[node.name] = true
        if (insertId[insertId.length - 1] !== node.start) {
          insertId.push(node.start)
        }
      }
    } else {
      setStore(node, replaceImports, insertId, store, shorthand)
    }
  }
}

const exportDefault = (node, replaceExports) => {
// now need to push shit when its a variable / import
  // need to run shit on the value as well
  const exports = {
    start: node.start,
    sEnd: node.declaration.start,
    type: 'default'
  }

  replaceExports.push(exports)
}

const exportNamedDeclaration = (node, replaceExports) => {
  if (node.specifiers.length) {
    const declarations = []
    replaceExports.push({
      type: 'blank',
      start: node.start,
      sEnd: node.end,
      declarations
    })
    for (let i = 0, len = node.specifiers.length; i < len; i++) {
      declarations.push(node.specifiers[i].local.name)
    }
  } else if (node.declaration) {
    const declaration = node.declaration
    const exports = {
      start: node.start,
      sEnd: declaration.start,
      type: 'blank',
      declarations: [
        declaration.type === 'FunctionDeclaration'
          ? declaration.id.name
          : declaration.declarations[0].id.name
      ]
    }
    replaceExports.push(exports)
  }
}

function walk (node, parent, cb, blocks) {
  var keys = Object.keys(node)

  var walktargets = []

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key === 'parent') continue
    var child = node[key]
    if (Array.isArray(child)) {
      for (var j = 0; j < child.length; j++) {
        var c = child[j]
        if (c && typeof c.type === 'string') {
          c.parent = node
          walktargets.push(c)
          // walk(c, node, cb)
        }
      }
    } else if (child && typeof child.type === 'string') {
      child.parent = node
      walktargets.push(child)
      // walk(child, node, cb)
    }
  }

  var ex

  walktargets.forEach((c) => {
    if (blocks && (c.type === 'BlockStatement' || node.type === 'ArrowFunctionExpression')) {
      blocks.push({ c, node, cb, blocks })
    } else if (c.type === 'ExportDefaultDeclaration' || c.type === 'ExportNamedDeclaration') {
      if (!ex) {
        ex = []
      }
      ex.push(c)
    } else {
      walk(c, node, cb, blocks)
    }
  })

  if (ex) ex.forEach(c => { walk(c, node, cb, blocks) })

  cb(node)
}

// const showcode = (start, end, computed) => {
//   console.log(chalk.green(computed.slice(start, end)), start, '-', end)
// }

module.exports = code => {
  return new Promise((resolve, reject) => {
    const computed = code.compute()
    const ast = acorn.parse(computed, {
      ecmaVersion: 6,
      sourceType: 'module',
      allowReserved: true,
      allowReturnOutsideFunction: true,
      allowHashBang: true
    })
    const file = code.parent()
    const insertId = []
    const insertImports = []
    const replaceImports = []
    const replaceExports = []
    const shorthand = []
    const hasExports = []
    var hasMExports = false
    // this will become a lil bit different
    // if (file.resolvedFrom) {
    //   console.log('resolvedFROM!!!')
    // }
    const id = '$' + hash(file.resolvedFrom ? file.resolvedFrom.compute() : file.key) // can be memoized
    const store = {}

    // will be replaced...
    const parse = node => {
      if (node.type === 'ExportNamedDeclaration') {
        exportNamedDeclaration(node, replaceExports)
      } else if (node.type === 'ExportDefaultDeclaration') {
        exportDefault(node, replaceExports)
      } else if (
        node.name === 'module' &&
        node.parent.type === 'MemberExpression' &&
        node.parent.property.name === 'exports' &&
        node.parent.parent.type === 'AssignmentExpression'
      ) {
        hasMExports = true
        const exports = {
          start: node.parent.parent.start,
          sEnd: node.parent.parent.right.start,
          type: 'default'
        }
        replaceExports.push(exports)
      } else if (node.name === 'exports' && parent(node, exportsPath)) {
        if (!hasMExports) {
          hasExports.push({
            start: node.start,
            end: node.end
          })
        }
      }

      if (node.name === 'require' && node.parent.type === 'CallExpression') {
        const p = node.parent.parent.parent
        // add deconstructor as well
        if (p.type === 'VariableDeclaration') {
          const imports = {
            type: 'require',
            file: node.parent.arguments[0].value,
            start: node.parent.start,
            end: node.parent.end
          }

          if (node.parent.parent.id.type === 'ObjectPattern') {
            imports.objectPattern = []
            imports.replace = imports.start
            imports.start = node.parent.parent.start

            for (let i in node.parent.parent.id.properties) {
              let val = node.parent.parent.id.properties[i].value.name
              let key = node.parent.parent.id.properties[i].key.name
              if (val !== key) {
                imports.objectPattern.push({
                  start: node.parent.parent.id.properties[i].start,
                  val: node.parent.parent.id.properties[i].value,
                  key: node.parent.parent.id.properties[i].key
                })
              } else {
                imports.objectPattern.push({
                  start: node.parent.parent.id.properties[i].start,
                  val
                })
              }
            }
          }

          insertImports.push(imports)
        } else {
          const imports = {
            type: 'imports',
            file: node.parent.arguments[0].value,
            start: node.parent.start,
            end: node.parent.end,
            exports: {}
          }
          insertImports.push(imports)
        }
      } else if (node.type === 'ImportDeclaration') {
        const imports = {
          type: 'imports',
          file: node.source.value,
          start: node.start,
          end: node.end
        }
        const exports = {}
        imports.exports = exports
        node.specifiers.forEach(node => {
          if (node.imported) {
            exports[node.imported.name] = [ node.local.name, node.imported.name ]
          } else if (node.type === 'ImportDefaultSpecifier') {
            exports.default = node.local.name
          } else {
            exports['*'] = node.local.name
          }
          store[node.local.name] = imports
        })
        insertImports.push(imports)
      } else {
        identifier(node, replaceImports, insertId, store, shorthand)
      }
    }

    // const walk = astw(ast)
    // walk(parse)
    var blocks = []
    walk(ast, void 0, parse, blocks)

    blocks.forEach(({ c, node, cb, blocks }) => {
      walk(c, node, cb)
    })

    Promise.all(insertImports.map(val => prepImports(val, file, computed))).then(dependencies => {
      insertId.sort((a, b) => a - b)
      replaceImports.sort((a, b) => a.start - b.start)
      shorthand.sort((a, b) => a.start - b.start)
      replaceExports.sort((a, b) => a.start - b.start)
      insertImports.sort((a, b) => a.start - b.start)
      hasExports.sort((a, b) => a.start - b.start)

      var result = ''
      var j = 0
      var n = 0
      var k = 0
      var p = 0
      var l = 0
      var x = 0
      var any = false
      var hasDefault = false

      if (hasExports.length) {
        result = 'const ' + id + ' = {}\n'
      }

      for (let i = 0, len = computed.length; i < len; i++) {
        let imports = insertImports[n]
        let exports = replaceExports[p]
        let replaceImport = replaceImports[k]
        let sh = shorthand[l]

        if (imports && i === imports.start) {
          if (imports.type === 'require') {
            let y = 0
            let handlingkey
            let obj
            for (var m = i; m < imports.replace; m++) {
              obj = imports.objectPattern[y]
              if (obj && obj.key && obj.start === m || handlingkey) {
                handlingkey = true
                if (m === insertId[j]) {
                  j++
                }
                if (m === obj.val.start) {
                  result += id + '_'
                  handlingkey = false
                }
                result += computed[m]
              } else {
                if (obj && obj.start === m) {
                  result += obj.val + ': '
                  y++
                }
                if (m === insertId[j]) {
                  result += id + '_'
                  j++
                }
                result += computed[m]
              }
            }

            result += imports.id
            i += (imports.end - imports.start)
          } else {
            i += (imports.end - imports.start)
          }
          n++
        } else if (exports && i === exports.start) {
          const end = exports.sEnd
          const start = exports.start
          if (exports.type === 'default') {
            hasDefault = true
            result += `const ${id} = `
            i += (end - start - 1)
          } else if (exports.type === 'assignment') {
            // remove the _export_ shit
            result += `const ${id}_${exports.identifier} = `
            i += (end - start - 1)
          } else if (exports.type === 'blank') {
            if (exports.insert) {
              result += exports.insert
            }
            i += (end - start - 1)
          }
          p++
        } else {
          if (hasExports[x] && hasExports[x].start === i) {
            result += id
            i += (hasExports[x].end - hasExports[x].start)
            x++
          } else if (sh && i === sh.start) {
            result += `${sh.name}: `
            l++
          }
          if (i === insertId[j]) {
            result += id + '_'
            j++
            result += computed[i]
          } else if (replaceImport && replaceImport.start === i) {
            result += replaceImport.store.vars[replaceImport.name]
            i += replaceImport.name.length - 1
            k++
          } else {
            result += computed[i]
          }
        }
      }

      // * imports -- this can be optional (only add it when its required like this)
      // add a * in the deps path/* -- then this will be store on code * (which will just be the little object)
      // here its allready

      // now needs to get correct replacement val

      for (let i = 0, len = replaceExports.length; i < len; i++) {
        if (replaceExports[i].declarations) {
          replaceExports[i].declarations.forEach(name => {
            var result = name
            if (store[name]) {
              result = store[name] === true
                ? `${id}_${name}`
                : store[name].vars[name]
            }
            if (!any) any = `\nconst ${id}_$ALL$ = {`
            any += `\n  ${name}: ${result},`
          })
        }
      }

      if (any) {
        any = any.slice(0, -1)
        any += '\n}'
        result += any
      }

      // if (file.key === '/Users/jimdebeer/Desktop/brisky/brisky-struct/src/emit/context.js') {
      //   console.log('\n\n\n--------------\nresult:\n', result)
      // }
      // console.log('\n\n\n--------------\nresult:\n', result)
      resolve({
        result,
        dependencies,
        code,
        any,
        hasDefault
      })
    }).catch(err => {
      reject(err)
    })
  })
}
