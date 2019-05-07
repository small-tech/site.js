#!/usr/bin/env node
const Graceful = require('node-graceful')
const cli = require('./lib/cli')

try {
  cli.initialise()
} catch (error) {
  Graceful.exit(1)
}
