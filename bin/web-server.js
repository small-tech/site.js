#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

const pm2 = require('pm2')
const childProcess = require('child_process')
const arguments = require('minimist')(process.argv.slice(2), {boolean: true})

const pm2Path = path.join(__dirname, '../node_modules/pm2/bin/pm2')

if (arguments._.length > 2 || arguments.help === true) {

  const usageFolderToServe = clr('folder-to-serve', 'green')
  const usagePortOption = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`
  const usageStagingOption = `${clr('--staging', 'yellow')}`
  const usageLiveOption = `${clr('--live', 'yellow')}`
  const usageMonitorOption = `${clr('--monitor', 'yellow')}`
  const usageLogsOption = `${clr('--logs', 'yellow')}`
  const usageVersionOption = `${clr('--version', 'yellow')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageFolderToServe}] [${usagePortOption}] [${usageStagingOption}] [${usageLiveOption}] [${usageMonitorOption}] [${usageLogsOption}] [${usageVersionOption}]

  • ${usageFolderToServe}\tPath to the folder to serve (defaults to current folder).
  • ${usagePortOption}\t\tThe port to start the server on (defaults to 443).
  • ${usageStagingOption}\t\tRun as regular process with globally-trusted certificates.
  • ${usageLiveOption}\t\tRun as launch-time daemon with globally-trusted certificates.
  • ${usageMonitorOption}\t\tMonitor an already-running live server.
  • ${usageLogsOption}\t\tDisplay and tail the server logs.
  • ${usageVersionOption}\t\tDisplay the version.
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

// Version.
if (arguments.version !== undefined) {
  console.log(webServer.version())
  process.exit()
}

// Monitor (pm2 proxy).
if (arguments.monitor !== undefined) {
  // Launch pm2 monit.
  const options = {
    env: process.env,
    stdio: 'inherit'
  }

  try {
    childProcess.execSync(`sudo ${pm2Path} monit`, options)
  } catch (error) {
    console.log(` 👿 Failed to launch the process monitor.\n`)
    process.exit(1)
  }
  process.exit(0)
}

// Logs (pm2 proxy).
if (arguments.logs !== undefined) {
  // Launch pm2 logs.
  const options = {
    env: process.env,
    stdio: 'inherit'
  }

  try {
    childProcess.execSync(`sudo ${pm2Path} logs web-server`, options)
  } catch (error) {
    console.log(` 👿 Failed to get the logs.\n`)
    process.exit(1)
  }
  process.exit(0)
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments._.length > 0) {
  pathToServe = arguments._[0]
}

// If a port is specified, use it. Otherwise use the default port (443).
let port = 443
if (arguments.port !== undefined) {
  port = parseInt(arguments.port)
}

// If staging is specified, use it.
let global = false
if (arguments.staging !== undefined) {
  global = true
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
      name: 'web-server',
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

      try {
        const output = childProcess.execSync(`sudo ${path.join(__dirname, '../node_modules/pm2/bin/pm2')} startup`, options)
      } catch (error) {
        console.log(` 👿 Failed to add server for auto-launch at startup.\n`)
        pm2.disconnect()
        process.exit(1)
      }

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
