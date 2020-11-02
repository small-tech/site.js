//
// Test command-line interface commands by executing them in the shell.
//
// Note: if you are using nvm, for these tests to pass, you must create symbolic
// ===== links from your /usr/local/bin folder to your current version of Node.
//
// e.g.,
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.2/bin/node /usr/local/bin/node
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.2/bin/npm /usr/local/bin/npm
//
// Untested: - uninstall, - update
//

const os = require('os')
const fs = require('fs-extra')
const test = require('tape')
const childProcess = require('child_process')
const path = require('path')
const Site = require('../index.js')
const Help = require('../bin/lib/Help')
const ensure = require('../bin/lib/ensure')
const Hugo = require('@small-tech/node-hugo')

process.env['QUIET'] = true

async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      const location = response.headers.location

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 404 && statusCode !== 500 && statusCode !== 302) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, location, body})
      })
    })
  })
}

function options(timeout = 0) {
  // Ensure that the command logs to console (as tests are being run with QUIET=true in the environment.)
  let env = Object.assign({}, process.env)
  delete env['QUIET']

  return { env, timeout }
}

function fundingMessage() {
  return dehydrate(`
    ╔═══════════════════════════════════════════╗
    ║ Like this? Fund us!                       ║
    ║                                           ║
    ║ We’re a tiny, independent not-for-profit. ║
    ║ https://small-tech.org/fund-us            ║
    ╚═══════════════════════════════════════════╝
  `)
}

_manifest = null
function manifest () {
  if (_manifest === null) {
    try {
      _manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf-8'))
    } catch (error) {
      // When running under Node (not wrapped as a binary), there will be no manifest file. So mock one.
      _manifest = {
        releaseChannel: 'npm',
        binaryVersion: '20000101000000',
        packageVersion: (require(path.join('..', 'package.json'))).version,
        sourceVersion: childProcess.execSync('git log -1 --oneline').toString().match(/^[0-9a-fA-F]{7}/)[0],
        hugoVersion: (new Hugo()).version,
        platform: {linux: 'linux', win32: 'windows', 'darwin': 'macOS'}[os.platform()],
        architecture: os.arch()
      }
    }
  }
  return _manifest
}

function siteJSLogo () {
  return dehydrate('🌱')
}

function creationDateLine () {
  return dehydrate(`Created ${Site.binaryVersionToHumanReadableDateString(manifest().binaryVersion)}`)
}

function binaryVersionLine () {
  return dehydrate(`Version ${manifest().binaryVersion}-${manifest().packageVersion}-${manifest().sourceVersion}-${manifest().platform}/${manifest().architecture}`)
}

function nodeVersionLine () {
  return dehydrate(`Node.js ${process.version.replace('v', '')}`)
}

function hugoVersionLine () {
  return dehydrate(`Hugo ${manifest().hugoVersion}`)
}

function nexeBaseLink () {
  return dehydrate(`https://sitejs.org/nexe/${process.platform}-${process.arch}-${process.version.replace('v', '')}`)
}

function sourceLink () {
  return dehydrate(`https://source.small-tech.org/site.js/app/-/tree/${manifest().sourceVersion}`)
}

function dehydrate (str) {
  if (typeof str !== 'string') {
    str = str.toString('utf-8')
  }
  return str.replace(/\s/g, '')
}

function outputForCommand(command) {
  return dehydrate(childProcess.execSync(command, options()))
}

function _(commandPartial) {
  return `node ${path.join('bin', 'site.js')} ${commandPartial}`
}

test('[commands] version', t => {
  t.plan(7)

  const command = _('version')
  const actualOutput = outputForCommand(command)

  t.ok(actualOutput.includes(siteJSLogo()), 'version screen includes Site.js header')
  t.ok(actualOutput.includes(creationDateLine()), 'version screen includes creation date line')
  t.ok(actualOutput.includes(binaryVersionLine()), 'version screen includes binary version line')
  t.ok(actualOutput.includes(nodeVersionLine()), 'version screen includes Node.js version line')
  t.ok(actualOutput.includes(hugoVersionLine()), 'version screen includes Hugo version line')
  t.ok(actualOutput.includes(nexeBaseLink()), 'version screen includes nexe base link')
  t.ok(actualOutput.includes(sourceLink()), 'version screen includes source link')
  t.end()
})


