#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

const pm2 = require('pm2')
const childProcess = require('child_process')
const arguments = require('minimist')(process.argv.slice(2), {boolean: true})

// //
// // When run as a regular Node script, the source directory is our parent
// // directory (web-server.js resides in the <sourceDirectory>/bin directory).
// // However, when run as a standalone executable using Nexe, we currently have
// // to bundle the source code in the executable and copy it from the virtual
// // filesystem of the binary to the external file system in order to run the
// // pm2 process manager using execSync.
// //
// // For more information, please see the following issues in the Nexe repo:
// //
// // https://github.com/nexe/nexe/issues/605
// // https://github.com/nexe/nexe/issues/607
// //
const runtime = {
  isNode: process.argv0 === 'node',
  isBinary: process.argv0 === 'web-server'
}

let sourceDirectory = path.resolve(__dirname, '..')

// if (runtime.isBinary) {
//   // This is the directory that will house a copy of the source code.
//   // Scripts and other processes are launched from here so that they work
//   // properly when Indie Web Server is wrapped into native binaries using Nexe.
//   sourceDirectory = path.join(os.homedir(), '.indie-web-server')

//   // This is the directory that we will copy the source code to (as a single
//   // zip file, before unzipping it into sourceDirectory.)
//   const zipFilePath = path.join(os.homedir(), 'web-server.zip')

//   // If the external directory (and, thereby, the external copy of our
//   // bundled source code) doesn’t exist, copy it over and unzip it.
//   if (!fs.existsSync(sourceDirectory)) {
//     try {
//       //
//       // Note: we are copying the node_modules.zip file using fs.readFileSync()
//       // ===== and fs.writeFileSync() instead of fs.copyFileSync() as the latter
//       //       does not work currently in binaries that are compiled with
//       //       Nexe (tested with version 3.1.0). See these issues for more details:
//       //
//       //       https://github.com/nexe/nexe/issues/605 (red herring)
//       //       https://github.com/nexe/nexe/issues/607 (actual issue)
//       //
//       // fs.copyFileSync(internalZipFilePath, zipFilePath)
//       //
//       const internalZipFilePath = path.join(__dirname, '../web-server.zip')
//       const webServerZip = fs.readFileSync(internalZipFilePath, 'binary')
//       fs.writeFileSync(zipFilePath, webServerZip, 'binary')

//       // Unzip the node_modules
//       const options = {
//         env: process.env,
//         stdio: 'inherit'  // Display output.
//       }

//       // Unzip the node_modules directory to the external directory.
//       childProcess.execSync(`unzip ${zipFilePath} -d ${sourceDirectory}`)

//     } catch (error) {
//       console.log(' 💥 Failed to copy Indie Web Server source code to external directory.', error)
//       process.exit(1)
//     }
//   }
// }

// The path that we expect the PM2 process manager’s source code to reside
// at in the external directory.
const pm2Path = path.join(sourceDirectory, 'node_modules/pm2/bin/pm2')

// At this point, regardless of whether we are running as a regular Node script or
// as a standalone executable created with Nexe, all paths should be correctly set.

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

const firstPositionalArgumentDidMatchCommand = ['version', 'help', 'test', 'on', 'off', 'monitor', 'logs', 'info'].reduce((p, n) => p || (firstPositionalArgument === n), false)

