
var $1069212539 = require('fs')
var $1896185141 = require('promise-polyfill')
var $3661716756 = require('regenerator-runtime/runtime')
const $3877244887_blurf = () => {}

async function $3877244887_bla () {
  await $3877244887_blurf() + '!'
}

const $3877244887_fs = $1069212539

function $3877244887_x () {
  console.log('hello')
}

function * $3877244887_ballz () {
  yield $3877244887_x()
}

for (let i of $3877244887_ballz()) {
  console.log(i)
}

console.log($3877244887_fs)

$3877244887_bla()