test('[commands] systemd startup daemon', t => {

  //
  // Commands used in the tests.
  //
  const enableCommand = _('enable test/site')
  const disableCommand = _('disable')
  const startCommand = _('start')
  const stopCommand = _('stop')
  const restartCommand = _('restart')
  const statusCommand = _('status')

  // Startup daemons are only supported on platforms with systemd.
  if (process.platform === 'win32' || process.platform === 'darwin' || !ensure.commandExists('systemctl')) {
    const expectedErrorMessage = dehydrate('❌ ❨site.js❩ Error: Daemons are only supported on Linux systems with systemd (systemctl required).')
    const commandsToTest = ['enable', 'disable', 'start', 'stop', 'restart', 'status']

    commandsToTest.forEach(commandName => {
      try {
        outputForCommand(eval(`${commandName}Command`))
      } catch (error) {
        t.ok(dehydrate(error.output[1].toString()).includes(expectedErrorMessage), `On non-supported systems, daemon command ${commandName} fails gracefully as expected`)
      }
    })

    t.end()

    return
  }

  t.plan(19)

  //
  // Setup.
  //

  // Ensure server isn’t enabled first.
  try { outputForCommand(disableCommand) } catch (error) {
    // OK if this fails (it will fail if server wasn’t enabled).
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Server is disabled.
  //
  ////////////////////////////////////////////////////////////////////////////////

  //
  // Status should display correctly when server is disabled.
  //
  const expectedOutputForStatusCommandWhenServerIsDisabled = dehydrate('🛑 ❨site.js❩ Server is inactive and disabled.')
  const actualOutputForStatusCommandWhenServerIsDisabled = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsDisabled.includes(expectedOutputForStatusCommandWhenServerIsDisabled), 'Server status should display correctly when server is disabled')

  //
  // Disable command should fail when server is disabled.
  //

  const expectedOutputForDisableCommandWhenServerIsDisabled = dehydrate('❌ ❨site.js❩ Error: Site.js server is not enabled. Nothing to disable.')
  try {
    outputForCommand(disableCommand)
  } catch (error) {
    t.pass('Disable command fails as expected when server is already disabled')
    const actualOutputForDisableCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForDisableCommandWhenServerIsDisabled.includes(expectedOutputForDisableCommandWhenServerIsDisabled), 'Disable command should fail when server is disabled')
  }

  //
  // Start command should fail when server is disabled.
  //
  const expectedOutputForStartCommandWhenServerIsDisabled = dehydrate('❌ ❨site.js❩ Error: Site.js daemon is not enabled. Please run site enable to enable it.')
  try {
    outputForCommand(startCommand)
  } catch (error) {
    t.pass('Start command fails as expected when server is disabled')
    const actualOutputForStartCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForStartCommandWhenServerIsDisabled.includes(expectedOutputForStartCommandWhenServerIsDisabled), 'Start command should fail when server is disabled')
  }

  //
  // Stop command should fail when server is disabled.
  //
  const expectedOutputForStopCommandWhenServerIsDisabled = dehydrate('❌ ❨site.js❩ Error: Site.js server is not active. Nothing to stop.')
  try {
    outputForCommand(stopCommand)
  } catch (error) {
    t.pass('Stop command fails as expected when server is not active')
    const actualOutputForStopCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForStopCommandWhenServerIsDisabled.includes(expectedOutputForStopCommandWhenServerIsDisabled), 'Stop command should fail when server is disabled')
  }

  //
  // Restart command should fail when server is disabled.
  //
  const expectedOutputForRestartCommandWhenServerIsDisabled = dehydrate('❌ ❨site.js❩ Error: Site.js daemon is not enabled. Please run site enable to enable it.')
  try {
    outputForCommand(restartCommand)
  } catch (error) {
    t.pass('Restart command fails as expected when server is not active')
    actualOutputForRestartCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.ok(actualOutputForRestartCommandWhenServerIsDisabled.includes(expectedOutputForRestartCommandWhenServerIsDisabled), 'Restart command should fail when server is not active')
  }

  //
  // Enable command.
  //

  //
  // Test: enable when not enabled should succeed.
  //
  const expectedOutputForEnableCommand = dehydrate(`
    😈 ❨site.js❩ Launched as daemon on https://${Site.hostname} serving test/site
    😈 ❨site.js❩ Installed daemon for auto-launch at startup.

    👍 ❨site.js❩ You’re all set!`)

  const actualOutputForEnableCommand = outputForCommand(enableCommand)

  t.ok(actualOutputForEnableCommand.includes(expectedOutputForEnableCommand), 'Enable command should succeed when server is not enabled')

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Server is enabled.
  //
  ////////////////////////////////////////////////////////////////////////////////

  //
  // Status should display correctly when server is enabled.
  //
  const expectedOutputForStatusCommandWhenServerIsEnabled = dehydrate(`💡 ❨site.js❩ Server is active and enabled.`)
  const actualOutputForStatusCommandWhenServerIsEnabled = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsEnabled.includes(expectedOutputForStatusCommandWhenServerIsEnabled), 'Server status should display correctly when server is enabled')


  //
  // Enable command should fail when server is enabled.
  //
  const expectedOutputForEnableCommandWhenServerIsEnabled = dehydrate('❌ ❨site.js❩ Error: Site.js Daemon is already running. Please stop it before retrying using: site disable')
  try {
    outputForCommand(enableCommand)
  } catch (error) {
    t.pass('Enable command fails as expected when server is enabled')
    const actualOutputForEnableCommandWhenServerIsEnabled = dehydrate(error.stdout)
    t.ok(actualOutputForEnableCommandWhenServerIsEnabled.includes(expectedOutputForEnableCommandWhenServerIsEnabled), 'Enable command should fail when server is enabled')
  }

  //
  // Stop command should succeed when server is active.
  //
  const expectedOutputForStopCommandWhenServerIsActive = dehydrate('🎈 ❨site.js❩ Server stopped.')
  const actualOutputForStopCommandWhenServerIsActive = outputForCommand(stopCommand)
  t.ok(actualOutputForStopCommandWhenServerIsActive.includes(expectedOutputForStopCommandWhenServerIsActive), 'Stop command should succeed when server is active')

  //
  // Server status should display correctly when server is enabled but inactive.
  //
  const expectedOutputForStatusCommandWhenServerIsEnabledButInactive = dehydrate('🛑 ❨site.js❩ Server is inactive and enabled.')
  const actualOutputForStatusCommandWhenServerIsEnabledButInactive = outputForCommand(statusCommand)
  t.ok(actualOutputForStatusCommandWhenServerIsEnabledButInactive.includes(expectedOutputForStatusCommandWhenServerIsEnabledButInactive), 'Server status should display correctly when server is enabled but inactive')

  //
  // Start command should succeed when server is inactive.
  //
  const expectedOutputForStartCommandWhenServerIsEnabledButInactive = dehydrate('🎈 ❨site.js❩ Server started.')
  const actualOutputForStartCommandWhenServerIsEnabledButInactive = outputForCommand(startCommand)
  t.ok(actualOutputForStartCommandWhenServerIsEnabledButInactive.includes(expectedOutputForStartCommandWhenServerIsEnabledButInactive), 'Start command should succeed when server is inactive')

  //
  // Restart command should succeed when server is enabled but inactive.
  //

  // Stop the server first.
  /* ignore the */ outputForCommand(stopCommand)

  const restartCommandSuccessOutput = dehydrate('🎈 ❨site.js❩ Server restarted.')
  const expectedOutputForRestartCommandWhenServerIsEnabledButInactive = restartCommandSuccessOutput
  const actualOutputForRestartCommandWhenServerIsEnabledButInactive = outputForCommand(restartCommand)
  t.ok(actualOutputForRestartCommandWhenServerIsEnabledButInactive.includes(expectedOutputForRestartCommandWhenServerIsEnabledButInactive), 'Restart command should succeed when server is enabled but inactive')

  //
  // Restart command should succeed when server is active.
  //

  const expectedOutputForRestartCommandWhenServerIsEnabled = restartCommandSuccessOutput
  const actualOutputForRestartCommandWhenServerIsEnabled = outputForCommand(restartCommand)
  t.ok(actualOutputForRestartCommandWhenServerIsEnabled.includes(expectedOutputForRestartCommandWhenServerIsEnabled), 'Restart command should succeed when server is active')

  //
  // Disable command should succeed when server is enabled.
  //

  const expectedOutputForDisableCommand = dehydrate('🎈 ❨site.js❩ Server stopped and removed from startup.')
  const actualOutputForDisableCommand = outputForCommand(disableCommand)
  t.ok(actualOutputForDisableCommand.includes(expectedOutputForDisableCommand), 'Disable command should succeed when server is enabled')

  t.end()
})


