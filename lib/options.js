const chalk = require('chalk')

module.exports = (boy, opt) => {
  if (typeof opt !== 'object') return
  if (opt) {
    if (opt.targets) {
      console.log(`👲  ${chalk.white('targets')} ${opt.targets.join(', ')}`)
    }
    if (opt.env) {
      console.log(`👲  ${chalk.white('env')} ${JSON.stringify(opt.env)}`)
      boy.__env__ = opt.env
    }
    if (opt.raw) {
      console.log(`👲  ${chalk.white('raw mode')} no transpilation or polyfills`)
      boy.__raw__ = true
    } else {
      boy.__raw__ = false
    }
    if (opt.nowatch) {
      boy.__nowatch__ = true
    } else {
      boy.__nowatch__ = false
    }
  } else {
    boy.__raw__ = false
    boy.__nowatch__ = false
  }
}
