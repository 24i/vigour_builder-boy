#!/usr/bin/env node
const build = require('../')
const file = process.argv[2]
const dest = process.argv[3]
const chalk = require('chalk')
const fs = require('fs')
build(file, (err, code) => {
  if (err) {
    if (!err.file) {
      console.log(err)
    }
  } else {
    if (dest) {
      fs.writeFile(dest, code.node, err => {
        if (!err) {
          console.log(`👲  wrote node to ${chalk.green(dest)}`)
        }
      })

      const browser = dest.replace(/\.js$/, '.browser.js')
      fs.writeFile(browser, code.browser, err => {
        if (!err) {
          console.log(`👲  wrote browser to ${chalk.green(browser)}`)
        }
      })
    }
  }
})
