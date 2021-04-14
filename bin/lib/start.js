//////////////////////////////////////////////////////////////////////
//
// Function: start
//
// Starts the Site.js server daemon.
//
//////////////////////////////////////////////////////////////////////

const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const status = require('../lib/status')
const clr = require('../../lib/clr')

function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(errorMessage)
}

function start () {

  // Note: Ensure that systemctl exists and app is root before calling this function.

  const { isActive, isEnabled } = status()

  if (!isEnabled) {
    throwError('Site.js daemon is not enabled. Please run site enable to enable it.')
  }

  if (isActive) {
    throwError('Site.js server is already active. Nothing to start.')
  }

  try {
    // Start the web server.
    childProcess.execSync('sudo systemctl start site.js', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not start Site.js server (${error}).`)
  }

  // Also see if we should start the Owncast service.
  const systemdServicesDirectory = path.join('/', 'etc', 'systemd', 'system')
  const owncastServiceFilePath = path.join(systemdServicesDirectory, 'owncast.service')
  if (fs.existsSync(owncastServiceFilePath)) {
    console.log('   💮️    ❨site.js❩ Also starting Owncast service.')
    try {
      // Start the Owncast service.
      childProcess.execSync('sudo systemctl start owncast', {env: process.env, stdio: 'pipe'})
    } catch (error) {
      throwError(`Could not start Owncast service (${error}).`)
    }
  }

  console.log('\n   🎈    ❨site.js❩ Server started.\n')
}

module.exports = start
