//////////////////////////////////////////////////////////////////////
//
// Command: help
//
// Displays the help screen and exits.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')
const clr = require('../lib/cli').clr

const GREEN = 'green'
const YELLOW = 'yellow'
const CYAN = 'cyan'

function command(name) { return clr(name, 'green') }
function argument(name) { return clr(name, CYAN) }
function option(name) { return clr(name, YELLOW) }
function heading(title) { return clr(title, 'underline') }
function emphasised(text) { return clr(text, 'italic') }

function help () {
  const usageCommand = command('command')
  const usageFolderOrHost = `${argument('folder')}${clr('|host', 'darkgrey')}`
  const usageHost = argument('host')
  const usageOptions = option('options')

  const commandVersion = command('version')
  const commandHelp = command('help')
  const commandLocal = command('local')
  const commandGlobal = command('global')
  const commandProxy = command('proxy')
  const commandSync = command('sync')
  const commandEnable = command('enable')
  const commandDisable = command('disable')
  const commandLogs = command('logs')
  const commandStatus = command('status')

  const optionPort = `${option('--port')}=${argument('N')}`

  const prompt = clr('⯈', 'yellow')

  const usage = `
   ${webServer.version()}
    ${heading('Usage:')}

    ${clr('web-server', 'bold')} [${usageCommand}] [${usageFolderOrHost}] [${usageHost}] [${usageOptions}]

    ${usageCommand}\t${commandVersion} | ${commandHelp} | ${commandLocal} | ${commandGlobal} | ${commandProxy} | ${commandSync} | ${commandEnable} | ${commandDisable} | ${commandLogs} | ${commandStatus}
    ${usageFolderOrHost}\tPath of folder to serve (defaults to current folder) or host to proxy or sync.
    ${usageHost}\tHost to sync.
    ${usageOptions}\tSettings that alter server characteristics.

    ${heading('Commands:')}

    ${commandVersion}\tDisplay version and exit.
    ${commandHelp}\tDisplay this help screen and exit.

    ${commandLocal}\tStart server as regular process with locally-trusted certificates.
    ${commandGlobal}\tStart server as regular process with globally-trusted certificates.
    ${commandProxy}\tStart server to proxy provided HTTP URL via HTTPS. Also proxies WebSockets.

    On Linux distributions with systemd, you can also use:

    ${commandEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
    ${commandDisable}\tStop server daemon and remove from startup.
    ${commandLogs}\tDisplay and tail server logs.
    ${commandStatus}\tDisplay detailed server information.

    If ${usageCommand} is omitted, behaviour defaults to ${commandLocal}.

    ${heading('Options:')}

    ${optionPort}\tPort to start server on (defaults to 443).

    ${heading('Examples:')}

    • Local server on current folder ${emphasised('(shorthand)')}\t${prompt} web-server
    • Local server on folder ${argument('site')} ${emphasised('(shorthand)')}\t\t${prompt} web-server ${argument('site')}
    • Local server on current folder\t\t\t${prompt} web-server ${commandLocal}
    • Local server on folder ${argument('site')}\t\t\t${prompt} web-server ${commandLocal} ${argument('site')}

    • Global server on current folder\t\t\t${prompt} web-server ${commandGlobal}
    • Global server on folder ${argument('site')}\t\t\t${prompt} web-server ${commandGlobal} ${argument('site')}

    • Proxy ${argument('localhost:1313')} at https://localhost\t\t${prompt} web-server ${commandProxy} ${argument('localhost:1313')}

    • Local server on current folder & sync to ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('my.site')}
    • Local server on ${argument('site')} folder & sync to ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('site')} ${argument('my.site')}
    • Same as above, but use account ${argument('ubuntu')} on ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('site')} ${argument('my.site')} ${option('--account=')}${argument('ubuntu')}
    • Same as above, but sync to remote folder ${argument('www')}\t${prompt} web-server ${commandSync} ${argument('site')} ${argument('my.site')} ${option('--account=')}${argument('ubuntu')} ${option('--remoteFolder=')}${argument('www')}
    • Same as above, but using the ${option('--to')} option\t\t${prompt} web-server ${commandSync} ${argument('site')} ${option('--to=')}${argument('ubuntu@my-site:/home/ubuntu/www')}
    • Start web+sync daemon (e.g., on my.site)\t\t${prompt} web-server ${commandSync}
    • Start web+sync daemon on ${argument('site')} folder (on my.site)\t${prompt} web-server ${commandSync} ${argument('site')}

    • Serve current folder as daemon\t\t\t${prompt} web-server ${commandEnable}
    • Get the status of the current deamon\t\t${prompt} web-server ${commandStatus}
    • Stop the current daemon\t\t\t\t${prompt} web-server ${commandDisable}

    ${clr('For further information, please see https://ind.ie/web-server', 'italic')}
  `.replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

module.exports = help
