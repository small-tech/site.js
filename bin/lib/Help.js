//////////////////////////////////////////////////////////////////////
//
// Help class. Used by the Help command.
//
//////////////////////////////////////////////////////////////////////

const Site = require('../../index')
const clr = require('../../lib/clr')

const GREEN = 'green'
const YELLOW = 'yellow'
const CYAN = 'cyan'

class Help {

  constructor (systemdExists, isLinux, isWindows, isMac) {
    this.systemdExists = systemdExists
    this.isLinux = isLinux
    this.isWindows = isWindows
    this.isMac = isMac
  }

  get text() {
    // Helper functions.
    function command(name) { return clr(name, GREEN) }
    const argument = (name) => {
    // On Windows @hostname and @localhost have to be quoted.
    if (this.isWindows && name.startsWith('@')) {
      name = `"${name}"`
    }
    return clr(name, CYAN)
    }
    function option(name) { name = `--${name}`; return `${clr(name, YELLOW)}` }
    function heading(title) { return clr(title, 'underline') }
    function emphasised(text) { return clr(text, 'italic') }

    const appName = 'site'

    const usageCommand = command('command')
    const usageFolderOrPort = `${argument('folder')}|${argument(':port')}`
    const usageHostAndPort = argument('@host[:port]')
    const usageOptions = option('options')

    //
    // Commands.
    //

    const commandServe = command('serve')

    const commandPull = command('pull')
    const commandPush = command('push')

    const commandEnable = command('enable')
    const commandDisable = command('disable')
    const commandStart = command('start')
    const commandStop = command('stop')
    const commandRestart = command('restart')
    const commandLogs = command('logs')
    const commandStatus = command('status')
    const commandHugo = command('hugo')

    const commandUpdate = command('update')
    const commandUninstall = command('uninstall')

    const commandVersion = command('version')
    const commandHelp = command('help')

    //
    // Options.
    //

    const optionAliases = option('aliases')
    const optionDomain = option('domain')
    const optionSkipDomainReachabilityCheck = option('skip-domain-reachability-check')

    const optionSyncFrom = option('sync-from')
    const optionSyncTo = option('sync-to')

    const optionEnsureCanSync = option('ensure-can-sync')
    const optionLiveSync = option('live-sync')
    const optionSyncFolderAndContents = option('sync-folder-and-contents')
    const optionAccessLogErrorsOnly = option('access-log-errors-only')
    const optionAccessLogDisable = option('access-log-disable')

    const optionDocker = option('docker')

    // Black right-pointing triangle (U+25B6)
    // (There are several similar unicode gylphs but this is the one that works well across
    // Linux, macOS, and Windows).
    const prompt = clr('▶', 'blue')

    Site.logAppNameAndVersion(/* compact */ true)

    const usage = `
    ${heading('Usage:')}

  ${prompt} ${clr(appName, 'bold')} [${usageCommand}] [${usageFolderOrPort}] [${usageHostAndPort}] [${usageOptions}]

    ${usageCommand}\t\t${commandServe} | ${commandPull} | ${commandPush}${this.systemdExists ? ` | ${commandEnable} | ${commandDisable} | ${commandStart} | ${commandStop} | ${commandRestart} | ${commandLogs} | ${commandStatus}` : ''} | ${commandUpdate} | ${commandHugo} | ${commandUninstall} | ${commandVersion} | ${commandHelp}
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

    ${commandPull}\tPull (download) your site from a remote Small Web server.
    ${commandPush}\tPush (deploy) your site to a remote Small Web server.
    ${this.systemdExists ?
      `
    ${commandEnable}\tStart server as daemon with globally-trusted certificates and add to startup.
    ${commandDisable}\tStop server daemon and remove from startup.
    ${commandStart}\tStart server as daemon with globally-trusted certificates.
    ${commandStop}\tStop server daemon.
    ${commandRestart}\tRestart server daemon.
    ${commandLogs}\tDisplay and tail server logs.
    ${commandStatus}\tDisplay detailed server information.
      ` : ''}
    ${commandHugo}\tPasses the remainder of the command string to the integrated Hugo static site generator.

    ${commandUpdate}\tCheck for Site.js updates and update if new version is found.
    ${commandUninstall}\tUninstall Site.js.

    ${commandVersion}\tDisplay version and exit.
    ${commandHelp}\tDisplay this help screen and exit.

    If ${usageCommand} is omitted, behaviour defaults to ${commandServe}.

    ${heading('Options:')}

    For${ this.systemdExists ? ' both' : '' } ${commandServe}${ this.systemdExists ? ` and ${commandEnable}` : '' } command${ this.systemdExists ? 's' : '' }:

    ${optionDomain}\t\t\t\tThe main domain to serve (defaults to system hostname if not specified).
    ${optionAliases}\t\t\t\tAdditional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    ${optionSkipDomainReachabilityCheck}\tDo not run pre-flight check for domain reachability.
    ${optionAccessLogErrorsOnly}\t\tDisplay only errors in the access log (HTTP status codes _4xx_ and _5xx_).
    ${optionAccessLogDisable}\t\tCompletely disable the access log. Not even errors are logged.

    ${ this.systemdExists ? `For ${commandServe} command:
    ` : '' }
    ${optionSyncTo}\t\t\t\tThe host to sync to (other sync options only relevant if this is supplied).
    ${optionSyncFrom}\t\t\t\tThe folder to sync from.
    ${optionLiveSync}\t\t\t\tWatch for changes and live sync them to a remote server.
    ${optionSyncFolderAndContents}\t\tSync local folder and contents (default is to sync the folder’s contents only).
    ${optionDocker}\t\t\t\tSet when running in a Docker container (does not disable privileged ports).

    ${ this.systemdExists ? `For ${commandEnable} command:

    ${optionEnsureCanSync}\t\t\tEnsure server can rsync via ssh.
    ` : ''}
    For both ${commandPull} and ${commandPush} commands:

    ${optionDomain}\t\t\t\tSpecify the domain to sync to manually (otherwise derived from the folder name).

    ${heading('Examples:')}

      ${heading('Develop using locally-trusted TLS certificates:')}

    • Serve current folder \t\t\t${prompt} ${appName}
      ${emphasised('(all forms; shorthand to full syntax)')}\t${prompt} ${appName} ${commandServe}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost')}
      \t\t\t\t\t\t${prompt} ${appName} ${commandServe} ${argument('.')} ${argument('@localhost:443')}

    • Serve folder ${argument('demo')} ${emphasised('(shorthand)')}\t\t${prompt} ${appName} ${argument('demo')}
    • Serve folder ${argument('demo')} at port 666\t\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@localhost:666')}

    • Proxy ${argument('localhost:1313')} ⇄ https://localhost\t${prompt} ${appName} ${argument(':1313')}
      (shorthand and full)\t\t\t${prompt} ${appName} ${commandServe} ${argument(':1313')} ${argument('@localhost:443')}

    • Sync ${argument('demo')} folder to ${argument('my.site')}\t\t${prompt} ${appName} ${argument('demo')} ${optionSyncTo}=${argument('my.site')}
    • Ditto, but use account ${argument('me')} on ${argument('my.site')}\t${prompt} ${appName} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site')}
    • Ditto, but sync to remote folder ${argument('~/www')}\t${prompt} ${appName} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site:www')}
    • Ditto, but specify absolute path\t\t${prompt} ${appName} ${argument('demo')} ${optionSyncTo}=${argument('me@my.site:/home/me/www')}

    • Live Sync current folder to ${argument('my.site')} \t${prompt} ${appName} ${optionSyncTo}=${argument('my.site')} ${optionLiveSync}
    ${ this.systemdExists ? `
      ${heading('Stage and deploy using globally-trusted Let’s Encrypt certificates:')}

      Regular process:
      ` : `
      ${heading('Stage using globally-trusted Let’s Encrypt certificates:')}
      `}
    • Serve current folder\t\t\t${prompt} ${appName} ${argument('@hostname')}
    • Serve current folder at specified domain\t${prompt} ${appName} ${argument('@hostname')} ${optionDomain}=${argument('my.site')}
    • Serve current folder also at aliases\t${prompt} ${appName} ${argument('@hostname')} ${optionAliases}=${argument('www,other.site,www.other.site')}

    • Serve folder ${argument('demo')}\t\t\t\t${prompt} ${appName} ${argument('demo')} ${argument('@hostname')}
      (shorthand and full)\t\t\t${prompt} ${appName} ${commandServe} ${argument('demo')} ${argument('@hostname')}

    • Proxy ${argument('localhost:1313')} ⇄ https://hostname\t${prompt} ${appName} ${commandServe} ${argument(':1313')} ${argument('@hostname')}
    ${ this.systemdExists ? `
      Start-up daemon:

    • Install & serve current folder as daemon\t${prompt} ${appName} ${commandEnable}
    • Ditto & also ensure it can rsync via ssh\t${prompt} ${appName} ${commandEnable} ${optionEnsureCanSync}
    • Get status of deamon\t\t\t${prompt} ${appName} ${commandStatus}
    • Start server\t\t\t\t${prompt} ${appName} ${commandStart}
    • Stop server\t\t\t\t${prompt} ${appName} ${commandStop}
    • Restart server\t\t\t\t${prompt} ${appName} ${commandRestart}
    • Display server logs\t\t\t${prompt} ${appName} ${commandLogs}
    • Stop and uninstall current daemon\t\t${prompt} ${appName} ${commandDisable}
    ` : ''}
      ${heading('Static site generation:')}

    • Create a new Hugo site\t\t\t${prompt} ${appName} ${commandHugo} ${argument('new site demo')}

      ${heading('General:')}

    • Check for updates and update if found\t${prompt} ${appName} ${commandUpdate}
    ${ this.isWindows ? `
    ${heading('Windows-specific notes:')}

      - Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.
      - Production use is not available on Windows as it requires Linux with systemd.
    `: ''}${ this.isMac ? `
    ${heading('Mac-specific notes:')}

      - Production use is not available on macOS as it requires Linux with systemd.
    `: ''}${ this.isLinux && !this.systemdExists ? `
    ${heading('Linux-specific notes:')}

      - Production use is not available on this Linux distribution as systemd does not exist.
      - For production use, we currently recommend using Ubuntu 18.04 or 20.04 LTS.
    `: ''}
    ${clr('For further information, please see https://sitejs.org', 'italic')}
    `.replace(/^\n/, '')

    return usage
  }
}

module.exports = Help
