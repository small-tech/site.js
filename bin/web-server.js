#!/usr/bin/env node
const fs = require('fs')
const commandLineOptions = require('minimist')(process.argv.slice(2), {boolean: true})

//
// Get the command.
//
const positionalArguments = commandLineOptions._
const positionalCommand = positionalArguments[0]

const command = {
  isHelp: (commandLineOptions.h || commandLineOptions.help || positionalArguments.length > 2 || positionalCommand === 'help'),
  isVersion: (commandLineOptions.version || commandLineOptions.v || positionalCommand === 'version'),
  isGlobal: (commandLineOptions.global || positionalCommand === 'global'),
  isProxy: (commandLineOptions.proxy || positionalCommand === 'proxy'),
  isEnable: (commandLineOptions.enable || positionalCommand === 'enable'),
  isDisable: (commandLineOptions.disable || positionalCommand === 'disable'),
  isLogs: (commandLineOptions.logs || positionalCommand === 'logs'),
  isStatus: (commandLineOptions.status || positionalCommand === 'status'),
//isLocal: is handled below.
}

// If we didn’t match a command, we default to local.
const didMatchCommand = Object.values(command).reduce((p,n) => p || n)
command.isLocal = (commandLineOptions.local || positionalCommand === 'local' || !didMatchCommand)

const positionalCommandDidMatchCommand = ['version', 'help', 'local', 'global', 'proxy', 'enable', 'disable', 'logs', 'status'].reduce((p, n) => p || (positionalCommand === n), false)

const webServerArguments = positionalCommandDidMatchCommand ? commandLineOptions._.slice(1) : commandLineOptions._

//
// Populate options object.
//

const options = {
  pathToServe: pathToServe(),
  port: port()
}
Object.assign(options, proxyPaths())

//
// Execute requested command.
//

let requirement = null
Object.entries(command).some(theCommand => {
  if (theCommand[1] === true) {
    const commandName = theCommand[0].slice(2).toLowerCase()
    requirement = `./commands/${commandName}`
    return true
  }
})

if (requirement === null) {
  // No commands matched; display help.
  require ('./commands/help')
} else {
  // Load and run the command.
  require(requirement)(options)
}


//
// Helpers
//

// Display a syntax error.
function syntaxError() {
  console.log('\n 🤯 Syntax error. Displaying help…')
  require('./commands/help')
}


// Return the path to serve (for server commands) or exit the app if it doesn’t exist.
function pathToServe () {
  const isServerCommand = command.isLocal || command.isGlobal || command.isEnable

  // Only relevant for server commands.
  if (!isServerCommand) {
    return null
  }

  if (webServerArguments.length > 1) {
    // Syntax error.
    syntaxError()
  }

  // If no path is passed, we serve the current folder.
  // If there is a path, we’ll serve that.
  let pathToServe = '.'

  if (webServerArguments.length === 1) {
    // e.g., web-server enable path-to-serve OR web-server --enable path-to-serve
    pathToServe = webServerArguments[0]
  }

  // Ensure the path actually exists.
  if (!fs.existsSync(pathToServe)) {
    console.error(`\n 🤔 Error: could not find path ${pathToServe}\n`)
    process.exit(1)
  }

  return pathToServe
}


// Return the requested port or exit the app if it is invalid.
function port () {
  // If a port is specified, use it. Otherwise use the default port (443).
  let port = 443
  if (commandLineOptions.port !== undefined) {
    port = parseInt(commandLineOptions.port)
  }

  // Check for a valid port range
  // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
  if (port < 0 || port > 49151) {
    console.error('\n 🤯 Error: specified port must be between 0 and 49,151 inclusive.\n')
    process.exit(1)
  }

  return port
}


// If the server type is proxy, return the proxy URL (and exit with an error if one is not provided).
function proxyPaths () {
  const proxyPaths = {httpProxyPath: null, webSocketProxyPath: null}

  if (command.isProxy) {
    if (webServerArguments.length < 1) {
      // A proxy path must be included.
      console.log('\n 🤯 Error: you must supply a URL to proxy. e.g., web-server proxy http://localhost:1313\n')
      process.exit(1)
    }
    if (webServerArguments.length > 1) {
      // Syntax error.
      syntaxError()
    }
    proxyPaths.httpProxyPath = webServerArguments[0]

    if (proxyPaths.httpProxyPath.startsWith('https://')) {
      // Cannot proxy HTTPS.
      console.log('\n 🤯 Error: cannot proxy HTTPS.\n')
      process.exit(1)
    }

    if (!proxyPaths.httpProxyPath.startsWith('http://')) {
      proxyPaths.httpProxyPath = `http://${proxyPaths.httpProxyPath}`
    }

    proxyPaths.webSocketProxyPath = proxyPaths.httpProxyPath.replace('http://', 'ws://')
  }

  return proxyPaths
}
