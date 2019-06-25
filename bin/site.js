#!/usr/bin/env node
const cli = require('./lib/cli')

try {
  const {commandPath, args} = cli.initialise(process.argv.slice(2))
  require(commandPath)(args)
} catch (error) {
  console.log(error)
  process.exit(1)
}
