#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

const pm2 = require('pm2')
const childProcess = require('child_process')
const arguments = require('minimist')(process.argv.slice(2), {boolean: true})

// This is the directory that will house a copy of the source code.
// Scripts and other processes are launched from here so that they work
// properly when Indie Web Server is wrapped into native binaries using Nexe.
const externalDirectory = path.join(os.homedir(), '.indie-web-server')

// The path that we expect the PM2 process manager’s source code to reside
// at in the external directory.
const pm2Path = path.join(externalDirectory, 'node_modules/pm2/bin/pm2')

// This is the directory that we will copy the source code to (as a single
// zip file, before unzipping it into externalDirectory.)
const zipFilePath = path.join(os.homedir(), 'web-server.zip')

// If the external directory (and, thereby, the external copy of our
// bundled source code) doesn’t exist, copy it over and unzip it.
if (!fs.existsSync(externalDirectory)) {
  try {
    //
    // Note: we are copying the node_modules.zip file using fs.readFileSync()
    // ===== and fs.writeFileSync() instead of fs.copyFileSync() as the latter
    //       does not work currently in binaries that are compiled with
    //       Nexe (tested with version 3.1.0). See these issues for more details:
    //
    //       https://github.com/nexe/nexe/issues/605 (red herring)
    //       https://github.com/nexe/nexe/issues/607 (actual issue)
    //
    // fs.copyFileSync(internalZipFilePath, zipFilePath)
    //
    const internalZipFilePath = path.join(__dirname, '../web-server.zip')
    const webServerZip = fs.readFileSync(internalZipFilePath, 'binary')
    fs.writeFileSync(zipFilePath, webServerZip, 'binary')

    // Unzip the node_modules
    const options = {
      env: process.env,
      stdio: 'inherit'  // Display output.
    }

    // Unzip the node_modules directory to the external directory.
    childProcess.execSync(`unzip ${zipFilePath} -d ${externalDirectory}`)

  } catch (error) {
    console.log(' 💥 Failed to copy Indie Web Server source code to external directory.', error)
    process.exit(1)
  }
}


// Get the command
const positionalArguments = arguments._
const firstPositionalArgument = positionalArguments[0]
const secondPositionalArgument = positionalArguments[1]
const command = {
  isHelp: (arguments.h || arguments.help || positionalArguments.length > 2 || firstPositionalArgument === 'help'),
  isVersion: (arguments.version || arguments.v || firstPositionalArgument === 'version'),
  isTest: (arguments.test || firstPositionalArgument === 'test'),
  isOn: (arguments.on || firstPositionalArgument === 'on'),
  isOff: (arguments.off || firstPositionalArgument === 'off'),
  isMonitor: (arguments.monitor || firstPositionalArgument === 'monitor'),
  isLogs: (arguments.logs || firstPositionalArgument === 'logs'),
  isInfo: (arguments.info || firstPositionalArgument === 'info')
}
// If we didn’t match a command, we default to dev.
const didMatchCommand = Object.values(command).reduce((p,n) => p || n)
command.isDev = (arguments.dev || firstPositionalArgument === 'dev' || !didMatchCommand)

const firstPositionalArgumentDidMatchCommand = ['help', 'version', 'test', 'on', 'off', 'monitor', 'logs', 'info'].reduce((p, n) => p || (firstPositionalArgument === n), false)

// Help / usage instructions.
if (command.isHelp) {
  const usageCommand = `${clr('command', 'green')}`
  const usageFolderToServe = clr('folder', 'cyan')
  const usageOptions = clr('options', 'yellow')
  const usageHelp = `${clr('help', 'green')}`
  const usageVersion = `${clr('version', 'green')}`
  const usageDev = `${clr('dev', 'green')}`
  const usageTest = `${clr('test', 'green')}`
  const usageOn = `${clr('on', 'green')}`
  const usageOff = `${clr('off', 'green')}`
  const usageMonitor = `${clr('monitor', 'green')}`
  const usageLogs = `${clr('logs', 'green')}`
  const usageInfo = `${clr('info', 'green')}`
  const usagePort = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageCommand}] [${usageFolderToServe}] [${usageOptions}]

  ${usageCommand}\t${usageHelp} | ${usageVersion} | ${usageDev} | ${usageTest} | ${usageOn} | ${usageOff} | ${usageMonitor} | ${usageLogs} | ${usageInfo}
  ${usageFolderToServe}\tPath of folder to serve (defaults to current folder).
  ${usageOptions}\tSettings that alter server characteristics.

  ${clr('Commands:', 'underline')}

  ${usageVersion}\tDisplay version and exit.
  ${usageHelp}\t\tDisplay this help screen and exit.

  ${usageDev}\t\tLaunch server as regular process with locally-trusted certificates.
  ${usageTest}\t\tLaunch server as regular process with globally-trusted certificates.
  ${usageOn}\t\tLaunch server as startup daemon with globally-trusted certificates.

  When server is on, you can also use:

  ${usageOff}\t\tTake server offline and remove it from startup items.
  ${usageMonitor}\tMonitor server state.
  ${usageLogs}\t\tDisplay and tail server logs.
  ${usageInfo}\t\tDisplay detailed server information.

  If ${usageCommand} is omitted, behaviour defaults to ${usageDev}.

  ${clr('Options:', 'underline')}

  ${usagePort}\tPort to start server on (defaults to 443).
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

