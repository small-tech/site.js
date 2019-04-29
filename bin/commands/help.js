//////////////////////////////////////////////////////////////////////
//
// Command: help
//
// Displays the help screen and exits.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')
const clr = require('../utilities/cli').clr

function help () {
  const usageCommand = `${clr('command', 'green')}`
  const usageFolderToServe = `${clr('folder', 'cyan')}${clr('|url', 'darkgrey')}`
  const usageOptions = clr('options', 'yellow')

  const usageVersion = `${clr('version', 'green')}`
  const usageHelp = `${clr('help', 'green')}`
  const usageLocal = `${clr('local', 'green')}`
  const usageGlobal = `${clr('global', 'green')}`
  const usageEnable = `${clr('enable', 'green')}`
  const usageDisable = `${clr('disable', 'green')}`
  const usageLogs = `${clr('logs', 'green')}`
  const usageStatus = `${clr('status', 'green')}`

  const usagePort = `${clr('--port', 'yellow')}=${clr('N', 'cyan')}`

  const usage = `
   ${webServer.version()}
  ${clr('Usage:', 'underline')}

  ${clr('web-server', 'bold')} [${usageCommand}] [${usageFolderToServe}] [${usageOptions}]

  ${usageCommand}\t\t${usageVersion} | ${usageHelp} | ${usageLocal} | ${usageGlobal} | ${usageEnable} | ${usageDisable} | ${usageLogs} | ${usageStatus}
  ${usageFolderToServe}\tPath of folder to serve (defaults to current folder) or HTTP URL to reverse proxy.
  ${usageOptions}\t\tSettings that alter server characteristics.

  ${clr('Commands:', 'underline')}

  ${usageVersion}\tDisplay version and exit.
  ${usageHelp}\tDisplay this help screen and exit.

  ${usageLocal}\tStart server as regular process with locally-trusted certificates.
  ${usageGlobal}\tStart server as regular process with globally-trusted certificates.

  On Linux distributions with systemd, you can also use:

  ${usageEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
  ${usageDisable}\tStop server daemon and remove from startup.
  ${usageLogs}\tDisplay and tail server logs.
  ${usageStatus}\tDisplay detailed server information.

  If ${usageCommand} is omitted, behaviour defaults to ${usageLocal}.

  ${clr('Options:', 'underline')}

  ${usagePort}\tPort to start server on (defaults to 443).

  ${clr('For further information, please see https://ind.ie/web-server', 'italic')}
  `.replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

module.exports = help
