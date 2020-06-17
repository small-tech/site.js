//////////////////////////////////////////////////////////////////////
//
// Function: start
//
// Starts the Site.js server daemon.
//
//////////////////////////////////////////////////////////////////////

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

  console.log('\n   🎈    ❨site.js❩ Server started.\n')
}

module.exports = start
