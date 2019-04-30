//////////////////////////////////////////////////////////////////////
//
// Command: status
//
// Displays the web server daemon status.
//
// Proxies: systemctl status web-server
//
//////////////////////////////////////////////////////////////////////

const getStatus = require('../lib/status')
const clr = require('../lib/cli').clr

function status () {
  const { isActive, isEnabled } = getStatus()

  const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
  const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

  const stateEmoji = (isActive && isEnabled) ? '✔' : '❌'

  console.log(`\n ${stateEmoji} Indie Web Server is ${activeState} and ${enabledState}.\n`)
}

module.exports = status
