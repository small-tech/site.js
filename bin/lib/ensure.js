//////////////////////////////////////////////////////////////////////
//
// Ensure: provides functions that ensure that certain
// ======= expected conditions exist in the runtime environment.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const path = require('path')
const runtime = require('./runtime')
const getStatus = require('./status')

const clr = require('../../lib/clr')

class Ensure {

  // Does the passed command exist? Returns: bool.
  commandExists (command) {
    try {
      childProcess.execFileSync('which', [command], {env: process.env})
      return true
    } catch (error) {
      return false
    }
  }


  // Ensure we have root privileges and exit if we don’t.
  root () {
    if (process.getuid() !== 0) {
      // Requires root but wasn’t run with sudo. Automatically restart using sudo.
      const options = {env: process.env, stdio: 'inherit'}
      if (runtime.isNode) {
        childProcess.execSync(`sudo node ${path.resolve(path.join(__dirname, '..', 'web-server.js'))} ${process.argv.slice(2).join(' ')}`, options)
      } else {
        childProcess.execSync(`sudo web-server ${process.argv.slice(2).join(' ')}`, options)
      }
      process.exit(0)
    }
  }


  // Ensure systemctl exists.
  systemctl () {
    if (!this.commandExists('systemctl')) {
      console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (systemctl required).\n')
      process.exit(1)
    }
  }


  // Ensure journalctl exists.
  journalctl () {
    if (!this.commandExists('journalctl')) {
      console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (journalctl required).\n')
      process.exit(1)
    }
  }

  // Ensures that the server daemon is not currently active.
  serverDaemonNotActive () {
    // Ensure systemctl exists as it is required for getStatus().
    // We cannot check in the function itself as it would create
    // a circular dependency.
    this.systemctl()
    const { isActive } = getStatus()

    if (isActive) {
      console.error(`\n 👿 Indie Web Server Daemon is already running.\n\n    ${clr('Please stop it first with the command:', 'yellow')} web-server ${clr('disable', 'green')}\n`)
      process.exit(1)
    }
  }

  // If the sync option is specified, ensure that Rsync exists on the system.
  // (This will install it automatically if a supported package manager exists.)
  rsyncExists() {
    if (this.commandExists('rsync')) return // Already installed

    console.log(' 🌠 [Indie Web Server] Installing Rsync dependency…')
    let options = {env: process.env}
    try {
      if (this.commandExists('apt')) {
        options.env.DEBIAN_FRONTEND = 'noninteractive'
        childProcess.execSync('sudo apt-get install -y -q rsync', options)
        console.log(' 🎉 [Indie Web Server] Rsync installed using apt.\n')
      } else if (this.commandExists('yum')) {
        // Untested: if you test this, please let me know https://github.com/indie-mirror/https-server/issues
        console.log('\n 🤪  [Indie Web Server] Attempting to install required dependency using yum. This is currently untested. If it works (or blows up) for you, I’d appreciate it if you could open an issue at https://github.com/indie-mirror/https-server/issues and let me know. Thanks! – Aral\n')
        childProcess.execSync('sudo yum install rsync', options)
        console.log(' 🎉 [Indie Web Server] Rsync installed using yum.')
      } else if (this.commandExists('pacman')) {
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

}

module.exports = new Ensure()
