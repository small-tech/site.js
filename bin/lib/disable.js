//////////////////////////////////////////////////////////////////////
//
// Function: disable
//
// Disables the Site.js server daemon (stops it and removes it
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
    throwError('Site.js server is not enabled. Nothing to disable.')
  }

  ensure.root('disable')

  try {
    // Disable and stop the web server.
    childProcess.execSync('sudo systemctl disable site.js', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl stop site.js', {env: process.env, stdio: 'pipe'})
    try {
      // And remove the systemd service file we created.
      fs.unlinkSync('/etc/systemd/system/site.js.service')
    } catch (error) {
      throwError(`Site.js server disabled but could not delete the systemd service file (${error}).`)
    }
  } catch (error) {
    throwError(`Could not disable Site.js server (${error}).`)
  }
}

module.exports = disable
