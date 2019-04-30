//////////////////////////////////////////////////////////////////////
//
// Ensure: provides functions that ensure that certain
// ======= expected conditions exist in the runtime environment.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const path = require('path')
const runtime = require('./runtime')

class Ensure {
  // Ensure we have root privileges and exit if we don’t.
  root (commandName) {
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
    try {
      childProcess.execSync('which systemctl', {env: process.env})
    } catch (error) {
      console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (systemctl required).\n')
      process.exit(1)
    }
  }

  // Ensure journalctl exists.
  journalctl () {
    try {
      childProcess.execSync('which journalctl', {env: process.env})
    } catch (error) {
      console.error('\n 👿 Sorry, daemons are only supported on Linux systems with systemd (journalctl required).\n')
      process.exit(1)
    }
  }
}

module.exports = new Ensure()
