//////////////////////////////////////////////////////////////////////
//
// Command: status
//
// Displays the Site.js server daemon status.
//
// Proxies: systemctl status web-server
//
//////////////////////////////////////////////////////////////////////

const Site = require('../../index')
const getStatus = require('../lib/status')
const clr = require('../../lib/clr')
const ensure = require('../lib/ensure')

function status () {
  Site.logAppNameAndVersion()

  // Ensure systemctl exists as it is required for getStatus().
  // We cannot check in the function itself as it would create
  // a circular dependency.
  ensure.systemctl()
  const { isActive, isEnabled } = getStatus()

  const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
  const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

  const stateEmoji = (isActive && isEnabled) ? '💡' : '🛑'

  console.log(`   ${stateEmoji}    ❨site.js❩ Server is ${activeState} and ${enabledState}.\n`)
}

module.exports = status
