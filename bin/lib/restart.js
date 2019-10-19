//////////////////////////////////////////////////////////////////////
//
// Function: restart
//
// Restarts the Site.js server daemon.
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')

const status = require('../lib/status')

function throwError(errorMessage) {
  console.log(` 👿 Error: ${errorMessage}\n`)
  throw new Error(errorMessage)
}

function restart () {

  // Note: Ensure that systemctl exists and app is root before calling this function.

  const { isEnabled } = status()

  if (!isEnabled) {
    throwError('Site.js daemon is not enabled. Please run site enable to enable it.')
  }

  // Note: we mirror systemctl’s behaviour: even if the service is stopped, running
  // ===== restart will start it instead of throwing an error. That’s why we don’t check
  //       if the server is running here.

  try {
    // Restart the web server.
    childProcess.execSync('sudo systemctl restart site.js', {env: process.env, stdio: 'pipe'})
  } catch (error) {
    throwError(`Could not restart Site.js server (${error}).`)
  }

  console.log(' 🎈 Server restarted.\n')
}

module.exports = restart
