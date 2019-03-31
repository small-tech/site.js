#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

const pm2 = require('pm2')
const childProcess = require('child_process')
const arguments = require('minimist')(process.argv.slice(2))

if (arguments._.length > 2 || arguments.help === true) {

  const usageFolderToServe = clr('folder-to-serve', 'green')
  const usagePortOption = `${clr('--port', 'yellow')} ${clr('N', 'cyan')}`
  const usageGlobalOption = `${clr('--global', 'yellow')}`
  const usageVersionOption = `${clr('--version', 'yellow')}`

  const usage = `
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageFolderToServe}] [${usagePortOption}] [${usageGlobalOption}] [${usageVersionOption}]

  • ${usageFolderToServe}\t\tPath to the folder to serve (defaults to current folder).
  • ${usagePortOption}\t\t\tThe port to start the server on (defaults to 443).
  • ${usageGlobalOption}\tUse globally-trusted certificates.
  • ${usageVersionOption}\t\t\tDisplay the version.
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

if (arguments.version !== undefined) {
  console.log(webServer.version())
  process.exit()
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments._.length === 1) {
  pathToServe = arguments._[0]
}

// If a port is specified, use it. Otherwise use the default port (443).
let port = 443
if (arguments.port !== undefined) {
  port = parseInt(arguments.port)
}

// If global is specified, use it.
let global = false
if (arguments.global !== undefined) {
  global = arguments.global === true
}

if (!fs.existsSync(pathToServe)) {
  console.log(` 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// If live mode is specified, run as a daemon using the pm2 process manager.
// Otherwise, start it as a regular process.
if (arguments.live !== undefined) {

  pm2.connect((error) => {
    if (error) {
      console.log(error)
      process.exit(1)
    }

    pm2.start({
      script: path.join(__dirname, 'daemon.js'),
      args: pathToServe,
      name: 'indie-web-server',
      output: '~/.web-server/logs/output.log',
      error: '~/.web-server/logs/error.log',
      pid: '~/.web-server/pids/server.pid',
      autorestart: true
    }, (error, processObj) => {
      if (error) {
        throw error
      }

      console.log(`${webServer.version()}\n 😈 Launched as daemon on https://${os.hostname()}\n`)

      //
      // Run the script that tells the process manager to add the server to launch at startup
      // as a separate process with sudo privileges.
      //
      const options = {
        env: process.env,
        stdio: 'pipe'
      }

      // TODO: Check this for failure.
      const output = childProcess.execSync(`sudo ${path.join(__dirname, '../node_modules/pm2/bin/pm2')} startup`, options)

      console.log(` 😈 Installed for auto-launch at startup.\n`)

      // Disconnect from the pm2 daemon. This will also exit the script.
      pm2.disconnect()
    })
  })
} else {
  //
  // Start a regular server process.
  //
  webServer.serve({
    path: pathToServe,
    port,
    global
  })
}

//
// Helpers.
//

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
