#!/usr/bin/env node
const cli = require('./lib/cli')

// While testing elevated privileges on Windows, if you are getting
// an error and you do not want the window to close before you can
// see it, temporarily uncomment the following line:
// process.stdin.resume()

try {
  const {commandPath, args} = cli.initialise(process.argv.slice(2))
  require(commandPath)(args)
} catch (error) {
  console.log(error)
  process.exit(1)
}
