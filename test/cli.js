const test = require('tape')
const cli = require('../bin/lib/cli')

// Verify that the command is what we expect it to be. i.e.,
// that it is true for the command name we expect and false
// for all others.
function verifyCommand(command, expectedName) {
  delete command.positionalArguments
  delete command.namedArguments
  return Object.keys(command).reduce((verified, commandName) => {
    return verified && (command[commandName] === (commandName === expectedName))
  }, true)
}

test('command parsing', t => {
  t.plan(2)

  let command

  //
  // Command: isLocal
  //

  const expectedLocalCommands = []

  // No arguments; shorthand (e.g., web-server)
  expectedLocalCommands.push(cli.command({_:[]}))

  // One positional argument, explicit command-name.
  expectedLocalCommands.push(cli.command({_:['local']}))

  // Test all commands we expect to be local.
  expectedLocalCommands.forEach(command => t.true(verifyCommand(command, 'isLocal'), 'command is local'))

  t.end()
})
