#!/usr/bin/env node
const Graceful = require('node-graceful')
const cli = require('./lib/cli')

const goodbye = (done) => {
  // Ensure our goodbye happens at least a stack frame after the other clean-up output.
  // (currently no other module has async clean-up).
  process.nextTick(() => {
    console.log('\n 💖 Goodbye!\n')
    done()
  })
}

Graceful.timeout = 3000
Graceful.on('SIGINT', goodbye)
Graceful.on('SIGTERM', goodbye)

try {
  cli.initialise()
} catch (error) {
  Graceful.exit(1)
}
