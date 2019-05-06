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

test('[CLI] command and option parsing', t => {
  t.plan(61)

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

  // Implicit command, no arguments – shorthand.
  // i.e., web-server
  expectedLocalCommands.push(cli.command({_:[]}))

  // Implicit command, one argument; local folder ­– shorthand.
  // e.g., web-server test/site
  expectedLocalCommands.push(cli.command({_:['test/site']}))

  // Explicit command, no positional arguments.
  // i.e., web-server local
  expectedLocalCommands.push(cli.command({_:['local']}))

  // Explicit command, one positional argument (local folder).
  // e.g., web-server local test/site
  expectedLocalCommands.push(cli.command({_:['local', 'test/site']}))

  // Explicit command via named argument, no positional arguments.
  // i.e., web-server --local
  expectedLocalCommands.push(cli.command({_:[], local: true}))

  // Explicit command via named argument, one positional argument (local folder).
  // e.g., web-server test/site --local
  expectedLocalCommands.push(cli.command({_:['test/site'], local: true}))

  // Test all commands we expect to be local.
  expectedLocalCommands.forEach(command => t.true(verifyCommand(command, 'isLocal'), 'command is local'))

  //
  // Command: global.
  //

  const expectedGlobalCommands = []

  // No positional arguments.
  // i.e., web-server global
  expectedGlobalCommands.push(cli.command({_:['global']}))

  // One positional argument (local folder).
  // e.g., web-server global test/site
  expectedGlobalCommands.push(cli.command({_:['global', 'test/site']}))

  // Command specified via named argument, no positional arguments.
  // i.e., web-server --global
  expectedGlobalCommands.push(cli.command({_:[], global: true}))

  // Command specified via named argument and one positional argument (local folder).
  // e.g., web-server test/site --global
  expectedGlobalCommands.push(cli.command({_:['test/site'], global: true}))

  // Test all commands we expect to be global.
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
    t.ok(error, 'error expected: proxy command must have host as the second positional argument')
  }

  //
  // Command: sync.
  //
  const verifySyncCommand = (command) => {
    // Note: 4 tests per call.
    t.true(verifyCommand(command, 'isSync'))
    t.doesNotThrow(() => { cli.options(command) }, 'parsing command options does not throw')

    const options = cli.options(command)

    let expectedHost
    if (command.namedArguments.to !== undefined) {
      expectedHost = command.namedArguments.to.match(/.+?\@(.+?)\:/)[1]
    } else if (command.namedArguments.host !== undefined) {
      expectedHost = command.namedArguments.host
    } else if (command.positionalArguments.length === 1) {
      expectedHost = command.positionalArguments[0]
    } else if (command.positionalArguments.length === 2) {
      expectedHost = command.positionalArguments[1]
    }

    t.equals(options.syncRemoteHost, expectedHost)

    if (command.namedArguments.to !== undefined) {
      // Use provided remote connection string.
      t.equals(options.syncRemoteConnectionString, command.namedArguments.to)
    } else {
      // Construct remote connection string and test it.
      const account = command.namedArguments.account || process.env.USER
      const host = expectedHost
      const localFolder = command.positionalArguments.length === 2 ? command.positionalArguments[0] : '.'

      // We expect the remote folder to be at /home/<account>/<folder> where <folder> either defaults
      // to the name of the current folder on the local machine or is overridden using the --folder option.
      // If you want to specify any arbitrary folder on the remote machine, provide the full rsync
      // connection string using the --to option.
      const remoteFolderPrefix = `/home/${account}`
      const localFolderPath = path.resolve(localFolder)
      const localFolderFragments = localFolderPath.split(path.sep)
      const currentLocalFolderName = localFolderFragments[localFolderFragments.length-1]

      const remoteFolder = command.namedArguments.folder !== undefined ? `${remoteFolderPrefix}/${command.namedArguments.folder}` : `${remoteFolderPrefix}/${currentLocalFolderName}`

      const expectedRemoteConnectionString = `${account}@${host}:${remoteFolder}`
      const actualRemoteConnectionString = options.syncRemoteConnectionString

      t.equals(expectedRemoteConnectionString, actualRemoteConnectionString, 'the remote connection string is as expected')
    }
  }

  const expectedSyncCommands = []

  // No positional arguments and named argument for the host (e.g., web-server sync --host=my.site)
  verifySyncCommand(cli.command({_:['sync'], host: 'my.site'}))

  // No positional arguments and named arguments for host & account
  // e.g., web-server sync --host=my.site --account=me
  verifySyncCommand(cli.command({_:['sync'], host: 'my.site', account: 'me'}))

  // No positional arguments and named arguments for host, account, & remote folder
  // e.g., web-server sync --host=my.site --account=me --folder=www
  verifySyncCommand(cli.command({_:['sync'], host: 'my.site', account: 'me', folder: 'www'}))

  // No positional arguments and named argument for the remote connection string
  // e.g., web-server sync --to=me@my.site:/home/me/my-remote-site-folder
  verifySyncCommand(cli.command({_:['sync'], to: 'me@my.site:/home/me/my-remote-site-folder'}))

  // One positional argument (local folder) and named argument for the remote connection string.
  // e.g., web-server sync test/site --to=me@my.site:/home/me/my-remote-site-folder
  verifySyncCommand(cli.command({_:['sync', 'test/site'], to: 'me@my.site:/home/me/my-remote-site-folder'}))

  // One positional argument (the host) (e.g., web-server sync my.site)
  verifySyncCommand(cli.command({_:['sync', 'my.site']}))

  // Two positional arguments (local folder and host) (e.g., web-server sync test/site my.site)
  verifySyncCommand(cli.command({_:['sync', 'test/site', 'my.site']}))

  // Syntax conflict: one positional argument (the host) and the host also defined via named argument
  // (e.g., web-server sync my.site --host=some-other-side)
  // This should throw as my.site will be interpreted as a local folder and does not exist(in our test anyway).
  t.throws(function() { cli.options(cli.command({_:['sync', 'my.site'], host: 'some-other.site'})) }, 'host conflict between positional and named arguments should throw')

  // Syntax conflict: providing two positional arguments as well as the remote connection string creates a potential
  // conflict between the host specified in the positional argument and the one specified in the remote
  // connection string.
  t.throws(function() { cli.options(cli.command({_:['sync', 'test/site', 'my.site'], to: 'me@potentially.some.other.site:/home/me/my-remote-site-folder'})) }, 'host conflict between positional and named arguments should throw')

  // Sync but start a proxy server instead of a regular local server.
  const syncProxyCommand = cli.command({_:['sync', 'my.site'], proxy: 'localhost:1313'})
  t.doesNotThrow(function () { cli.options(syncProxyCommand) })
  const syncProxyOptions = cli.options(syncProxyCommand)
  t.true(syncProxyOptions.syncStartProxyServer, 'start proxy server flag should be true')
  t.equal(syncProxyOptions.proxyHttpURL, 'http://localhost:1313', 'proxy http url is correct')
  t.equal(syncProxyOptions.proxyWebSocketURL, 'ws://localhost:1313', 'proxy web socket url is correct')

  //
  // Command: enable.
  //

  const expectedEnableCommands = []

  // No positional arguments.
  // i.e., web-server enable
  expectedEnableCommands.push(cli.command({_:['enable']}))

  // One positional argument (local folder).
  // e.g., web-server enable test/site
  expectedEnableCommands.push(cli.command({_:['enable', 'test/site']}))

  // Command specified via named argument, no positional arguments.
  // i.e., web-server --enable
  expectedEnableCommands.push(cli.command({_:[], enable: true}))

  // Command specified via named argument and one positional argument (local folder).
  // e.g., web-server test/site --enable
  expectedEnableCommands.push(cli.command({_:['test/site'], enable: true}))

  // Test all commands we expect to be global.
  expectedEnableCommands.forEach(command => t.true(verifyCommand(command, 'isEnable'), 'command is enable'))

  //
  // Command: disable.
  //

  t.true(verifyCommand(cli.command({_:['disable']}), 'isDisable'), 'command is disable')
  t.true(verifyCommand(cli.command({_:[], disable: true}), 'isDisable'), 'command is disable')

  //
  // Command: logs.
  //

  t.true(verifyCommand(cli.command({_:['logs']}), 'isLogs'), 'command is logs')
  t.true(verifyCommand(cli.command({_:[], logs: true}), 'isLogs'), 'command is logs')

  //
  // Command: status.
  //

  t.true(verifyCommand(cli.command({_:['status']}), 'isStatus'), 'command is status')
  t.true(verifyCommand(cli.command({_:[], status: true}), 'isStatus'), 'command is status')

  t.end()
})

test('[CLI] requirement()', t => {
  t.plan(10)
  const commandNames = ['version', 'help', 'local', 'global', 'proxy', 'sync', 'enable', 'disable', 'logs', 'status']
  commandNames.forEach(commandName => {
    let command = (() => {
      if (commandName === 'proxy') { return cli.command({ _:['proxy', 'localhost:1313'] }) }
      else if (commandName === 'sync') { return cli.command({ _:['sync', 'my.site'] }) }
      else { return cli.command({_:[commandName]}) }
    })()

    t.equal(cli.requirement(command), `../commands/${commandName}`, 'command require statement is correct')
  })
  t.end()
})
