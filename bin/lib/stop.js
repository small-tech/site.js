//////////////////////////////////////////////////////////////////////
//
// Function: stop
//
// Stops the Site.js server daemon.
//
//////////////////////////////////////////////////////////////////////

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

  console.log('\n   🎈    ❨site.js❩ Server stopped.\n')
}

module.exports = stop