// Version.
if (command.isVersion) {
  console.log(webServer.version())
  process.exit()
}

// Monitor (pm2 proxy).
if (command.isMonitor) {
  // Launch pm2 monit.
  const options = {
    env: process.env,
    stdio: 'inherit'  // Display output.
  }

  try {
    childProcess.execSync(`sudo ${pm2Path} monit`, options)
  } catch (error) {
    console.log(`\n 👿 Failed to launch the process monitor.\n`)
    process.exit(1)
  }
  process.exit(0)
}

// Logs (pm2 proxy).
if (command.isLogs) {
  // Launch pm2 logs.
  const options = {
    env: process.env,
    stdio: 'inherit'  // Display output.
  }

  try {
    childProcess.execSync(`sudo ${pm2Path} logs web-server`, options)
  } catch (error) {
    console.log(`\n 👿 Failed to get the logs.\n`)
    process.exit(1)
  }
  process.exit(0)
}

// Info (pm2 proxy).
if (command.isInfo) {
  // Launch pm2 logs.
  const options = {
    env: process.env,
    stdio: 'inherit'  // Display output.
  }

  try {
    childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
  } catch (error) {
    console.log(`\n 👿 Failed to show detailed information on the web server.\n`)
    process.exit(1)
  }
  process.exit(0)
}

// Offline (pm2 proxy for unstartup + delete)
if (command.isOff) {
  const options = {
    env: process.env,
    stdio: 'pipe'   // Suppress output.
  }

  // Do some cleanup, display a success message and exit.
  function success () {
    // Try to reset permissions on pm2 so that future uses of pm2 proxies via web-server
    // in this session will not require sudo.
    try {
      childProcess.execSync('sudo chown $(whoami):$(whoami) /home/$(whoami)/.pm2/rpc.sock /home/$(whoami)/.pm2/pub.sock', options)
    } catch (error) {
      console.log(`\n 👿 Warning: could not reset permissions on pm2.`)
    }

    // All’s good.
    console.log(`\n 😈 Server is offline and removed from startup items.\n`)
    process.exit(0)
  }

  // Is the server running?
  try {
    childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
  } catch (error) {
    console.log(`\n 👿 Server is not running as a live daemon; nothing to take offline.\n`)
    process.exit(1)
  }

  // Try to remove from startup items.
  try {
    childProcess.execSync(`sudo ${pm2Path} unstartup`, options)
  } catch (error) {
    console.log(`\n 👿 Could not remove the server from startup items.\n`)
    process.exit(1)
  }

  // If the server was started as a startup item, unstartup will also
  // kill the process. Check again to see if the server is running.
  try {
    childProcess.execSync(`sudo ${pm2Path} show web-server`, options)
  } catch (error) {
    success()
  }

  // The server is still on (it was not started as a startup item). Use
  // pm2 delete to remove it.
  try {
    childProcess.execSync(`sudo ${pm2Path} delete web-server`, options)
  } catch (error) {
    console.log(`\n 👿 Could not delete the server daemon.\n`)
    process.exit(1)
  }

  success()
}

// If no path is passed, serve the current folder (i.e., called with just web-server)
// If there is a path, serve that.
let pathToServe = '.'

if ((command.isDev || command.isTest || command.isOn) && positionalArguments.length === 2) {
// e.g., web-server on path-to-serve
pathToServe = secondPositionalArgument
} else if (!firstPositionalArgumentDidMatchCommand && (command.isDev || command.isTest || command.isOn) && positionalArguments.length === 1) {
  // e.g., web-server --on path-to-serve
  pathToServe = firstPositionalArgument
} else if (command.isDev && positionalArguments.lenght === 1) {
  // i.e., web-server path-to-serve
  pathToServe = firstPositionalArgument
}

// If a port is specified, use it. Otherwise use the default port (443).
let port = 443
if (arguments.port !== undefined) {
  port = parseInt(arguments.port)
}

// If a test server is specified, use it.
let global = false
if (command.isTest) {
  global = true
}

if (!fs.existsSync(pathToServe)) {
  console.log(` 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// If on is specified, run as a daemon using the pm2 process manager.
// Otherwise, start the server as a regular process.
if (command.isOn) {

  pm2.connect((error) => {
    if (error) {
      console.log(error)
      process.exit(1)
    }

    pm2.start({
      script: path.join(externalDirectory, 'bin/daemon.js'),
      args: pathToServe,
      name: 'web-server',
      autorestart: true
    }, (error, processObj) => {
      if (error) {
        throw error
      }

      console.log(`${webServer.version()}\n 😈 Launched as daemon on https://${os.hostname()} serving ${pathToServe}\n`)

      //
      // Run the script that tells the process manager to add the server to launch at startup
      // as a separate process with sudo privileges.
      //
      const options = {
        env: process.env,
        stdio: 'pipe'     // Suppress output.
      }

      try {
        const output = childProcess.execSync(`sudo ${pm2Path} startup`, options)
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
