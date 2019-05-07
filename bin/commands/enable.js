//////////////////////////////////////////////////////////////////////
//
// Command: enable
//
// Enables the web server daemon (launches it as a startup daemon).
//
//////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const tcpPortUsed = require('tcp-port-used')

const runtime = require('../lib/runtime')
const ensure = require('../lib/ensure')
const clr = require('../../lib/clr')

const webServer = require('../../index')

function enable (options) {
  //
  // Sanity checks.
  //
  ensure.systemctl()
  ensure.serverDaemonNotActive()

  // While we’ve already checked that the Indie Web Server daemon is not
  // active, above, it is still possible that there is another service
  // running on port 443. We could ignore this and enable the systemd
  // service anyway and this command would succeed and our server would
  // start being served when the blocking service is stopped. However, this
  // is misleading as the command succeeding makes it appear as if the
  // server has started running. So, instead, we detect if the port
  // is already in use and, if it is, refuse to install and activate the
  // service. This is should provide the least amount of surprise in usage.
  tcpPortUsed.check(options.port)
  .then(inUse => {
    if (inUse) {
      console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
      process.exit(1)
    } else {

      // Ensure we are root (we do this here instead of before the asynchronous call to
      // avoid any timing-related issues around a restart and a port-in-use error).
      ensure.root()

      //
      // Create the systemd service unit.
      //
      const pathToServe = options.pathToServe
      const binaryExecutable = '/usr/local/bin/web-server'
      const sourceDirectory = path.resolve(__dirname, '..', '..')
      const nodeExecutable = `node ${path.join(sourceDirectory, 'bin/web-server.js')}`
      const executable = runtime.isBinary ? binaryExecutable : nodeExecutable

      const absolutePathToServe = path.resolve(pathToServe)

      // Expectation: At this point, regardless of whether we are running as a regular
      // Node script or as a standalone executable created with Nexe, all paths should
      // be set correctly.

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

      //
      // If the sync option is specified, ensure that Rsync exists on the system.
      // (This will install it automatically if a supported package manager exists.)
      //
      if (options.enableSync) {
        ensureRsyncExists()
      }
    }
  })
}


// Does the passed command exist? Returns: bool.
function commandExists (command) {
    try {
      childProcess.execFileSync('which', [command], {env: process.env})
      return true
    } catch (error) {
      return false
    }
  }


function ensureRsyncExists() {
  if (commandExists('rsync')) return // Already installed

  print(' 🌠 [Indie Web Server] Installing Rsync dependency')
  let options = {env: process.env}
  try {
    if (commandExists('apt')) {
      print('using apt… \n')
      options.env.DEBIAN_FRONTEND = 'noninteractive'
      childProcess.execSync('sudo apt-get install -y -q rsync', options)
    } else if (commandExists('yum')) {
      // Untested: if you test this, please let me know https://github.com/indie-mirror/https-server/issues
      console.log('\n 🤪  [Indie Web Server] Attempting to install required dependency using yum. This is currently untested. If it works (or blows up) for you, I’d appreciate it if you could open an issue at https://github.com/indie-mirror/https-server/issues and let me know. Thanks! – Aral\n')
      childProcess.execSync('sudo yum install rsync', options)
      console.log(' 🎉 [Indie Web Server] Rsync installed using yum.')
    } else if (commandExists('pacman')) {
      childProcess.execSync('sudo pacman -S rsync', options)
      console.log(' 🎉 [Indie Web Server] Rsync installed using pacman.')
    } else {
    // No supported package managers installed. Warn the person.
    console.log('\n ⚠️  [Indie Web Server] Linux: No supported package manager found for installing Rsync on Linux (tried apt, yum, and pacman). Please install Rsync manually and run Indie Web Server again.\n')
    }
  } catch (error) {
    // There was an error and we couldn’t install the dependency. Warn the person.
    console.log('\n ⚠️  [Indie Web Server] Linux: Failed to install Rsync. Please install it manually and run Indie Web Server again.\n', error)
  }
}


module.exports = enable
