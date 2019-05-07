#!/usr/bin/env node
const Graceful = require('node-graceful')
const cli = require('./lib/cli')

Graceful.on('exit', () => {
  console.log('\n 💖 Goodbye!\n')
  process.exit()
})

try {
  cli.initialise()
} catch (error) {
  process.exit(1)
}
