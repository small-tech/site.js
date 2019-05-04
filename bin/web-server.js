#!/usr/bin/env node
const cli = require('./lib/cli')

function exitElegantly () {
  console.log('\n 💖 Goodbye!\n')
  process.exit()
}

process.on('SIGINT', exitElegantly) // run signal handler on CTRL-C
process.on('SIGTERM', exitElegantly) // run signal handler on SIGTERM

try {
  cli.initialise()
} catch (error) {
  process.exit(1)
}
