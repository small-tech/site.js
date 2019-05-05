const test = require('tape')
const cli = require('../bin/lib/cli')

const path = require('path')

// Verify that the command is what we expect it to be. i.e.,
// that it is true for the command name we expect and false
// for all others.
function verifyCommand(command, expectedName) {
  const positionalArguments = command.positionalArguments
  const namedArguments = command.namedArguments
  delete command.positionalArguments
  delete command.namedArguments
  const result = Object.keys(command).reduce((verified, commandName) => {
    return verified && (command[commandName] === (commandName === expectedName))
  }, true)
  command.positionalArguments = positionalArguments
  command.namedArguments = namedArguments
  return result
}

test('[Command-Line Interface] command parsing', t => {
  t.plan(26)

  let command
  let options

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
    t.ok(error, 'error expected: proxy command must have the host as the second positional argument')
  }

  //
  // Command: sync.
  //
  const verifySyncRemoteConnectionStringForCommand = (command) => {

    console.log('--> command', command)

    const options = cli.options(command)

    console.log('--> options', options)

    const account = command.namedArguments.account || process.env.USER
    const host = command.namedArguments.host || command.positionalArguments[0]
    let localFolder = command.positionalArguments.length === 2 ? command.positionalArguments[1] : '.'

    // We expect the remote folder to be at /home/<account>/<folder> where <folder> either defaults
    // to the name of the current folder on the local machine or is overriden using the --folder option.
    // If you want to specify any arbitrary folder on the remote machine, provide the full rsync
    // connection string using the --to option.
    const remoteFolderPrefix = `/home/${account}`
    const localFolderPath = path.resolve(localFolder)
    const localFolderFragments = localFolderPath.split(path.sep)
    const currentLocalFolderName = localFolderFragments[localFolderFragments.length-1]

    const remoteFolder = command.namedArguments.folder !== undefined ? `${remoteFolderPrefix}/${command.namedArguments.folder}` : `${remoteFolderPrefix}/${currentLocalFolderName}`

    const expectedRemoteConnectionString = `${account}@${host}:${remoteFolder}`
    const actualRemoteConnectionString = options.syncRemoteConnectionString

    return expectedRemoteConnectionString === actualRemoteConnectionString
  }

  const expectedSyncCommands = []

  // One positional argument; command name and named argument for the host (e.g., web-server sync --host=my.site)
  command = cli.command({_:['sync'], host: 'my.site'})
  t.true(verifyCommand(command, 'isSync'))
  t.doesNotThrow(() => { options = cli.options(command) }, 'parsing command options does not throw')
  t.equals(options.syncRemoteHost, 'my.site')
  t.ok(verifySyncRemoteConnectionStringForCommand(command), 'the remote connection string is as expected')

  // One positional argument; command name and named argument for host & account
  // (e.g., web-server sync --host=my.site --account=me)
  expectedSyncCommands.push(cli.command({_:['sync'], host: 'my.site', account: 'me'}))

  // One positional argument; command name and named argument for host, account, & remote folder
  // (e.g., web-server sync --host=my.site --account=me)
  expectedSyncCommands.push(cli.command({_:['sync'], host: 'my.site', account: 'me', folder: 'www'}))

  // One positional argument; command name and named argument for the remote connection string
  // (e.g., web-server sync --to=me@my.site:/home/me/my-remote-site-folder)
  expectedSyncCommands.push(cli.command({_:['sync'], to: 'me@my.site:/home/me/my-remote-site-folder'}))

  // Two positional arguments; command name and the host (e.g., web-server sync my.site)
  expectedSyncCommands.push(cli.command({_:['sync', 'my.site']}))

  // Three positional arguments; command name, folder, and host (e.g., web-server sync folder my.site)
  expectedSyncCommands.push(cli.command({_:['sync', 'folder', 'my.site']}))

  // Two positional arguments; command name and the host (e.g., web-server sync my.site)
  // expectedSyncCommands.push(cli.command({_:['sync', 'my.site']}))

  // Test all commands we expect to be sync.
  expectedSyncCommands.forEach(command => t.true(verifyCommand(command, 'isSync'), 'command is sync'))


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
