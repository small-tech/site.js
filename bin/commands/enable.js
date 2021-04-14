//////////////////////////////////////////////////////////////////////
//
// Command: enable
//
// Enables the web server daemon (launches it as a startup daemon).
//
// Note: enable is only supported on Linux distributions that have
// ===== systemd. macOS and Windows are not supported for
//       production use. Ideally, deploy on Ubuntu 18.04 LTS.
//
//////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const childProcess = require('child_process')

const tcpPortUsed = require('tcp-port-used')

const status = require('../lib/status')
const runtime = require('../lib/runtime')
const ensure = require('../lib/ensure')
const clr = require('../../lib/clr')

const Util = require('../../lib/Util')
const Site = require('../../index')

function enable (args) {
  Site.logAppNameAndVersion()

  // Security
  Util.refuseToRunAsRoot()

  //
  // Sanity checks.
  //
  ensure.systemctl()
  ensure.serverDaemonNotActive()

  // Note: daemons are currently only supported on port 443. If there is a need
  // ===== to support other ports, please open an issue and explain the use case
  //       (it is easy enough to implement.)

  // Ensure privileged ports are disabled on Linux machines.
  // For details, see: https://source.small-tech.org/site.js/app/-/issues/169
  ensure.privilegedPortsAreDisabled()

  // Check that a service is not already enabled.
  if (status().isEnabled) {
    console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} A Site.js service is already enabled.\n\n         ${clr('Please disable it before retrying using:', 'yellow')} site ${clr('disable', 'green')}\n`)
    process.exit(1)
  }

  // While we’ve already checked that the Site.js daemon is not
  // active, above, it is still possible that there is another service
  // running on port 443. We could ignore this and enable the systemd
  // service anyway and this command would succeed and our server would
  // start being served when the blocking service is stopped. However, this
  // is misleading as the command succeeding makes it appear as if the
  // server has started running. So, instead, we detect if the port
  // is already in use and, if it is, refuse to install and activate the
  // service. This is should provide the least amount of surprise in usage.
  tcpPortUsed.check(443)
  .then(inUse => {
    if (inUse) {
      console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Cannot start daemon. Port 443 is already in use.\n`)
      process.exit(1)
    } else {
      // Ensure the settings directory exists (and is created with regular permissions).
      fs.ensureDirSync(Site.settingsDirectory)

      // Ensure we are root (we do this here instead of before the asynchronous call to
      // avoid any timing-related issues around a restart and a port-in-use error).
      ensure.root()

      if (args.positional.length > 1) {
        // Syntax error.
        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Too many arguments (expects just one, the path to serve).`)
        process.exit(1)
      }

      //
      // Create the systemd service unit.
      //
      let pathToServe = args.positional.length === 1 ? args.positional[0] : '.'
      const binaryExecutable = '/usr/local/bin/site'
      const sourceDirectory = path.resolve(__dirname, '..', '..')
      const executable = runtime.isBinary ? binaryExecutable : `${childProcess.execSync('which node').toString().trim()} ${path.join(sourceDirectory, 'bin/site.js')}`

      let absolutePathToServe

      if (args.named['owncast']) {
        console.log('   💮️    ❨site.js❩ Owncast setup requested.')

        // This is going to be a proxy server for Owncast (at its default port).
        // Override any setting that might have been passed (it should not have been).
        pathToServe = ':8080'
      }

      if (pathToServe.startsWith(':')) {
        // This is a proxy server, leave as is.
        absolutePathToServe = pathToServe
      } else {
        // It is a common mistake to start the server in a .dynamic folder (or subfolder)
        // or a .hugo folder or subfolder. In these cases, try to recover and do the right thing.
        const paths = Util.magicallyRewritePathToServeIfNecessary(args.positional[0], pathToServe)
        pathToServe = paths.pathToServe
        absolutePathToServe = paths.absolutePathToServe
      }

      // If there are aliases, we will add them to the configuration so they can
      // be passed to the serve command when Site.js is started.
      const _aliases = args.named['aliases']
      const aliases = _aliases === undefined ? '' : `--aliases=${_aliases}`

      // If the domain has been manually specified, pass that on.
      const _domain = args.named['domain']
      const domain = args.named['domain'] === undefined ? '' : `--domain=${_domain}`

      // This will skip the domain reachability check when starting a global server.
      const skipDomainReachabilityCheck = args.named['skip-domain-reachability-check'] === true ? ' --skip-domain-reachability-check ' : ''

      // This will only show errors in the access log.
      const accessLogErrorsOnly = args.named['access-log-errors-only'] === true ? ' --access-log-errors-only ' : ''

      // This will disable the access log completely. Do not do this unless you have a good
      // reason to as you may miss important errors.
      const accessLogDisable = args.named['access-log-disable'] === true ? ' --access-log-disable ' : ''

      // Expectation: At this point, regardless of whether we are running as a regular
      // Node script or as a standalone executable created with Nexe, all paths should
      // be set correctly.

      // Get the regular account name (i.e, the unprivileged account that is
      // running the current process via sudo).
      const accountUID = parseInt(process.env.SUDO_UID)
      if (!accountUID) {
        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not get account ID.\n`)
        process.exit(1)
      }

      const launchCommand = `${executable} ${absolutePathToServe} @hostname ${domain} ${aliases} ${skipDomainReachabilityCheck} ${accessLogErrorsOnly} ${accessLogDisable}`

      const accountName = Util.unprivilegedAccountName()

      const unit = `[Unit]
      Description=Site.js
      Documentation=https://sitejs.org/
      After=network.target
      StartLimitIntervalSec=0

      [Service]
      Type=simple
      User=${accountName}
      Environment=PATH=/sbin:/usr/bin:/usr/local/bin
      Environment=NODE_ENV=production
      RestartSec=1
      Restart=always

      ExecStart=${launchCommand}

      [Install]
      WantedBy=multi-user.target
      `

      //
      // Ensure passwordless sudo is set up before installing and activating the
      // service (or else automatic updates will fail).
      //

      try {
        // The following command will fail if passwordless sudo is not set up.
        childProcess.execSync(`sudo --user=${accountName} sudo --reset-timestamp --non-interactive cat /etc/sudoers > /dev/null 2>&1`, {env: process.env})
      } catch {
        // Passwordless sudo is not set up.
        console.log(' 🔐 Passwordless sudo is required for automatic server updates. Attempting to set up…')

        // Sanity check: ensure the /etc/sudoers file exists.
        if (!fs.existsSync('/etc/sudoers')) {
          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not find /etc/sudoers file.\n`)
          process.exit(1)
        }

        // Sanity check: ensure the /etc/sudoers.d directory exists as this is where we
        // need to put our sudo rule to allow passwordless sudo.
        if (!fs.existsSync('/etc/sudoers.d')) {
          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not find /etc/sudoers.d directory.\n`)
          process.exit(1)
        }

        // Sanity check: ensure sudo is set up to read sudo rules from /etc/sudoers.d directory.
        const sudoers = fs.readFileSync('/etc/sudoers', 'utf-8')
        if (!sudoers.includes('#includedir /etc/sudoers.d')) {
          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Cannot set up passwordless sudo as /etc/sudoers.d is not included from /etc/sudoers.\n`)
          console.log(`         ${clr('❨site.js❩', 'red')} Add this line to the end of that file using visudo to fix:\n`)
          console.log(`         ${clr('❨site.js❩', 'red')} #includedir /etc/sudoers.d\n`)
          process.exit(1)
        }

        // Create our passwordless sudo configuration file in the temporary folder.
        fs.writeFileSync('/tmp/sitejs-passwordless-sudo', `${accountName} ALL=(ALL:ALL) NOPASSWD: ALL\n`)

        // Check the syntax to ensure that we don’t mess up the system and lock the account out.
        // (You can never be too careful when updating the sudo rules as one mistake and you could
        // lock a person out of their account.)
        try {
          childProcess.execSync(`visudo -c -f /tmp/sitejs-passwordless-sudo`)
        } catch (error) {
          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not verify that our attempt to set up passwordless sudo would succeed. Aborting.\n${error}\n`)
          process.exit(1)
        }

        // OK, the file is valid, copy it to the actual directory so it takes effect.
        try {
          childProcess.execSync('sudo cp /tmp/sitejs-passwordless-sudo /etc/sudoers.d/')
        } catch (error) {
          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not install the passwordless sudo rule. Aborting.\n${error}\n`)
          process.exit(1)
        }

        console.log('   🔐    Passwordless sudo successfully set up.')
      }

      //
      // Save the Site.js systemd service unit.
      //
      const systemdServicesDirectory = path.join('/', 'etc', 'systemd', 'system')
      const siteJsServiceFilePath = path.join(systemdServicesDirectory, 'site.js.service')
      fs.writeFileSync(siteJsServiceFilePath, unit, 'utf-8')

      //
      // Owncast integration. If the --owncast flag is supplied, also:
      //   - (a) install owncast if it doesn’t already exist.
      //   - (b) create and install the systemd unit for owncast if it doesn’t already exist.
      //
      if (args.named['owncast']) {
        console.log('   💮️    ❨site.js❩ Setting up to serve your Owncast instance.')

        // Is Owncast installed? If so, just use it.
        // Otherwise, install it.
        // Note: we expect Owncast to be installed in ~/owncast.
        const owncastDirectory = path.join(Util.unprivilegedHomeDirectory(), 'owncast')
        const owncastBinaryPath = path.join(owncastDirectory, 'owncast')
        try {
          fs.accessSync(owncastBinaryPath, fs.constants.X_OK)
        } catch (error) {
          // The Owncast binary is not where we expect it to be.
          // Install Owncast there.
          console.log(`   💮️    ❨site.js❩ Owncast installation not found at ${owncastDirectory}, running installation script…`)

          // Ensure that the directory is empty and exists.
          if (fs.existsSync(owncastDirectory)) {
            console.log(`   💮️    ❨site.js❩ Owncast directory exists at ${owncastDirectory}, removing it before installation.`)
            fs.removeSync(owncastDirectory)
          }

          try {
            // Copy the installation script to our settings directory
            // and run it from there (for when we’re running from within a Nexe bundle).
            const internalOwncastInstallationScriptPath = path.resolve(path.join(__dirname, '..', 'sh', 'install-owncast.sh'))
            const installationScript = fs.readFileSync(internalOwncastInstallationScriptPath, 'utf-8')
            const externalOwncastInstallationScriptPath = path.join(Site.settingsDirectory, 'install-owncast.sh')
            fs.writeFileSync(externalOwncastInstallationScriptPath, installationScript, {encoding: 'utf-8', mode: 0o755})
            childProcess.execSync(`OWNCAST_INSTALL_DIRECTORY=${owncastDirectory} ${externalOwncastInstallationScriptPath}`, {env: process.env, stdio: 'pipe'})
            console.log(`   💮️    ❨site.js❩ Owncast installed at ${owncastDirectory}.`)
          } catch (error) {
            console.log(error, `\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not install Owncast.\n`)
            process.exit(1)
          }
        }

        console.log('   💮️    ❨site.js❩ Owncast installation is OK.')

        // Is the Owncast service installed? If so, leave it be.
        // Otherwise, install it.
        const owncastServiceFilePath = path.join(systemdServicesDirectory, 'owncast.service')
        if (!fs.existsSync(owncastServiceFilePath)) {
          // Create Owncast service unit based on template at
          // https://github.com/owncast/owncast/blob/develop/examples/owncast-sample.service
          const owncastUnit = `
          [Unit]
          Description=Owncast

          [Service]
          Type=simple
          WorkingDirectory=${owncastDirectory}
          ExecStart=${owncastBinaryPath}
          Restart=on-failure
          RestartSec=5

          [Install]
          WantedBy=multi-user.target
          `
          fs.writeFileSync(owncastServiceFilePath, owncastUnit, 'utf-8')
        }

        console.log('   💮️    ❨site.js❩ Owncast service unit is installed.')

        // Also start the Owncast service.
        try {
          // Start.
          childProcess.execSync('sudo systemctl start owncast', {env: process.env, stdio: 'pipe'})
          console.log(`   💮️    ❨site.js❩ Owncast launched as daemon.`)

          // Enable.
          childProcess.execSync('sudo systemctl enable owncast', {env: process.env, stdio: 'pipe'})
          console.log(`   💮️    ❨site.js❩ Owncast daemon installed for auto-launch at startup.`)
        } catch (error) {
          console.log(error, `\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not enable Owncast server.\n`)
          process.exit(1)
        }
      }

      // Pre-flight check: run the server normally and ensure that it starts up properly
      // before installing it as a daemon. If there are any issues we want to catch it here
      // ourselves instead of having them manifest when systemd runs it.
      console.log('   🧚‍♀️  ❨site.js❩ About to carry out server daemon pre-flight check.')
      console.log('   ✨    ❨site.js❩ Launching server…')
      try {
        // Note: we are launching Site.js without privileges here as we currently have privileges.
        // ===== (If we don’t do that, the configuration directories will be created with root as
        //       the owner and that they cannot be accessed by the regular unprivileged daemon process.)
        childProcess.execSync(`sudo --user=${accountName} ${launchCommand} --dont-log-app-name-and-version --exit-after-launch ${skipDomainReachabilityCheck}`, {env: process.env, stdio: 'pipe'})
        console.log('   ✨    ❨site.js❩ Pre-flight check successful.')
      } catch (error) {
        const stdout = error.stdout.toString()
        const errorMessage = stdout.slice(stdout.match(/❌.*?/).index)

        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Server launch failed: \n  `, errorMessage.replace('❌', '  ').replace('❨site.js❩ Error: ', ''), '\n')
        process.exit(1)
      }


      //
      // Enable and start the Site.js systemd service.
      //
      try {
        // Start.
        const prettyPathToServe = pathToServe === '.' ? 'current directory' : pathToServe
        childProcess.execSync('sudo systemctl start site.js', {env: process.env, stdio: 'pipe'})
        console.log(`   😈    ❨site.js❩ Launched as daemon on ${clr(`https://${domain === '' ? os.hostname() : _domain}`, 'green')} serving ${clr(prettyPathToServe, 'cyan')}`)

        // Enable.
        childProcess.execSync('sudo systemctl enable site.js', {env: process.env, stdio: 'pipe'})
        console.log(`   😈    ❨site.js❩ Installed daemon for auto-launch at startup.`)
      } catch (error) {
        console.log(error, `\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not enable server.\n`)
        process.exit(1)
      }

      // When enable command is run with the --ensure-can-sync option, ensure that the current environment
      // is set up to accept remote rsync over ssh and also provide some useful information
      // for setting up the client-side development server.
      if (args.named['ensure-can-sync']) {
        ensure.rsyncExists()
        disableInsecureRsyncDaemon()
        displayConnectionInformation(pathToServe)
      }

      // All OK!
      console.log('\n   👍    ❨site.js❩ You’re all set!\n')
    }
  })
}


function displayConnectionInformation(pathToServe) {
  try {
    const hostname = childProcess.execSync('hostname', {env: process.env, stdio: 'pipe'}).toString('utf-8').trim()

    // Note: since this process will be run internally with sudo, we cannot use process.env.USER
    // ===== here as that would return root. However, process.env.HOME returns the regular account’s home folder
    //       and we can use that to find the account name.
    const homeDirectory = process.env.HOME
    const homeDirectoryFragments = homeDirectory.split(path.sep)
    const account = homeDirectoryFragments[homeDirectoryFragments.length - 1]

    const absolutePathToServe = path.resolve(pathToServe)

    const syncToValue = `${account}@${hostname}:${absolutePathToServe}`

    console.log(` 💫 [Sync] To sync from your local machine, from within your site’s folder, use:`)
    console.log(` 💫 [Sync] site --sync-to=${syncToValue}\n`)
  } catch (error) {
    console.log(error, `\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not get connection information.\n`)
    process.exit(1)
  }
}


// Disable rsync daemon on host to plug that security hole in case it was on. (All
// our rsync calls will take place via ssh as they should.)
function disableInsecureRsyncDaemon() {
  try {
    process.stdout.write(' 💫 [Sync] Securing Rsync… ')
    childProcess.execSync('sudo systemctl stop rsync', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl disable rsync', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl mask rsync', {env: process.env, stdio: 'pipe'})
    console.log('done!')
    console.log(` 💫 [Sync] Rsync set up to only allow secure access via ssh.\n`)
  } catch (error) {
    console.log(error, `\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not disable insecure rsync daemon.\n`)
    process.exit(1)
  }
}

module.exports = enable
