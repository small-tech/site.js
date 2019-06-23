#!/usr/bin/env node
const cli = require('./lib/cli')

try {
  cli.initialise()
} catch (error) {
  console.log(error)
  process.exit(1)
}
