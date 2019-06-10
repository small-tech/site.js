#!/usr/bin/env node
const cli = require('./lib/cli')

try {
  cli.initialise()
} catch (error) {
  process.exit(1)
}
