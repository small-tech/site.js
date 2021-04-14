//////////////////////////////////////////////////////////////////////
//
// Function: stop
//
// Stops the Site.js server daemon.
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

// Note: Ensure that systemctl exists and app is root before calling this function.
function stop () {

  const { isActive } = status()

  if (!isActive) {
    throwError('Site.js server is not active. Nothing to stop.')
  }

  try {
    // Stop the web server.
    childProcess.execSync('sudo systemctl stop site.js', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not stop Site.js server (${error}).`)
  }

  // Also see if we should stop the Owncast service.
  const systemdServicesDirectory = path.join('/', 'etc', 'systemd', 'system')
  const owncastServiceFilePath = path.join(systemdServicesDirectory, 'owncast.service')
  if (fs.existsSync(owncastServiceFilePath)) {
    console.log('   💮️    ❨site.js❩ Also stopping Owncast service.')
    try {
      // Start the Owncast service.
      childProcess.execSync('sudo systemctl stop owncast', {env: process.env, stdio: 'pipe'})
    } catch (error) {
      throwError(`Could not stop Owncast service (${error}).`)
    }
  }

  console.log('\n   🎈    ❨site.js❩ Server stopped.\n')
}

module.exports = stop
