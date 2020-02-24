//
// Test command-line interface commands by executing them in the shell.
//
// Note: if you are using nvm, for these tests to pass, you must create symbolic
// ===== links from your /usr/local/bin folder to your current version of Node.
//
// e.g.,
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.0/bin/node /usr/local/bin/node
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.0/bin/npm /usr/local/bin/npm
//

const test = require('tape')
const childProcess = require('child_process')

const Site = require('../index.js')
const Help = require('../bin/lib/Help')

const util = require('util')

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

function cliHeader() {
  const version = require('../package.json').version
  return `
    💕 Site.js v${version} (running on Node ${process.version})

      ╔═══════════════════════════════════════════╗
      ║ Like this? Fund us!                       ║
      ║                                           ║
      ║ We’re a tiny, independent not-for-profit. ║
      ║ https://small-tech.org/fund-us            ║
      ╚═══════════════════════════════════════════╝
  `
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


test('[bin/commands] version', t => {
  t.plan(1)

  const command = 'bin/site.js version'
  const expectedOutput = dehydrate(cliHeader())

  const actualOutput = outputForCommand(command)

  t.strictEquals(actualOutput, expectedOutput, 'Actual output from command matches expected output')
  t.end()
})


test('[bin/commands] systemd startup daemon', t => {
  t.plan(15)

  //
  // Commands used in the tests.
  //
  const enableCommand = 'bin/site.js enable test/site'
  const disableCommand = 'bin/site.js disable'
  const startCommand = 'bin/site.js start'
  const stopCommand = 'bin/site.js stop'
  const restartCommand = 'bin/site.js restart'
  const statusCommand = 'bin/site.js status'

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
  const expectedOutputForStatusCommandWhenServerIsDisabled = dehydrate(`${cliHeader()}  ❌ Site.js is inactive and disabled.`)
  const actualOutputForStatusCommandWhenServerIsDisabled = outputForCommand(statusCommand)
  t.strictEquals(actualOutputForStatusCommandWhenServerIsDisabled, expectedOutputForStatusCommandWhenServerIsDisabled, 'Server status should display correctly when server is disabled')

  //
  // Disable command should fail when server is disabled.
  //

  const expectedOutputForDisableCommandWhenServerIsDisabled = dehydrate(`${cliHeader()}  👿 Error: Site.js server is not enabled. Nothing to disable.`)
  try {
    outputForCommand(disableCommand)
  } catch (error) {
    t.pass('Disable command fails as expected when server is already disabled')
    const actualOutputForDisableCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.strictEquals(actualOutputForDisableCommandWhenServerIsDisabled, expectedOutputForDisableCommandWhenServerIsDisabled, 'Disable command should fail when server is disabled')
  }

  //
  // Start command should fail when server is disabled.
  //
  const expectedOutputForStartCommandWhenServerIsDisabled = dehydrate(`${cliHeader()}  👿 Error: Site.js daemon is not enabled. Please run site enable to enable it.`)
  try {
    outputForCommand(startCommand)
  } catch (error) {
    t.pass('Start command fails as expected when server is disabled')
    const actualOutputForStartCommandWhenServerIsDisabled = dehydrate(error.stdout)
    t.strictEquals(actualOutputForStartCommandWhenServerIsDisabled, expectedOutputForStartCommandWhenServerIsDisabled, 'Start command should fail when server is disabled')
  }

  //
  // Stop command should fail when server is not active.
  //
  const expectedOutputForStopCommandWhenServerIsNotActive = dehydrate(`${cliHeader()}  👿 Error: Site.js server is not active. Nothing to stop.`)
  try {
    outputForCommand(stopCommand)
  } catch (error) {
    t.pass('Stop command fails as expected when server is not active')
    const actualOutputForStopCommandWhenServerIsNotActive = dehydrate(error.stdout)
    t.strictEquals(actualOutputForStopCommandWhenServerIsNotActive, expectedOutputForStopCommandWhenServerIsNotActive, 'Stop command should fail when server is not active')
  }

  //
  // Restart command should fail when server is not active.
  //
  const expectedOutputForRestartCommandWhenServerIsNotActive = dehydrate(`${cliHeader()}  👿 Error: Site.js daemon is not enabled. Please run site enable to enable it.`)
  try {
    outputForCommand(restartCommand)
  } catch (error) {
    t.pass('Restart command fails as expected when server is not active')
    actualOutputForRestartCommandWhenServerIsNotActive = dehydrate(error.stdout)
    t.strictEquals(actualOutputForRestartCommandWhenServerIsNotActive, expectedOutputForRestartCommandWhenServerIsNotActive, 'Restart command should fail when server is not active')
  }

  //
  // Enable command.
  //

  //
  // Test: enable when not enabled should succeed.
  //
  const expectedOutputForEnableCommand = dehydrate(
    ` ${cliHeader()}

    😈 Launched as daemon on https://${Site.hostname} serving test/site

    😈 Installed for auto-launch at startup.

    😁👍 You’re all set!`)

  const actualOutputForEnableCommand = outputForCommand(enableCommand)

  t.strictEquals(actualOutputForEnableCommand, expectedOutputForEnableCommand, 'Enable command should succeed when server is not enabled')

  ////////////////////////////////////////////////////////////////////////////////
  //
  // Server is enabled.
  //
  ////////////////////////////////////////////////////////////////////////////////

  //
  // Status should display correctly when server is enabled.
  //
  const expectedOutputForStatusCommandWhenServerIsEnabled = dehydrate(`${cliHeader()} ✔ Site.js is active and enabled.`)
  const actualOutputForStatusCommandWhenServerIsEnabled = outputForCommand(statusCommand)
  t.strictEquals(actualOutputForStatusCommandWhenServerIsEnabled, expectedOutputForStatusCommandWhenServerIsEnabled, 'Server status should display correctly when server is enabled')


  //
  // Enable command should fail when server is enabled.
  //
  const expectedOutputForEnableCommandWhenServerIsEnabled = dehydrate(` 👿 Site.js Daemon is already running. Please stop it first with the command: site disable`)
  try {
    outputForCommand(enableCommand)
  } catch (error) {
    t.pass('Enable command fails as expected when server is enabled')
    const actualOutputForEnableCommandWhenServerIsEnabled = dehydrate(error.stdout)
    t.strictEquals(actualOutputForEnableCommandWhenServerIsEnabled, expectedOutputForEnableCommandWhenServerIsEnabled, 'Enable command should fail when server is enabled')
  }

  //
  // Stop command should succeed when server is active.
  //
  expectedOutputForStopCommandWhenServerIsActive = dehydrate(`${cliHeader()} 🎈 Server stopped.`)
  actualOutputForStopCommandWhenServerIsActive = outputForCommand(stopCommand)
  t.strictEquals(actualOutputForStopCommandWhenServerIsActive, expectedOutputForStopCommandWhenServerIsActive, 'Stop command should succeed when server is active')

  // TODO

  //
  // Server status should display correctly when server is enabled but inactive.
  //

  // TODO

  //
  // Start command should succeed when server is inactive.
  //

  // Q. What is the expected behaviour of restart command when server is inactive? [ ]

  // TODO

  //
  // Restart command should succeed when server is active.
  //

  //
  // Disable command should succeed when server is enabled.
  //

  const expectedOutputForDisableCommand = dehydrate(`${cliHeader()} 🎈 Server stopped and removed from startup.`)
  const actualOutputForDisableCommand = outputForCommand(disableCommand)
  t.strictEquals(actualOutputForDisableCommand, expectedOutputForDisableCommand, 'Disable command should succeed when server is enabled')

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

  command    serve | enable | disable | start | stop | restart | logs | status | update | hugo | uninstall | version | help
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

  --aliases      Specify additional domains to obtain TLS certs for and respond to.

  For serve command:

  --sync-to      The host to sync to.
  --sync-from      The folder to sync from (only relevant if --sync-to is specified).
  --exit-on-sync    Exit once the first sync has occurred. Useful in deployment scripts.
  --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).

  For enable command:

  --ensure-can-sync    Ensure server can rsync via ssh.

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

  • Serve current folder, sync it to my.site  ▶ site --sync-to=my.site
    (shorthand and full)      ▶ site serve . @localhost:443 --sync-to=my.site

  • Serve demo folder, sync it to my.site  ▶ site serve demo --sync-to=my.site
  • Ditto, but use account me on my.site  ▶ site serve demo --sync-to=me@my.site
  • Ditto, but sync to remote folder ~/www  ▶ site serve demo --sync-to=me@my.site:www
  • Ditto, but specify absolute path    ▶ site serve demo --sync-to=me@my.site:/home/me/www

  • Sync current folder, proxy localhost:1313  ▶ site serve :1313 --sync-from=. --sync-to=my.site

  • Sync current folder to my.site and exit  ▶ site --sync-to=my.site --exit-on-sync

  • Sync demo folder to my.site and exit  ▶ site demo --sync-to=my.site --exit-on-sync
    (alternative forms)      ▶ site --sync-from=demo --sync-to=my.site --exit-on-sync

    Stage and deploy using globally-trusted Let’s Encrypt certificates:

    Regular process:

  • Serve current folder      ▶ site @hostname

  • Serve current folder also at aliases  ▶ site @hostname --aliases=other.site,www.other.site

  • Serve folder demo        ▶ site demo @hostname
    (shorthand and full)      ▶ site serve demo @hostname

  • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

    Start-up daemon:

  • Serve current folder as daemon    ▶ site enable
  • Ditto & also ensure it can rsync via ssh  ▶ site enable --ensure-can-sync
  • Get status of deamon      ▶ site status
  • Display server logs      ▶ site logs
  • Stop current daemon      ▶ site disable

    Static site generation:

  • Create a new Hugo site      ▶ site hugo new site demo

  For further information, please see https://sitejs.org
  `)

  t.strictEquals(linuxWithSystemdHelp, linuxWithSystemdExpectedHelpOutput, 'Actual help output should match expected output (linux with systemd)')

  const linuxWithoutSystemdExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] [@host[:port]] [--options]
    command    serve | update | hugo | uninstall | version | help
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

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For both serve and enable commands:
    --aliases      Specify additional domains to obtain TLS certs for and respond to.
    For serve command:
    --sync-to      The host to sync to.
    --sync-from      The folder to sync from (only relevant if --sync-to is specified).
    --exit-on-sync    Exit once the first sync has occurred. Useful in deployment scripts.
    --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).
    For enable command:
    --ensure-can-sync    Ensure server can rsync via ssh.

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

    • Serve current folder, sync it to my.site  ▶ site --sync-to=my.site
      (shorthand and full)      ▶ site serve . @localhost:443 --sync-to=my.site
    • Serve demo folder, sync it to my.site  ▶ site serve demo --sync-to=my.site
    • Ditto, but use account me on my.site  ▶ site serve demo --sync-to=me@my.site
    • Ditto, but sync to remote folder ~/www  ▶ site serve demo --sync-to=me@my.site:www
    • Ditto, but specify absolute path    ▶ site serve demo --sync-to=me@my.site:/home/me/www
    • Sync current folder, proxy localhost:1313  ▶ site serve :1313 --sync-from=. --sync-to=my.site
    • Sync current folder to my.site and exit  ▶ site --sync-to=my.site --exit-on-sync
    • Sync demo folder to my.site and exit  ▶ site demo --sync-to=my.site --exit-on-sync
      (alternative forms)      ▶ site --sync-from=demo --sync-to=my.site --exit-on-sync

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site @hostname
    • Serve current folder also at aliases  ▶ site @hostname --aliases=other.site,www.other.site
    • Serve folder demo        ▶ site demo @hostname
      (shorthand and full)      ▶ site serve demo @hostname
    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

    Linux-specific notes:
      - Production use is not available on this Linux distribution as systemd does not exist.
      - For production use, we currently recommend using Ubuntu 18.04 LTS.

    For further information, please see https://sitejs.org

  `)

  t.strictEquals(linuxWithoutSystemdHelp, linuxWithoutSystemdExpectedHelpOutput, 'Actual help output should match expectated output (linux without systemd)')


  const windowsExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] ["@host[:port]"] [--options]
    command    serve | update | hugo | uninstall | version | help
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

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For serve command:
    --aliases      Specify additional domains to obtain TLS certs for and respond to.

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

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site "@hostname"
    • Serve current folder also at aliases  ▶ site "@hostname" --aliases=other.site,www.other.site
    • Serve folder demo        ▶ site demo "@hostname"
      (shorthand and full)      ▶ site serve demo "@hostname"
    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 "@hostname"

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

    Windows-specific notes:
      - Unlike Linux and macOS, you must use quotation marks around @localhost and @hostname.
      - The sync feature, available on Linux and macOS, is not available on Windows as rsync is not available.
      - Production use is not available on Windows as it requires Linux with systemd.

    For further information, please see https://sitejs.org
  `)

  t.strictEquals(windowsHelp, windowsExpectedHelpOutput, 'Actual help output should match expected output (windows)')

  const macExpectedHelpOutput = dehydrate(`
  Usage:
  ▶ site [command] [folder|:port] [@host[:port]] [--options]
    command    serve | update | hugo | uninstall | version | help
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

    hugo  Passes the remainder of the command string to the integrated Hugo static site generator.
    update  Check for Site.js updates and update if new version is found.
    uninstall  Uninstall Site.js.
    version  Display version and exit.
    help  Display this help screen and exit.
    If command is omitted, behaviour defaults to serve.
    Options:

    For both serve and enable commands:
    --aliases      Specify additional domains to obtain TLS certs for and respond to.
    For serve command:
    --sync-to      The host to sync to.
    --sync-from      The folder to sync from (only relevant if --sync-to is specified).
    --exit-on-sync    Exit once the first sync has occurred. Useful in deployment scripts.
    --sync-folder-and-contents  Sync local folder and contents (default is to sync the folder’s contents only).
    For enable command:
    --ensure-can-sync    Ensure server can rsync via ssh.

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

    • Serve current folder, sync it to my.site  ▶ site --sync-to=my.site
      (shorthand and full)      ▶ site serve . @localhost:443 --sync-to=my.site
    • Serve demo folder, sync it to my.site  ▶ site serve demo --sync-to=my.site
    • Ditto, but use account me on my.site  ▶ site serve demo --sync-to=me@my.site
    • Ditto, but sync to remote folder ~/www  ▶ site serve demo --sync-to=me@my.site:www
    • Ditto, but specify absolute path    ▶ site serve demo --sync-to=me@my.site:/home/me/www
    • Sync current folder, proxy localhost:1313  ▶ site serve :1313 --sync-from=. --sync-to=my.site
    • Sync current folder to my.site and exit  ▶ site --sync-to=my.site --exit-on-sync
    • Sync demo folder to my.site and exit  ▶ site demo --sync-to=my.site --exit-on-sync
      (alternative forms)      ▶ site --sync-from=demo --sync-to=my.site --exit-on-sync

      Stage using globally-trusted Let’s Encrypt certificates:

    • Serve current folder      ▶ site @hostname
    • Serve current folder also at aliases  ▶ site @hostname --aliases=other.site,www.other.site
    • Serve folder demo        ▶ site demo @hostname
      (shorthand and full)      ▶ site serve demo @hostname
    • Proxy localhost:1313 ⇄ https://hostname  ▶ site serve :1313 @hostname

      Static site generation:
    • Create a new Hugo site      ▶ site hugo new site demo

    Mac-specific notes:
      - Production use is not available on macOS as it requires Linux with systemd.

    For further information, please see https://sitejs.org
  `)

  t.strictEquals(macHelp, macExpectedHelpOutput, 'Actual help output should match expected output (mac)')

  t.end()
})

test('[commands] hugo', t => {
  t.plan(1)

  const expectedOutput = dehydrate(`
  ${cliHeader()}
  🎠    ❨Site.js❩ Running Hugo with command version

  🅷 🆄 🅶 🅾  Hugo Static Site Generator v0.64.1-C327E75D linux/amd64 BuildDate: 2020-02-09T20:47:32Z
  🅷 🆄 🅶 🅾

     💕    ❨Site.js❩ Goodbye!
  `)

  const actualOutput = outputForCommand('bin/site.js hugo version')

  t.strictEquals(actualOutput, expectedOutput, 'Actual output matches expected output')
  t.end()
})

test('[commands] logs', async t => {
  t.plan(5)

  const optionsWithOneSecondTimeout = options(1000)
  childProcess.exec('bin/site.js logs', optionsWithOneSecondTimeout, (error, stdout, stderr) => {

    // This will end with an error due to the timeout. Ensure that the error is the one we expect.
    t.true(error, 'process termination is as expected')
    t.true(error.killed, 'logs process was killed by us')
    t.strictEquals(error.signal, 'SIGTERM', 'logs process was terminated in the manner we expect')

    actualOutput = dehydrate(stdout)
    t.true(actualOutput.includes(dehydrate('📜 Tailing logs (press Ctrl+C to exit).')), 'stdout includes our header')
    t.true(actualOutput.includes(dehydrate('-- Logs begin at')), 'stdout includes journalctl header')
    t.end()
  })
})