// Note that these tests will not catch whitespace differences in the Help output
// due to the dehydration.
test('[commands] help', t => {
  t.plan(4)

  // NB. parameter order: systemdExists, isLinux, isWindows, isMac
  const linuxWithSystemdHelp = dehydrate((new Help(true, true, false, false)).text)
  const linuxWithoutSystemdHelp = dehydrate((new Help(false, true, false, false)).text)
  const windowsHelp = dehydrate((new Help(false, false, true, false)).text)
  const macHelp = dehydrate((new Help(false, false, false, true)).text)

  const linuxWithSystemdExpectedHelpOutput = dehydrate(`
  Usage:

▶ site [command] [folder|:port] [@host[:port]] [--options]

  command    serve | pull | push | enable | disable | start | stop | restart | logs | status | update | hugo | uninstall | version | help
  folder|:port  Path of folder to serve (defaults to current folder) or port on localhost to proxy.
  @host[:port]  Host (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
  --options    Settings that alter command behaviour.

  Key:

  [] = optional  | = or  ▶ = command prompt

  Commands:

  serve  Serve specified folder (or proxy specified :port) on specified @host (at :port, if given).
      The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,

          ▶ site serve my-folder @localhost

      If a port (e.g., :1313) is specified instead of my-folder, start an HTTP/WebSocket proxy.

  pull  Pull (download) your site from a remote Small Web server.
  push  Push (deploy) your site to a remote Small Web server.

  enable  Start server as daemon with globally-trusted certificates and add to startup.
  disable  Stop server daemon and remove from startup.
  start  Start server as daemon with globally-trusted certificates.
  stop  Stop server daemon.
  restart  Restart server daemon.
  logs  Display and tail server logs.
  status  Display detailed server information.

  hugo  Passes the remainder of the command string to the integrated Hugo static site generator.

  update  Check for Site.js updates and update if new version is found.
  uninstall  Uninstall Site.js.

  version  Display version and exit.
  help  Display this help screen and exit.

  If command is omitted, behaviour defaults to serve.

  Options:

  For both serve and enable commands:

  --domain                          The main domain to serve (defaults to system hostname if not specified).
  --aliases                         Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
  --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.

  For serve command:

  --sync-to         The host to sync to (other sync options only relevant if this is supplied).
  --sync-from       The folder to sync from.
  --live-sync       Watch for changes and live sync them to a remote server.
  --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).

  For enable command:

  --ensure-can-sync    Ensure server can rsync via ssh.

  For both pull and push commands:

  --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

  Examples:

    Develop using locally-trusted TLS certificates:

  • Serve current folder       ▶ site
    (all forms; shorthand to full syntax)  ▶ site serve
                ▶ site serve .
                ▶ site serve . @localhost
                ▶ site serve . @localhost:443

  • Serve folder demo (shorthand)    ▶ site demo
  • Serve folder demo at port 666    ▶ site serve demo @localhost:666

  • Proxy localhost:1313 ⇄ https://localhost  ▶ site :1313
    (shorthand and full)      ▶ site serve :1313 @localhost:443

  • Sync demo folder to my.site             ▶ site demo --sync-to=my.site
  • Ditto, but use account me on my.site    ▶ site demo --sync-to=me@my.site
  • Ditto, but sync to remote folder ~/www  ▶ site demo --sync-to=me@my.site:www
  • Ditto, but specify absolute path        ▶ site demo --sync-to=me@my.site:/home/me/www

  • Live Sync current folder to my.site     ▶ site --sync-to=my.site --live-sync

    Stage and deploy using globally-trusted Let’s Encrypt certificates:

    Regular process:

  • Serve current folder      ▶ site @hostname
  • Serve current folder at specified domain	▶ site @hostname --domain=my.site
  • Serve current folder also at aliases  ▶ site @hostname --aliases=www,other.site,www.other.site

  • Serve folder demo        ▶ site demo @hostname
    (shorthand and full)      ▶ site serve demo @hostname

  • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

    Start-up daemon:

  • Install & serve current folder as daemon  ▶ site enable
  • Ditto & also ensure it can rsync via ssh  ▶ site enable --ensure-can-sync
  • Get status of deamon                      ▶ site status
  • Start server                              ▶ site start
  • Stop server                               ▶ site stop
  • Restart server                            ▶ site restart
  • Display server logs                       ▶ site logs
  • Stop and uninstall current daemon         ▶ site disable

    Static site generation:

  • Create a new Hugo site      ▶ site hugo new site demo

    General:

  • Check for updates and update if found     ▶ site update

  For further information, please see https://sitejs.org
  `)

  t.strictEquals(linuxWithSystemdHelp, linuxWithSystemdExpectedHelpOutput, 'Actual help output should match expected output (linux with systemd)')

  const linuxWithoutSystemdExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] [@host[:port]] [--options]
    command    serve | pull | push | update | hugo | uninstall | version | help
    folder|:port  Path of folder to serve (defaults to current folder) or port on localhost to proxy.
    @host[:port]  Host (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
    --options    Settings that alter command behaviour.
    Key:
    [] = optional  | = or  ▶ = command prompt
    Commands:
    serve  Serve specified folder (or proxy specified :port) on specified @host (at :port, if given).
        The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
            ▶ site serve my-folder @localhost
        If a port (e.g., :1313) is specified instead of my-folder, start an HTTP/WebSocket proxy.

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain          The main domain to serve (defaults to system hostname if not specified).
    --aliases         Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.

    --sync-to                   The host to sync to (other sync options only relevant if this is supplied).
    --sync-from                 The folder to sync from.
    --live-sync                 Watch for changes and live sync them to a remote server.
    --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ site
      (all forms; shorthand to full syntax)  ▶ site serve
                  ▶ site serve .
                  ▶ site serve . @localhost
                  ▶ site serve . @localhost:443
    • Serve folder demo (shorthand)    ▶ site demo
    • Serve folder demo at port 666    ▶ site serve demo @localhost:666
    • Proxy localhost:1313 ⇄ https://localhost  ▶ site :1313
      (shorthand and full)      ▶ site serve :1313 @localhost:443

    • Sync demo folder to my.site             ▶ site demo --sync-to=my.site
    • Ditto, but use account me on my.site    ▶ site demo --sync-to=me@my.site
    • Ditto, but sync to remote folder ~/www  ▶ site demo --sync-to=me@my.site:www
    • Ditto, but specify absolute path        ▶ site demo --sync-to=me@my.site:/home/me/www

    • Live Sync current folder to my.site     ▶ site --sync-to=my.site --live-sync

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site @hostname
    • Serve current folder at specified domain ▶ site @hostname --domain=my.site
    • Serve current folder also at aliases  ▶ site @hostname --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ site demo @hostname
      (shorthand and full)      ▶ site serve demo @hostname

    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

      General:

    • Check for updates and update if found     ▶ site update

    Linux-specific notes:
      - Production use is not available on this Linux distribution as systemd does not exist.
      - For production use, we currently recommend using Ubuntu 18.04 or 20.04 LTS.

    For further information, please see https://sitejs.org

  `)

  t.strictEquals(linuxWithoutSystemdHelp, linuxWithoutSystemdExpectedHelpOutput, 'Actual help output should match expectated output (linux without systemd)')


  const windowsExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] ["@host[:port]"] [--options]
    command    serve | pull | push | update | hugo | uninstall | version | help
    folder|:port  Path of folder to serve (defaults to current folder) or port on localhost to proxy.
    "@host[:port]"  Host (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
    --options    Settings that alter command behaviour.
    Key:
    [] = optional  | = or  ▶ = command prompt
    Commands:
    serve  Serve specified folder (or proxy specified :port) on specified "@host" (at :port, if given).
        The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
            ▶ site serve my-folder "@localhost"
        If a port (e.g., :1313) is specified instead of my-folder, start an HTTP/WebSocket proxy.

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain                        The main domain to serve (defaults to system hostname if not specified).
    --aliases                       Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.

    --sync-to                   The host to sync to (other sync options only relevant if this is supplied).
    --sync-from                 The folder to sync from.
    --live-sync                 Watch for changes and live sync them to a remote server.
    --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ site
      (all forms; shorthand to full syntax)  ▶ site serve
                  ▶ site serve .
                  ▶ site serve . "@localhost"
                  ▶ site serve . "@localhost:443"
    • Serve folder demo (shorthand)    ▶ site demo
    • Serve folder demo at port 666    ▶ site serve demo "@localhost:666"
    • Proxy localhost:1313 ⇄ https://localhost  ▶ site :1313
      (shorthand and full)      ▶ site serve :1313 "@localhost:443"

      • Sync demo folder to my.site             ▶ site demo --sync-to=my.site
      • Ditto, but use account me on my.site    ▶ site demo --sync-to=me@my.site
      • Ditto, but sync to remote folder ~/www  ▶ site demo --sync-to=me@my.site:www
      • Ditto, but specify absolute path        ▶ site demo --sync-to=me@my.site:/home/me/www

      • Live Sync current folder to my.site     ▶ site --sync-to=my.site --live-sync

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site "@hostname"
    • Serve current folder at specified domain ▶ site "@hostname" --domain=my.site
    • Serve current folder also at aliases  ▶ site "@hostname" --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ site demo "@hostname"
      (shorthand and full)      ▶ site serve demo "@hostname"
    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 "@hostname"

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

      General:

    • Check for updates and update if found     ▶ site update

    Windows-specific notes:
      - Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.
      - Production use is not available on Windows as it requires Linux with systemd.

    For further information, please see https://sitejs.org
  `)

  t.strictEquals(windowsHelp, windowsExpectedHelpOutput, 'Actual help output should match expected output (windows)')

  const macExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] [@host[:port]] [--options]
    command    serve | pull | push | update | hugo | uninstall | version | help
    folder|:port  Path of folder to serve (defaults to current folder) or port on localhost to proxy.
    @host[:port]  Host (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
    --options    Settings that alter command behaviour.
    Key:
    [] = optional  | = or  ▶ = command prompt
    Commands:
    serve  Serve specified folder (or proxy specified :port) on specified @host (at :port, if given).
        The order of arguments is: 1. what to serve, 2. where to serve it. e.g.,
            ▶ site serve my-folder @localhost
        If a port (e.g., :1313) is specified instead of my-folder, start an HTTP/WebSocket proxy.

    pull  Pull (download) your site from a remote Small Web server.
    push  Push (deploy) your site to a remote Small Web server.

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:

    --domain                        The main domain to serve (defaults to system hostname if not specified).
    --aliases                       Additional domain aliases to obtain TLS certs for. Will 302 redirect to main domain.
    --skip-domain-reachability-check  Do not run pre-flight check for domain reachability.

    --sync-to                   The host to sync to (other sync options only relevant if this is supplied).
    --sync-from                 The folder to sync from.
    --live-sync                 Watch for changes and live sync them to a remote server.
    --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).

    For both pull and push commands:

    --domain         Specify the domain to sync to manually (otherwise derived from the folder name).

    Examples:
      Develop using locally-trusted TLS certificates:
    • Serve current folder       ▶ site
      (all forms; shorthand to full syntax)  ▶ site serve
                  ▶ site serve .
                  ▶ site serve . @localhost
                  ▶ site serve . @localhost:443
    • Serve folder demo (shorthand)    ▶ site demo
    • Serve folder demo at port 666    ▶ site serve demo @localhost:666
    • Proxy localhost:1313 ⇄ https://localhost  ▶ site :1313
      (shorthand and full)      ▶ site serve :1313 @localhost:443

    • Sync demo folder to my.site             ▶ site demo --sync-to=my.site
    • Ditto, but use account me on my.site    ▶ site demo --sync-to=me@my.site
    • Ditto, but sync to remote folder ~/www  ▶ site demo --sync-to=me@my.site:www
    • Ditto, but specify absolute path        ▶ site demo --sync-to=me@my.site:/home/me/www

    • Live Sync current folder to my.site     ▶ site --sync-to=my.site --live-sync

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site @hostname
    • Serve current folder at specified domain ▶ site @hostname --domain=my.site
    • Serve current folder also at aliases  ▶ site @hostname --aliases=www,other.site,www.other.site

    • Serve folder demo        ▶ site demo @hostname
      (shorthand and full)      ▶ site serve demo @hostname
    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

      General:

    • Check for updates and update if found     ▶ site update

    Mac-specific notes:
      - Production use is not available on macOS as it requires Linux with systemd.

    For further information, please see https://sitejs.org
  `)

  t.strictEquals(macHelp, macExpectedHelpOutput, 'Actual help output should match expected output (mac)')

  t.end()
})

test('[commands] hugo', t => {
  t.plan(3)

  let platform = process.platform
  if (platform === 'win32') platform = 'windows'

  const actualOutput = outputForCommand(_('hugo version'))

  t.ok(actualOutput.includes(dehydrate('🎠 ❨site.js❩ Running Hugo with command version')), 'hugo command output includes Site.js information line')
  t.ok(actualOutput.includes(dehydrate('🅷 🆄 🅶 🅾  Hugo Static Site Generator v0.64.1-C327E75D')), 'hugo command output includes correct hugo version')
  t.ok(actualOutput.includes(dehydrate('💕 ❨site.js❩ Goodbye!')), 'hugo commands exits as expected')
  t.end()
})

test('[commands] logs', t => {
  // Startup daemons are only supported on platforms with systemd.
  if (process.platform === 'win32' || process.platform === 'darwin' || !ensure.commandExists('systemctl')) {
    const errorMessage = 'Sorry, daemons are only supported on Linux systems with systemd (journalctl required).'

    try {
      childProcess.exec(_('logs'))
    } catch (error) {
      t.ok(dehydrate(error.output[1].toString()).includes(errorMessage), 'On non-supported systems, daemon command logs fails gracefully as expected')
    }

    t.end()
    return
  }

  const optionsWithThreeSecondTimeout = options(3000)
  childProcess.exec(_('logs'), optionsWithThreeSecondTimeout, (error, stdout, stderr) => {

    // This will end with an error due to the timeout. Ensure that the error is the one we expect.
    t.true(error, 'process termination is as expected')
    t.true(error.killed, 'logs process was killed by us')
    t.strictEquals(error.signal, 'SIGTERM', 'logs process was terminated in the manner we expect')

    actualOutput = dehydrate(stdout)
    t.true(actualOutput.includes(dehydrate('📜 ❨site.js❩ Tailing logs (press Ctrl+C to exit).')), 'stdout includes our header')
    t.true(actualOutput.includes(dehydrate('-- Logs begin at')), 'stdout includes journalctl header')
    t.end()
  })
})
