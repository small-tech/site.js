//////////////////////////////////////////////////////////////////////
//
// Command: status
//
// Displays the web server daemon status.
//
// Proxies: systemctl status web-server
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const ensure = require('../utilities/ensure')
const clr = require('../utilities/cli').clr

function status () {
  ensure.systemctl()

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

  const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
  const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

  const stateEmoji = (isActive && isEnabled) ? '✔' : '❌'

  console.log(`\n ${stateEmoji} Indie Web Server is ${activeState} and ${enabledState}.\n`)
}

module.exports = status
