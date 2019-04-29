#!/usr/bin/env node
const fs = require('fs')
const webServer = require('../index.js')
const arguments = require('minimist')(process.argv.slice(2), {boolean: true})
const clr = require('./utilities/cli').clr


// At this point, regardless of whether we are running as a regular Node script or
// as a standalone executable created with Nexe, all paths should be correctly set.

// Get the command
const positionalArguments = arguments._
const firstPositionalArgument = positionalArguments[0]
const secondPositionalArgument = positionalArguments[1]
const command = {
  isHelp: (arguments.h || arguments.help || positionalArguments.length > 2 || firstPositionalArgument === 'help'),
  isVersion: (arguments.version || arguments.v || firstPositionalArgument === 'version'),
  isGlobal: (arguments.global || firstPositionalArgument === 'global'),
  isEnable: (arguments.enable || firstPositionalArgument === 'enable'),
  isDisable: (arguments.disable || firstPositionalArgument === 'disable'),
  isLogs: (arguments.logs || firstPositionalArgument === 'logs'),
  isStatus: (arguments.status || firstPositionalArgument === 'status'),
//isLocal: is handled below.
}
// If we didn’t match a command, we default to local.
const didMatchCommand = Object.values(command).reduce((p,n) => p || n)
command.isLocal = (arguments.local || firstPositionalArgument === 'local' || !didMatchCommand)

const firstPositionalArgumentDidMatchCommand = ['version', 'help', 'global', 'enable', 'disable', 'logs', 'status'].reduce((p, n) => p || (firstPositionalArgument === n), false)

// Help / usage instructions.
if (command.isHelp) {
  const usageCommand = `${clr('command', 'green')}`
  const usageFolderToServe = `${clr('folder', 'cyan')}${clr('|url', 'darkgrey')}`
  const usageOptions = clr('options', 'yellow')

  const usageVersion = `${clr('version', 'green')}`
  const usageHelp = `${clr('help', 'green')}`
  const usageLocal = `${clr('local', 'green')}`
  const usageGlobal = `${clr('global', 'green')}`
  const usageEnable = `${clr('enable', 'green')}`
  const usageDisable = `${clr('disable', 'green')}`
  const usageLogs = `${clr('logs', 'green')}`
  const usageStatus = `${clr('status', 'green')}`

  const usagePort = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageCommand}] [${usageFolderToServe}] [${usageOptions}]

  ${usageCommand}\t${usageVersion} | ${usageHelp} | ${usageLocal} | ${usageGlobal} | ${usageEnable} | ${usageDisable} | ${usageLogs} | ${usageStatus}
  ${usageFolderToServe}\tPath of folder to serve (defaults to current folder) or HTTP URL to reverse proxy.
  ${usageOptions}\tSettings that alter server characteristics.

  ${clr('Commands:', 'underline')}

  ${usageVersion}\tDisplay version and exit.
  ${usageHelp}\t\tDisplay this help screen and exit.

  ${usageLocal}\t\tStart server as regular process with locally-trusted certificates.
  ${usageGlobal}\tStart server as regular process with globally-trusted certificates.

  On Linux distributions with systemd, you can also use:

  ${usageEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
  ${usageDisable}\tStop server daemon and remove from startup.
  ${usageLogs}\t\tDisplay and tail server logs.
  ${usageStatus}\tDisplay detailed server information.

  If ${usageCommand} is omitted, behaviour defaults to ${usageLocal}.

  ${clr('Options:', 'underline')}

  ${usagePort}\tPort to start server on (defaults to 443).

  ${clr('For further information, please see https://ind.ie/web-server', 'italic')}
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

//
// Execute requested command.
//
switch (true) {
  // Version
  case command.isVersion:
    require('./commands/version')
  break

  // Logs
  case command.isLogs:
    require('./commands/logs')
  break

  // Status
  case command.isStatus:
    require('./commands/status')
  break

  // Disable (stop the server daemon and remove it from startup items).
  case command.isDisable:
    require('./commands/disable')
  break

  // Default: start the server.
  default:
    // If no path is passed, serve the current folder. If there is a path, we’ll serve that.
    let pathToServe = '.'

    const isServerCommand = command.isLocal || command.isGlobal || command.isEnable

    if (isServerCommand && positionalArguments.length === 2) {
      // e.g., web-server enable path-to-serve
      pathToServe = secondPositionalArgument
    } else if (!firstPositionalArgumentDidMatchCommand && isServerCommand && positionalArguments.length === 1) {
      // e.g., web-server --enable path-to-serve
      pathToServe = firstPositionalArgument
    } else if (command.isLocal && positionalArguments.length === 1) {
      // i.e., web-server path-to-serve
      pathToServe = firstPositionalArgument
    }

    // If a port is specified, use it. Otherwise use the default port (443).
    let port = 443
    if (arguments.port !== undefined) {
      port = parseInt(arguments.port)
    }

    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (port < 0 || port > 49151) {
      console.error('\n 🤯 Error: specified port must be between 0 and 49,151 inclusive.\n')
      process.exit(1)
    }

    // If a test server is specified, use it.
    let global = false
    if (command.isGlobal) {
      global = true
    }

    let isProxy = false
    if (pathToServe.startsWith('http://')) {
      isProxy = true
    } else {
      if (!fs.existsSync(pathToServe)) {
        console.error(`\n 🤔 Error: could not find path ${pathToServe}\n`)
        process.exit(1)
      }
    }

    //
    // What kind of server should we start?
    //
    if (isProxy) {
      // Start a local proxy.
      require('./commands/proxy')(pathToServe, port)
    } else if (command.isEnable) {
      // Enable server as startup launch daemon.
      require('./commands/enable')(pathToServe)
    } else {
      // Start a regular server process.
      require('./commands/serve')(pathToServe, port, global)
    }
  break
}
