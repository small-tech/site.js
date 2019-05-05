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
  t.plan(17)

  let command

  //
  // Command: version.
  //

  t.ok(verifyCommand(cli.command({_:['version']}), 'isVersion'), 'version command is detected (positional)')
  t.ok(verifyCommand(cli.command({_:[], version: true}), 'isVersion'), 'version command is detected (named)')

  //
  // Command: help.
  //

  t.ok(verifyCommand(cli.command({_:['help']}), 'isHelp'), 'help is detected (positional)')
  t.ok(verifyCommand(cli.command({_:[], help: true}), 'isHelp'), 'help is detected (named)')

  //
  // Command: local.
  //

  const expectedLocalCommands = []

  // No arguments – shorthand (i.e., web-server)
  expectedLocalCommands.push(cli.command({_:[]}))

  // One positional argument; folder ­– shorthand (e.g., web-server test/site)
  expectedLocalCommands.push(cli.command({_:['test/site']}))

  // One positional argument; explicit command name (i.e., web-server local)
  expectedLocalCommands.push(cli.command({_:['local']}))

  // Two positional arguments; explicit command name and folder (e.g., web-server local test/site).
  expectedLocalCommands.push(cli.command({_:['local', 'test/site']}))

  // No positional arguments, explicit named argument (i.e., web-server --local).
  expectedLocalCommands.push(cli.command({_:[], local: true}))

  // One positional argument; folder + explicit named argument (e.g., web-server test/site --local).
  expectedLocalCommands.push(cli.command({_:['test/site'], local: true}))

  // Test all commands we expect to be local.
  expectedLocalCommands.forEach(command => t.true(verifyCommand(command, 'isLocal'), 'command is local'))

  //
  // Command: global
  //

  const expectedGlobalCommands = []

  // One positional argument; explicit command name (i.e., web-server global)
  expectedGlobalCommands.push(cli.command({_:['global']}))

  // Two positional arguments; explicit command name and folder (e.g., web-server global test/site).
  expectedGlobalCommands.push(cli.command({_:['global', 'test/site']}))

  // No positional arguments, explicit named argument (i.e., web-server --global).
  expectedGlobalCommands.push(cli.command({_:[], global: true}))

  // One positional argument; folder + explicit named argument (e.g., web-server test/site --global).
  expectedGlobalCommands.push(cli.command({_:['test/site'], global: true}))

  // Test all commands we expect to be local.
  expectedGlobalCommands.forEach(command => t.true(verifyCommand(command, 'isGlobal'), 'command is global'))

  //
  // Command: proxy
  //

  // e.g., web-server proxy localhost:1313
  const proxyCommandWithCorrectPositionalSyntax = cli.command({_:['proxy', 'localhost:1313']})
  t.true(verifyCommand(proxyCommandWithCorrectPositionalSyntax, 'isProxy'), 'command is proxy')

  // e.g. web-server --proxy localhost:1313
  const proxyCommandWithCorrectMixedSyntax = cli.command({_:['localhost:1313'], proxy: true})
  t.true(verifyCommand(proxyCommandWithCorrectMixedSyntax, 'isProxy'), 'command is proxy')

  // Missing argument (host)
  const proxyCommandMissingHost = cli.command({_:['proxy']})
  try {
    cli.options(proxyCommandMissingHost)
  } catch (error) {
    t.ok(error, 'proxy command must have the host as the second positional argument')
  }

  //
  // Command: sync.
  //



  //
  // Command: enable TODO
  //



  //
  // Command: disable TODO
  //



  //
  // Command: logs TODO
  //



  //
  // Command: status TODO
  //

  t.end()
})
