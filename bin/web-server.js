#!/usr/bin/env node
const fs = require('fs')
const commandLineOptions = require('minimist')(process.argv.slice(2), {boolean: true})

const clr = require('./lib/cli').clr

//
// Get the command.
//
const positionalArguments = commandLineOptions._
const positionalCommand = positionalArguments[0]

const command = {
  isHelp: (commandLineOptions.h || commandLineOptions.help || positionalCommand === 'help'),
  isVersion: (commandLineOptions.version || commandLineOptions.v || positionalCommand === 'version'),
  isGlobal: (commandLineOptions.global || positionalCommand === 'global'),
  isProxy: (commandLineOptions.proxy || positionalCommand === 'proxy'),
  isSync: (commandLineOptions.sync || positionalCommand === 'sync'),
  isEnable: (commandLineOptions.enable || positionalCommand === 'enable'),
  isDisable: (commandLineOptions.disable || positionalCommand === 'disable'),
  isLogs: (commandLineOptions.logs || positionalCommand === 'logs'),
  isStatus: (commandLineOptions.status || positionalCommand === 'status'),
//isLocal: is handled below.
}

// If we didn’t match a command, we default to local.
const didMatchCommand = Object.values(command).reduce((p,n) => p || n)
command.isLocal = (commandLineOptions.local || positionalCommand === 'local' || !didMatchCommand)

const positionalCommandDidMatchCommand = ['version', 'help', 'local', 'global', 'proxy', 'sync', 'enable', 'disable', 'logs', 'status'].reduce((p, n) => p || (positionalCommand === n), false)

const webServerArguments = positionalCommandDidMatchCommand ? commandLineOptions._.slice(1) : commandLineOptions._

//
// Populate options object.
//

const options = {
  pathToServe: pathToServe(),
  port: port()
}
Object.assign(options, proxyOptions())
Object.assign(options, syncOptions())

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
function syntaxError(message = null) {
  const additionalMessage = message === null ? '' : ` (${message})`
  console.log(`\n 🤯 Syntax error${additionalMessage}. Displaying help…`)
  require('./commands/help')()
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
function proxyOptions () {
  const proxyOptions = {proxyHttpURL: null, proxyWebSocketURL: null}

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
    proxyOptions.proxyHttpURL = webServerArguments[0]

    if (proxyOptions.proxyHttpURL.startsWith('https://')) {
      // Cannot proxy HTTPS.
      console.log('\n 🤯 Error: cannot proxy HTTPS.\n')
      process.exit(1)
    }

    if (!proxyOptions.proxyHttpURL.startsWith('http://')) {
      proxyOptions.proxyHttpURL = `http://${proxyOptions.proxyHttpURL}`
    }

    proxyOptions.proxyWebSocketURL = proxyOptions.proxyHttpURL.replace('http://', 'ws://')
  }

  return proxyOptions
}

// Return the sync options object (if relevant).
function syncOptions () {
  const syncOptions = { syncDomain: null, syncFolder: null, syncIsServer: null }

  //
  // Syntax:
  //
  //  1. web-server sync
  //  2. web-server sync [folder|domain]
  //  3. web-server sync [folder] [domain]
  //

  if (command.isSync) {

    if (webServerArguments.length === 0) {
      //
      // 1. No arguments provided (i.e., called as web-server sync).
      // Meaning: start a web server daemon with sync on the current folder.
      //
      syncOptions.syncIsServer = true
    } else if (webServerArguments.length === 1) {
      //
      // 2. One argument is provided: it could be a folder or a domain.
      //
      const folderOrDomain = webServerArguments[0]

      if (fs.existsSync(folderOrDomain)) {
        //
        // 2-a. This is a valid path, we interpret it as the folder to serve and
        //      flag that we should start a web server daemon with sync.
        //
        syncOptions.syncIsServer = true
        syncOptions.syncFolder = folderOrDomain
      } else {
        //
        // 2-b. This isn’t a valid path, we interpret it as a domain and flag that
        // we should start a local web server process with sync.
        //
        syncOptions.syncIsServer = false
        syncOptions.syncDomain = folderOrDomain
      }
    } else if (webServerArguments.length === 2) {
      // 3. Two arguments provided. We interpret the first as the path of the
      // folder to serve and the second as the domain and flag that we should
      // start a local web server process with sync.
      syncOptions.syncIsServer = false
      syncOptions.syncFolder = webServerArguments[0]
      syncOptions.syncDomain = webServerArguments[1]

      if (!fs.existsSync(syncOptions.syncFolder)) {
        console.log(`\n 🤯 Error: Folder not found (${clr(syncOptions.syncFolder, 'cyan')}).\n\n    Syntax:\tweb-server ${clr('sync', 'green')} ${clr('folder', 'cyan')} ${clr('domain', 'yellow')}\n    Command:\tweb-server ${clr('sync', 'green')} ${clr(syncOptions.syncFolder, 'cyan')} ${clr(syncOptions.syncDomain, 'yellow')}\n`)
        process.exit(1)
      }

    } else {
      // Syntax error: too many arguments.
      syntaxError('too many arguments')
    }
  }

  return syncOptions
}
