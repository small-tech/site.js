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

//
// Display usage/help.
//
if (arguments._.length > 2 || arguments.help === true) {

  const usageCommand = `${clr('command', 'green')}`
  const usageFolderToServe = clr('folder', 'cyan')
  const usagePort = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`
  const usageDev = `${clr('dev', 'yellow')}`
  const usageTest = `${clr('test', 'yellow')}`
  const usageOn = `${clr('on', 'yellow')}`
  const usageOff = `${clr('off', 'yellow')}`
  const usageMonitor = `${clr('monitor', 'yellow')}`
  const usageLogs = `${clr('logs', 'yellow')}`
  const usageInfo = `${clr('info', 'yellow')}`
  const usageVersion = `${clr('version', 'yellow')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageCommand}] [${usageFolderToServe}] [${clr('options', 'yellow')}]

  ${usageCommand}\t${usageVersion} | ${usageDev} | ${usageTest} | ${usageOn} | ${usageOff} | ${usageMonitor} | ${usageLogs} | ${usageInfo} (details below).
  ${usageFolderToServe}\tPath to the folder to serve (defaults to current folder).

  ${clr('Commands:', 'underline')}

  ${usageVersion}\tDisplay the version and exit.

  ${usageDev}\t\tLaunch server as regular process with locally-trusted certificates.
  ${usageTest}\t\tLaunch server as regular process with globally-trusted certificates.
  ${usageOn}\t\tLaunch server as startup daemon with globally-trusted certificates.

  When the server is on, you can also:

  ${usageOff}\t\tTake the server offline and remove it from startup items.
  ${usageMonitor}\tMonitor the server.
  ${usageLogs}\t\tDisplay and tail the server logs.
  ${usageInfo}\t\tDisplay detailed information about the server.

  If ${usageCommand} is omitted, behaviour will default to ${usageDev}.

  ${clr('Options:', 'underline')}

  ${usagePort}\t\tThe port to start the server on (defaults to 443).
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
if (arguments.logs !== undefined) {
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
if (arguments.info !== undefined) {
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
if (arguments.offline !== undefined) {
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
      script: path.join(externalDirectory, 'bin/daemon.js'),
      args: pathToServe,
      name: 'web-server',
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
