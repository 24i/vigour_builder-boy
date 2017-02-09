#!/usr/bin/env node
const { dirname } = require('path')
const build = require('../')
const file = process.argv[2]
const dest = process.argv[3]
const chalk = require('chalk')
const fs = require('fs')

const write = (dest, code, type) => new Promise((resolve, reject) => {
  const path = dirname(dest).split('/')
  var dir = ''
  path.forEach(part => {
    if (!fs.existsSync(dir += `/${part}`)) {
      fs.mkdirSync(dir)
    }
  })
  fs.writeFile(dest, code[type], err => {
    if (err) {
      reject(err)
    } else {
      console.log(`👲  wrote ${type} to ${chalk.green(dest)}`)
      resolve()
    }
  })
})

build(file, (err, code) => {
  if (err) {
    if (!err.file) console.log(err)
  } else if (dest) {
    Promise.all([
      write(dest, code.node),
      write(dest, code.browser)
    ]).then(() => process.exit())
  }
})
