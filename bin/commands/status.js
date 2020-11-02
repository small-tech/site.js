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
const crossPlatformHostname = require('@small-tech/cross-platform-hostname')
const ensure = require('../lib/ensure')

function status () {
  Site.logAppNameAndVersion()

  // Ensure systemctl exists as it is required for getStatus().
  // We cannot check in the function itself as it would create
  // a circular dependency.
  ensure.systemctl()
  const { isActive, isEnabled, daemonDetails } = getStatus()

  const activeState = isActive ? clr('active', 'green') : clr('inactive', 'red')
  const enabledState = isEnabled ? clr('enabled', 'green') : clr('disabled', 'red')

  const stateEmoji = (isActive && isEnabled) ? '💡' : '🛑'

  console.log(`   ${stateEmoji}    ❨site.js❩ Server is ${activeState} and ${enabledState}.`)

  if (daemonDetails !== null) {
    const textColour = isActive ? 'green' : 'red'

    if (isActive) {
      console.log(`\n         Stats  : ${clr(daemonDetails.statisticsUrl, textColour)}`)
    }

    console.log(`\n         Path   : ${clr(daemonDetails.pathBeingServed, textColour)}`)
    console.log(`         Domain : ${clr(daemonDetails.optionalOptions.domain, 'yellow') || clr(crossPlatformHostname, daemonDetails.optionalOptions.skipDomainReachabilityCheck && isActive ? 'yellow' : textColour)}`)
    console.log(`         Account: ${clr(daemonDetails.account, textColour)}`)
    console.log(`         Binary : ${clr(daemonDetails.siteJSBinary, textColour)}`)

    if (daemonDetails.optionalOptions.aliases !== null) {
      const aliasesString = daemonDetails.optionalOptions.aliases.reduce(
        (str, alias) => `${str}${clr(alias, textColour)}, `,
        ''
      )
      console.log(`         Aliases: ${aliasesString.replace(/, $/, '')}`)
    }

    if (daemonDetails.optionalOptions.accessLogErrorsOnly && !daemonDetails.optionalOptions.accessLogDisable) {
      console.log(`\n         ${clr('Access log is only showing errors.', 'yellow')}`)
    }

    if (daemonDetails.optionalOptions.accessLogDisable) {
      console.log(`\n         ${clr('Access log is disabled (not even errors will be shown).', 'yellow')}`)
    }

    if (daemonDetails.optionalOptions.skipDomainReachabilityCheck) {
      console.log(`\n         ${clr('Domain reachability pre-flight check is disabled.', 'yellow')}`)
    }
  }

  console.log('')
}

module.exports = status
