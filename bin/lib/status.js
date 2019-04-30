//////////////////////////////////////////////////////////////////////
//
// Function: status (synchronous)
//
// Returns the web server daemon status.
//
// Proxies: systemctl status web-server
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')

function status () {

  let isActive
  try {
    childProcess.execSync('systemctl is-active web-server', {env: process.env, stdio: 'pipe'})
    isActive = true
  } catch (error) {
    isActive = false
  }

  let isEnabled
  try {
    childProcess.execSync('systemctl is-enabled web-server', {env: process.env, stdio: 'pipe'})
    isEnabled = true
  } catch (error) {
    isEnabled = false
  }

  return { isActive, isEnabled }
}

module.exports = status
