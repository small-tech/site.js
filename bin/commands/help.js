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

  const optionHost = `${option('--host')}=${argument('my.site')}`
  const optionAccount = `${option('--account')}=${argument('me')}`
  const optionFolder = `${option('--folder')}=${argument('www')}`

  const prompt = clr('⯈', 'blue')

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
    ${commandSync}\tStart server as regular process with locally-trusted certificates and ${emphasised('rsync')} ${argument('folder')} to ${argument('host')}.

    On Linux distributions with systemd, you can also use:

    ${commandEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
    ${commandDisable}\tStop server daemon and remove from startup.
    ${commandLogs}\tDisplay and tail server logs.
    ${commandStatus}\tDisplay detailed server information.

    If ${usageCommand} is omitted, behaviour defaults to ${commandLocal}.

    ${heading('Options:')}

    ${optionPort}\tPort to start server on (defaults to 443).

    For the ${commandSync} command:

    ${optionHost}\tThe remote host to sync to (e.g., my-demo.site)
    ${optionAccount}\tThe ssh account to use on remote server (defaults to same as on current session)
    ${optionFolder}\tThe subfolder of home folder to sync to on remote machine (defaults to name of served folder)

    ${heading('Examples:')}

      Develop using locally-trusted certificates:

    • Serve current folder ${emphasised('(shorthand)')}\t\t${prompt} web-server
    • Serve folder ${argument('site')} ${emphasised('(shorthand)')}\t\t${prompt} web-server ${argument('site')}
    • Serve current folder\t\t\t${prompt} web-server ${commandLocal}
    • Serve folder ${argument('site')}\t\t\t\t${prompt} web-server ${commandLocal} ${argument('site')}
    • Serve folder ${argument('site')} at port 666\t\t${prompt} web-server ${commandLocal} ${argument('site')} ${option('--port')}=${argument('666')}

    • Proxy ${argument('localhost:1313')}🡘 https://localhost\t${prompt} web-server ${commandProxy} ${argument('localhost:1313')}

    • Serve current folder & sync it to ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('my.site')}
    • Serve ${argument('site')} folder & sync it to ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('site')} ${argument('my.site')}
    • Ditto, but using the ${option('--host')} option\t${prompt} web-server ${commandSync} ${argument('site')} ${option('--host=')}${argument('my.site')}
    • Ditto, but use account ${argument('me')} on ${argument('my.site')}\t${prompt} web-server ${commandSync} ${argument('site')} ${option('--host=')}${argument('my.site')} ${option('--account=')}${argument('me')}
    • Ditto, but sync to remote folder ${argument('www')}\t${prompt} web-server ${commandSync} ${argument('site')} ${option('--host=')}${argument('my.site')} ${option('--account=')}${argument('me')} ${option('--folder=')}${argument('www')}
    • Ditto, but using the ${option('--to')} option\t\t${prompt} web-server ${commandSync} ${argument('site')} ${option('--to=')}${argument('me@my-site:/home/me/www')}

    • Ensure remote server can sync ${emphasised('(run there)')}\t${prompt} web-server ${commandSync}

      Stage and deploy using globally-trusted Let’s Encrypt certificates:

    • Serve current folder\t\t\t${prompt} web-server ${commandGlobal}
    • Serve folder ${argument('site')}\t\t\t\t${prompt} web-server ${commandGlobal} ${argument('site')}

    • Serve current folder as daemon\t\t${prompt} web-server ${commandEnable}
    • Get status of deamon\t\t\t${prompt} web-server ${commandStatus}
    • Display server logs\t\t\t${prompt} web-server ${commandLogs}
    • Stop current daemon\t\t\t${prompt} web-server ${commandDisable}

    ${clr('For further information, please see https://ind.ie/web-server', 'italic')}
  `.replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

module.exports = help
