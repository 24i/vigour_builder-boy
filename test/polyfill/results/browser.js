
;var $3651276138 = require('whatwg-fetch')
;var $3661716756 = require('regenerator-runtime/runtime')
;const $3877244887_blurf = () => {}

async function $3877244887_bla () {
  await $3877244887_blurf() + '!'
}

if (global.require) {
  const fs = global.require('fs')
  console.log(fs)
}

function $3877244887_x () {
  console.log('hello')
}

function * $3877244887_ballz () {
  yield $3877244887_x()
}

global.fetch('http://google.com').catch(err => {
  console.log(err)
})

for (let i of $3877244887_ballz()) {
  console.log(i)
}

$3877244887_bla()
