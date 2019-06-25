//////////////////////////////////////////////////////////////////////
//
// Function: status (synchronous)
//
// Returns the Site.js server daemon status.
//
// Proxies: systemctl status site.js
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')

function status () {

  // Note: do not call ensure.systemctl() here as it will
  // ===== create a cyclic dependency. Instead, check for
  //       systemctl support manually before calling status().

  let isActive
  try {
    childProcess.execSync('systemctl is-active site.js', {env: process.env, stdio: 'pipe'})
    isActive = true
  } catch (error) {
    isActive = false
  }

  let isEnabled
  try {
    childProcess.execSync('systemctl is-enabled site.js', {env: process.env, stdio: 'pipe'})
    isEnabled = true
  } catch (error) {
    isEnabled = false
  }

  return { isActive, isEnabled }
}

module.exports = status
