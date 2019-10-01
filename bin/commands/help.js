//////////////////////////////////////////////////////////////////////
//
// Command: help
//
// Displays the help screen and exits.
//
//////////////////////////////////////////////////////////////////////

const Site = require('../../index')
const clr = require('../../lib/clr')
const ensure = require('../lib/ensure')

const GREEN = 'green'
const YELLOW = 'yellow'
const CYAN = 'cyan'

const systemdExists = ensure.commandExists('systemctl')
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

function command(name) { return clr(name, GREEN) }
function argument(name) {
  // On Windows @hostname and @localhost have to be quoted.
  if (isWindows && name.startsWith('@')) {
    name = `"${name}"`
  }
  return clr(name, CYAN)
}
function option(name) { name = `--${name}`; return `${clr(name, YELLOW)}` }
function heading(title) { return clr(title, 'underline') }
function emphasised(text) { return clr(text, 'italic') }

function help () {
  const appName = 'site'

  const usageCommand = command('command')
  const usageFolderOrPort = `${argument('folder')}|${argument(':port')}`
  const usageHostAndPort = argument('@host[:port]')
  const usageOptions = option('options')

  const commandVersion = command('version')
  const commandHelp = command('help')
  const commandUninstall = command('uninstall')
  const commandServe = command('serve')
  const commandEnable = command('enable')
  const commandDisable = command('disable')
  const commandLogs = command('logs')
  const commandStatus = command('status')

  const optionAliases = option('aliases')

  const optionSyncFrom = option('sync-from')
  const optionSyncTo = option('sync-to')

  const optionEnsureCanSync = option('ensure-can-sync')
  const optionExitOnSync = option('exit-on-sync')
  const optionSyncFolderAndContents = option('sync-folder-and-contents')

  const prompt = clr('▶', 'blue')

  Site.logAppNameAndVersion()

  const usage = `
    ${heading('Usage:')}

  ${prompt} ${clr(appName, 'bold')} [${usageCommand}] [${usageFolderOrPort}] [${usageHostAndPort}] [${usageOptions}]

    ${usageCommand}\t\t${commandVersion} | ${commandHelp} | ${commandServe} ${systemdExists ? `| ${commandEnable} | ${commandDisable} | ${commandLogs} | ${commandStatus}` : ''}| ${commandUninstall}
    ${usageFolderOrPort}\tPath of folder to serve (defaults to current folder) or port on localhost to proxy.
    ${usageHostAndPort}\tHost (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
    ${usageOptions}\t\tSettings that alter command behaviour.

    ${heading('Key:')}

    [] = optional  | = or  ${prompt} = command prompt

    ${heading('Commands:')}

    ${commandServe}\tServe specified ${argument('folder')} (or proxy specified ${argument(':port')}) on specified ${argument('@host')} (at ${argument(':port')}, if given).
    \t\tThe order of arguments is: 1. what to serve, 2. where to serve it. e.g.,

    \t      ${prompt} ${appName} ${commandServe} ${argument('my-folder')} ${argument('@localhost')}

    \t\tIf a port (e.g., ${argument(':1313')}) is specified instead of ${argument('my-folder')}, start an HTTP/WebSocket proxy.

    ${commandVersion}\tDisplay version and exit.
    ${commandHelp}\tDisplay this help screen and exit.
    ${commandUninstall}\tUninstall Site.js.
    ${systemdExists ?
      `
    ${commandEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
    ${commandDisable}\tStop server daemon and remove from startup.
    ${commandLogs}\tDisplay and tail server logs.
    ${commandStatus}\tDisplay detailed server information.
      ` : ''}
    If ${usageCommand} is omitted, behaviour defaults to ${commandServe}.

    ${heading('Options:')}
    ${ isWindows ? `
    For ${commandServe} command:

    ${optionAliases}\t\t\tSpecify additional domains to obtain TLS certs for and respond to.
    ` : `
    For both ${commandServe} and ${commandEnable} commands:

    ${optionAliases}\t\t\tSpecify additional domains to obtain TLS certs for and respond to.

    For ${commandServe} command:

    ${optionSyncTo}\t\t\tThe host to sync to.
    ${optionSyncFrom}\t\t\tThe folder to sync from (only relevant if ${optionSyncTo} is specified).
    ${optionExitOnSync}\t\tExit once the first sync has occurred. Useful in deployment scripts.
    ${optionSyncFolderAndContents}\tSync local folder and contents (default is to sync the folder’s contents only).

    For ${commandEnable} command:

    ${optionEnsureCanSync}\t\tEnsure server can rsync via ssh.
    `}
    ${heading('Examples:')}

      ${heading('Develop using locally-trusted TLS certificates:')}

    • Serve current folder \t\t\t${prompt} ${appName}
      ${emphasised('(all forms; shorthand to full syntax)')}\t${prompt} ${appName} ${commandServe}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost')}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost:443')}

    • Serve folder ${argument('demo')} ${emphasised('(shorthand)')}\t\t${prompt} ${appName} ${argument('demo')}
    • Serve folder ${argument('demo')} at port 666\t\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@localhost:666')}

    • Proxy ${argument('localhost:1313')}🡘 https://localhost\t${prompt} ${appName} ${argument(':1313')}
      (shorthand and full)\t\t\t${prompt} ${appName} ${commandServe} ${argument(':1313')} ${argument('@localhost:443')}
    ${ isWindows ? '' : `
    • Serve current folder, sync it to ${argument('my.site')}\t${prompt} ${appName} ${optionSyncTo}=${argument('my.site')}
      (shorthand and full)\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost:443')} ${optionSyncTo}=${argument('my.site')}

    • Serve ${argument('demo')} folder, sync it to ${argument('my.site')}\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${optionSyncTo}=${argument('my.site')}
    • Ditto, but use account ${argument('me')} on ${argument('my.site')}\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site')}
    • Ditto, but sync to remote folder ${argument('~/www')}\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site:www')}
    • Ditto, but specify absolute path\t\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site:/home/me/www')}

    • Sync current folder, proxy ${argument('localhost:1313')}\t${prompt} ${appName} ${commandServe} ${argument(':1313')} ${optionSyncFrom}=${argument('.')} ${optionSyncTo}=${argument('my.site')}

    • Sync current folder to ${argument('my.site')} and exit\t${prompt} ${appName} ${optionSyncTo}=${argument('my.site')} ${optionExitOnSync}

    • Sync ${argument('demo')} folder to ${argument('my.site')} and exit\t${prompt} ${appName} ${argument('demo')} ${optionSyncTo}=${argument('my.site')} ${optionExitOnSync}
      (alternative forms)\t\t\t${prompt} ${appName} ${optionSyncFrom}=${argument('demo')} ${optionSyncTo}=${argument('my.site')} ${optionExitOnSync}
    `}${ systemdExists ? `
      ${heading('Stage and deploy using globally-trusted Let’s Encrypt certificates:')}

      Regular process:
      ` : `
      ${heading('Stage using globally-trusted Let’s Encrypt certificates:')}
      `}
    • Serve current folder\t\t\t${prompt} ${appName} ${argument('@hostname')}

    • Serve current folder also at aliases\t${prompt} ${appName} ${argument('@hostname')} ${optionAliases}=${argument('other.site,www.other.site')}

    • Serve folder ${argument('demo')}\t\t\t\t${prompt} ${appName} ${argument('demo')} ${argument('@hostname')}
      (shorthand and full)\t\t\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@hostname')}

    • Proxy ${argument('localhost:1313')}🡘 https://hostname\t${prompt} ${appName} ${commandServe} ${argument(':1313')} ${argument('@hostname')}
    ${ systemdExists ? `
    Start-up daemon:

    • Serve current folder as daemon\t\t${prompt} ${appName} ${commandEnable}
    • Ditto & also ensure it can rsync via ssh\t${prompt} ${appName} ${commandEnable} ${optionEnsureCanSync}
    • Get status of deamon\t\t\t${prompt} ${appName} ${commandStatus}
    • Display server logs\t\t\t${prompt} ${appName} ${commandLogs}
    • Stop current daemon\t\t\t${prompt} ${appName} ${commandDisable}
    ` : ''}${ isWindows ? `
    ${heading('Windows-specific notes:')}

      - Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.
      - The sync feature, available on Linux and macOS, is not available on Windows as rsync is not available.
      - Production use is not available on Windows as it requires Linux with systemd.
    `: ''}${ isMac ? `
    ${heading('Mac-specific notes:')}

      - Production use is not available on macOS as it requires Linux with systemd.
    `: ''}${ isLinux && !systemdExists ? `
    ${heading('Linux-specific notes:')}

      - Production use is not available on this Linux distribution as systemd does not exist.
      - For production use, we currently recommend using Ubuntu 18.04 LTS.
    `: ''}
    ${clr('For further information, please see https://sitejs.org', 'italic')}
  `.replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

module.exports = help
