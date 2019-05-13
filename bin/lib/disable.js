//////////////////////////////////////////////////////////////////////
//
// Function: disable
//
// Disables the web server daemon (stops it and removes it
// from startup items).
//
//////////////////////////////////////////////////////////////////////

const fs = require('fs')
const childProcess = require('child_process')

const status = require('../lib/status')
const ensure = require('../lib/ensure')

function throwError(errorMessage) {
  console.log(`\n 👿 Error: ${errorMessage}\n`)
  throw new Error(errorMessage)
}


function disable () {

  ensure.systemctl()

  const { isActive, isEnabled } = status()

  if (!isEnabled) {
    throwError('Server is not enabled. Nothing to disable.')
  }

  ensure.root('disable')

  try {
    // Disable and stop the web server.
    childProcess.execSync('sudo systemctl disable web-server', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl stop web-server', {env: process.env, stdio: 'pipe'})
    try {
      // And remove the systemd service file we created.
      fs.unlinkSync('/etc/systemd/system/web-server.service')
    } catch (error) {
      throwError(`Web server disabled but could not delete the systemd service file (${error}).`)
    }
  } catch (error) {
    throwError(`Could not disable web server (${error}).`)
  }
}

module.exports = disable
