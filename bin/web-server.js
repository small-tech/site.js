#!/usr/bin/env node
const os = require('os')
const fs = require('fs')
const path = require('path')
const ansi = require('ansi-escape-sequences')
const webServer = require('../index.js')

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
    console.log(webServer.version())
    process.exit()
  break

  // Logs (proxy: journalctl --follow --unit web-server)
  case command.isLogs:
    ensureJournalctl()

    console.log(`\n 📜 Tailing logs (press Ctrl+C to exit).\n`)

    childProcess.spawn('journalctl', ['--follow', '--unit', 'web-server'], {env: process.env, stdio: 'inherit'})
  break

  // Status (proxy: systemctl status web-server)
  case command.isStatus:
    ensureSystemctl()

    let isActive
    try {
      childProcess.execSync('systemctl is-active web-server', {env: process.env, stdio: 'pipe'})
      isActive = true
    } catch (error) {
      isActive = false
    }

    let isEnabled
    try {
      childProcess.execSync('systemctl is-enabled web-server', {env: process.env, stdio: 'pipe'})
      isEnabled = true
    } catch (error) {
      isEnabled = false
    }

    const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
    const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

    const stateEmoji = (isActive && isEnabled) ? '✔' : '❌'

    console.log(`\n ${stateEmoji} Indie Web Server is ${activeState} and ${enabledState}.\n`)
  break

  // Off (turn off the server daemon and remove it from startup items).
  case command.isDisable:
    ensureSystemctl()
    ensureRoot('disable')
    try {
      childProcess.execSync('sudo systemctl disable web-server', {env: process.env, stdio: 'pipe'})
      childProcess.execSync('sudo systemctl stop web-server', {env: process.env, stdio: 'pipe'})
      console.log('\n 🎈 Server stopped and removed from startup.\n')
    } catch (error) {
      console.error(`\n 👿 Error: Could not disable web server.\n ${error}`)
      process.exit(1)
    }
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
      // e.g., web-server --on path-to-serve
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
    // Launch as a reverse proxy (local mode), startup daemon, or regular process?
    //
    if (isProxy) {
      //
      // Proxy HTTP → HTTPS and WS → WSS.
      //
      const proxy = require('http-proxy-middleware')
      const express = require('express')
      const app = express()

      console.log(webServer.version())

      webServer.ensureWeCanBindToPort(port)

      const server = webServer.createServer({}, app).listen(port, () => {
        console.log(`\n 🚚 [Indie Web Server] Proxying: HTTPS/WSS on localhost:${port} ←→ HTTP/WS on ${pathToServe.replace('http://', '')}\n`)

      function prettyLog (message) {
        console.log(` 🔁 ${message}`)
      }

      const logProvider = function(provider) {
        return { log: prettyLog, debug: prettyLog, info: prettyLog, warn: prettyLog, error: prettyLog }
      }

      const webSocketProxy = proxy(pathToServe.replace('http://', 'ws://'), {
        ws: true,
        changeOrigin:false,
        logProvider,
        logLevel: 'info'
      })

      const httpsProxy = proxy({
        target: pathToServe,
        changeOrigin: true,
        logProvider,
        logLevel: 'info',

        //
        // Special handling of LiveReload implementation bug in Hugo
        // (https://github.com/gohugoio/hugo/issues/2205#issuecomment-484443057)
        // to work around the port being hardcoded to the Hugo server
        // port (instead of the port that the page is being served from).
        //
        // This enables you to use Indie Web Server as a reverse proxy
        // for Hugo during development time and test your site from https://localhost
        //
        // All other content is left as-is.
        //
        onProxyRes: (proxyResponse, request, response) => {
          const _write = response.write

          // As we’re going to change it.
          delete proxyResponse.headers['content-length']

          response.write = function (data) {
            let output = data.toString('utf-8')
            if (output.match(/livereload.js\?port=1313/) !== null) {
              console.log(' 📝 [Indie Web Server] Rewriting Hugo LiveReload URL to use WebSocket proxy.')
              output = output.replace('livereload.js?port=1313', `livereload.js?port=${port}`)
              _write.call(response, output)
            } else {
              _write.call(response, data)
            }
          }
        }
      })

      app.use(httpsProxy)
      app.use(webSocketProxy)


      // As we’re using a custom server, manually listen for the http upgrade event
      // and upgrade the web socket proxy also.
      // (See https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade)
      server.on('upgrade', webSocketProxy.upgrade)
      })

    } else if (command.isEnable) {
      //
      // Launch as startup daemon.
      //

      ensureSystemctl()
      ensureRoot('enable')

      //
      // Create the systemd service unit.
      //
      const binaryExecutable = '/usr/local/bin/web-server'
      const nodeExecutable = `node ${path.join(sourceDirectory, 'bin/web-server.js')}`
      const executable = runtime.isBinary ? binaryExecutable : nodeExecutable

      const absolutePathToServe = path.resolve(pathToServe)

      // Get the regular account name (i.e, the unprivileged account that is
      // running the current process via sudo).
      const accountUID = parseInt(process.env.SUDO_UID)
      if (!accountUID) {
        console.error(`\n 👿 Error: could not get account ID.\n`)
        process.exit(1)
      }

      let accountName
      try {
        // Courtesy: https://www.unix.com/302402784-post4.html
        accountName = childProcess.execSync(`awk -v val=${accountUID} -F ":" '$3==val{print $1}' /etc/passwd`, {env: process.env, stdio: 'pipe'}).toString()
      } catch (error) {
        console.error(`\n 👿 Error: could not get account name \n${error}.`)
        process.exit(1)
      }

      const unit = `[Unit]
      Description=Indie Web Server
      Documentation=https://ind.ie/web-server/
      After=network.target
      StartLimitIntervalSec=0

      [Service]
      Type=simple
      User=${accountName}
      Environment=PATH=/sbin:/usr/bin:/usr/local/bin
      Environment=NODE_ENV=production
      RestartSec=1
      Restart=always

      ExecStart=${executable} global ${absolutePathToServe}

      [Install]
      WantedBy=multi-user.target
      `

      // Save the systemd service unit.
      fs.writeFileSync('/etc/systemd/system/web-server.service', unit, 'utf-8')

      //
      // Enable and start systemd service.
      //
      try {
        // Start.
        childProcess.execSync('sudo systemctl start web-server', {env: process.env, stdio: 'pipe'})
        console.log(`${webServer.version()}\n 😈 Launched as daemon on ${clr(`https://${os.hostname()}`, 'green')} serving ${clr(pathToServe, 'cyan')}\n`)

        // Enable.
        childProcess.execSync('sudo systemctl enable web-server', {env: process.env, stdio: 'pipe'})
        console.log(` 😈 Installed for auto-launch at startup.\n`)
      } catch (error) {
        console.error(error, `\n 👿 Error: could not enable web server.\n`)
        process.exit(1)
      }
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

// Ensure we have root privileges and exit if we don’t.
function ensureRoot (commandName) {
  if (process.getuid() !== 0) {
    // Requires root but wasn’t run with sudo. Automatically restart using sudo.
    const options = {env: process.env, stdio: 'inherit'}
    if (runtime.isNode) {
      childProcess.execSync(`sudo node ${path.join(__dirname, 'web-server.js')} ${process.argv.slice(2).join(' ')}`, options)
    } else {
      childProcess.execSync(`sudo web-server ${process.argv.slice(2).join(' ')}`, options)
    }
    process.exit(0)
  }
}

// Ensure systemctl exists.
function ensureSystemctl () {
  try {
    childProcess.execSync('which systemctl', {env: process.env})
  } catch (error) {
    console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (systemctl required).\n')
    process.exit(1)
  }
}

// Ensure systemctl exists.
function ensureJournalctl () {
  try {
    childProcess.execSync('which journalctl', {env: process.env})
  } catch (error) {
    console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (journalctl required).\n')
    process.exit(1)
  }
}