// Help / usage instructions.
if (command.isHelp) {
  const usageCommand = `${clr('command', 'green')}`
  const usageFolderToServe = clr('folder', 'cyan')
  const usageOptions = clr('options', 'yellow')
  const usageVersion = `${clr('version', 'green')}`
  const usageHelp = `${clr('help', 'green')}`
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

  ${usageCommand}\t${usageVersion} | ${usageHelp} | ${usageDev} | ${usageTest} | ${usageOn} | ${usageOff} | ${usageMonitor} | ${usageLogs} | ${usageInfo}
  ${usageFolderToServe}\tPath of folder to serve (defaults to current folder).
  ${usageOptions}\tSettings that alter server characteristics.

  ${clr('Commands:', 'underline')}

  ${usageVersion}\tDisplay version and exit.
  ${usageHelp}\t\tDisplay this help screen and exit.

  ${usageDev}\t\tLaunch server as regular process with locally-trusted certificates.
  ${usageTest}\t\tLaunch server as regular process with globally-trusted certificates.
  ${usageOn}\t\tLaunch server as startup daemon with globally-trusted certificates.

  When server is on, you can also use:

  ${usageOff}\t\tTurn server off and remove it from startup items.
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

//
// Execute requested command.
//
switch (true) {
  // Version
  case command.isVersion:
    console.log(webServer.version())
    process.exit()
  break

  // Monitor (proxy: pm2 monit)
  case command.isMonitor:
    childProcess.fork(pm2Path, ['monit'], {env: process.env})
  break

  // Logs (proxy: pm2 logs web-server)
  case command.isLogs:
    childProcess.fork(pm2Path, ['logs', 'web-server'], {env: process.env})
  break

  // Info (proxy: pm2 show web-server)
  case command.isInfo:
    childProcess.fork(pm2Path, ['show', 'web-server'], {env: process.env})
  break

  // Off (turn off the server daemon and remove it from startup items).
  case command.isOff:
    const options = {
      env: process.env,
      stdio: 'inherit'   // Show output OLD: 'pipe': Suppress output.
    }

    // First, check if we are running with superuser privileges. If not,
    // respawn the process using sudo.
    if (process.getuid() !== 0) {
      console.log('Not running with superuser privileges. Relaunching.')
      childProcess.spawn('sudo', ['node', 'bin/web-server.js', 'off'], options)
      process.exit(0)
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
    const showInfoProcess = childProcess.fork(pm2Path, ['show', 'web-server'], options)
    showInfoProcess.on('error', error => {
      console.log(`\n 👿 Error: could not check if daemon is running.\n`)
      console.log(error)
      process.exit(1)
    })
    showInfoProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        console.log(`\n 👿 Server is not running as a live daemon; nothing to take offline.\n`)
        process.exit(1)
      } else {
        // OK, server is running. Try to remove it from startup items.
        const unstartupProcess = childProcess.fork(pm2Path, ['unstartup'], options)
        unstartupProcess.on('error', error => {
          console.log(`\n 👿 Error: could not run pm2 unstartup process.\n`)
          console.log(error)
          process.exit(1)
        })
        unstartupProcess.on('exit', (code, signal) => {
          if (code !== 0) {
            console.log(`\n 👿 Could not remove server from startup items.\n`)
            process.exit(1)
          } else {
            // OK, server was removed from startup items.
            // If the server was started as a startup item, unstartup will also
            // kill the process. Check again to see if the server is running.
            const showInfoProcess2 = childProcess.fork(pm2Path, ['show', 'web-server'], options)
            showInfoProcess2.on('error', error => {
              console.log(`\n 👿 Error: could not check if daemon is running (second check).\n`)
              console.log(error)
              process.exit(1)
            })
            showInfoProcess2.on('exit', (code, signal) => {
              if (code !== 0) {
                // Server is not running. This is what we want at this point.
                console.log('startup item removal also deleted process')
                success()
              } else {
                // The server is still on (it was not started as a startup item). Use
                // pm2 delete to remove it.
                const deleteProcess = childProcess.fork(pm2Path, ['delete', 'web-server'], options)
                deleteProcess.on('error', error => {
                  console.log(`\n 👿 Error: could not launch the delete web server process.\n`)
                  console.log(error)
                  process.exit(1)
                })
                deleteProcess.on('exit', (code, signal) => {
                  if (code !== 0) {
                    console.log(`\n 👿 Could not delete the server daemon.\n`)
                    process.exit(1)
                  } else {
                    // The web server process was deleted.
                    console.log('process deleted')
                    success()
                  }
                })
              }
            })
          }
        })
      }
    })
  break

  // Default: run the server (either for development, testing (test), or production (on))
  default:
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
          console.log(`\n 👿 Could not connect to pm2 god daemon.\n`)
          console.log(error)
          process.exit(1)
        }

        // let daemonPath = 'bin/daemon.js'
        // if (runtime.isBinary) {
        //   daemonPath = 'daemon.js'
        // }

        pm2.start({
          script: path.join(sourceDirectory, 'bin/daemon.js'),
          args: pathToServe,
          name: 'web-server',
          autorestart: true
        }, (error, processObj) => {
          if (error) {
            console.log(`\n 👿 Could not start the web server daemon.\n`)
            console.log(error)
            process.exit(1)
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

          const startupProcess = childProcess.fork(pm2Path, ['startup'], options)
          startupProcess.on('error', error => {
            console.log(` 👿 Failed to launch pm2 startup process.\n`)
            pm2.disconnect()
            process.exit(1)
          })
          startupProcess.on('exit', (code, signal) => {
            if (code !== 0) {
              console.log(` 👿 Failed to add server for auto-launch at startup.\n`)
              pm2.disconnect()
              process.exit(1)
            }

            console.log(` 😈 Installed for auto-launch at startup.\n`)

            // Disconnect from the pm2 daemon. This will also exit the script.
            pm2.disconnect()
          })
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
  break
}

//
// Helpers.
//

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
