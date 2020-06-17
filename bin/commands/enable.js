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
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const tcpPortUsed = require('tcp-port-used')

const runtime = require('../lib/runtime')
const ensure = require('../lib/ensure')
const clr = require('../../lib/clr')

const Site = require('../../index')

function enable (args) {
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
      console.log(`\n 🤯 Error: Cannot start daemon. Port 443 is already in use.\n`)
      process.exit(1)
    } else {
      // Ensure we are root (we do this here instead of before the asynchronous call to
      // avoid any timing-related issues around a restart and a port-in-use error).
      ensure.root()

      if (args.positional.length > 1) {
        // Syntax error.
        console.log(`\n ${clr('Syntax error: ', 'red')} Too many arguments supplied to enable command (it expects at most one, the path to serve).`)
        require('./help')()
      }

      //
      // Create the systemd service unit.
      //
      const pathToServe = args.positional.length === 1 ? args.positional[0] : '.'
      const binaryExecutable = '/usr/local/bin/site'
      const sourceDirectory = path.resolve(__dirname, '..', '..')
      const nodeExecutable = `node ${path.join(sourceDirectory, 'bin/site.js')}`
      const executable = runtime.isBinary ? binaryExecutable : nodeExecutable

      const absolutePathToServe = path.resolve(pathToServe)

      // If there are aliase, we will add them to the configuration so they can
      // be passed to the serve command when Site.js is started.
      const _aliases = args.named['aliases']
      const aliases = _aliases === undefined ? '' : `--aliases=${_aliases}`

      // Expectation: At this point, regardless of whether we are running as a regular
      // Node script or as a standalone executable created with Nexe, all paths should
      // be set correctly.

      // Get the regular account name (i.e, the unprivileged account that is
      // running the current process via sudo).
      const accountUID = parseInt(process.env.SUDO_UID)
      if (!accountUID) {
        console.log(`\n ❌ Error: could not get account ID.\n`)
        process.exit(1)
      }

      const launchCommand = `${executable} ${absolutePathToServe} @hostname ${aliases}`

      let accountName
      try {
        // Courtesy: https://www.unix.com/302402784-post4.html
        accountName = childProcess.execSync(`awk -v val=${accountUID} -F ":" '$3==val{print $1}' /etc/passwd`, {env: process.env, stdio: 'pipe'}).toString().replace('\n', '')
      } catch (error) {
        console.log(`\n ❌ Error: could not get account name \n${error}.`)
        process.exit(1)
      }

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
          console.log('\n ❌ Sorry, could not find /etc/sudoers file. Cannot set up Site.js daemon.\n')
          process.exit(1)
        }

        // Sanity check: ensure the /etc/sudoers.d directory exists as this is where we
        // need to put our sudo rule to allow passwordless sudo.
        if (!fs.existsSync('/etc/sudoers.d')) {
          console.log('\n ❌ Sorry, could not find /etc/sudoers.d directory. Cannot set up Site.js daemon.\n')
          process.exit(1)
        }

        // Sanity check: ensure sudo is set up to read sudo rules from /etc/sudoers.d directory.
        const sudoers = fs.readFileSync('/etc/sudoers', 'utf-8')
        if (!sudoers.includes('#includedir /etc/sudoers.d')) {
          console.log(`\n ❌ Sorry, cannot set up passwordless sudo as /etc/sudoers.d is not included from /etc/sudoers.\n`)
          console.log('   Add this line to the end of that file using visudo to fix:\n')
          console.log('   #includedir /etc/sudoers.d\n')
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
          console.log('\n ❌ Error: could not verify that our attempt to set up passwordless sudo would succeed. Aborting.\n${error}')
          process.exit(1)
        }

        // OK, the file is valid, copy it to the actual directory so it takes effect.
        try {
          childProcess.execSync('sudo cp /tmp/sitejs-passwordless-sudo /etc/sudoers.d/')
        } catch (error) {
          console.log('\n ❌ Error: could not install the passwordless sudo rule. Aborting.\n${error}')
          process.exit(1)
        }

        console.log(' 🔐 Passwordless sudo successfully set up.\n')
      }

      //
      // Save the systemd service unit.
      //
      fs.writeFileSync('/etc/systemd/system/site.js.service', unit, 'utf-8')

      // Pre-flight check: run the server normally and ensure that it starts up properly
      // before installing it as a daemon. If there are any issues we want to catch it here
      // ourselves instead of having them manifest when systemd runs it.
      console.log('   🧚‍♀️  ❨site.js❩ About to carry out server daemon pre-flight check.')
      console.log('   ✨    ❨site.js❩ Lauching server…')
      try {
        const preflightResult = childProcess.execSync(`${launchCommand}  --dont-log-app-name-and-version`, {env: process.env, stdio: 'pipe'})
      } catch (error) {
        const stdout = error.stdout.toString()
        const errorMessage = stdout.slice(stdout.match(/❌.*?/).index)

        console.log(`   ❌    ❨site.js❩ Error: server launch pre-flight check failed: \n  `, errorMessage.replace('❌', '  '))
        process.exit(1)
      }


      //
      // Enable and start systemd service.
      //
      try {
        // Start.
        childProcess.execSync('sudo systemctl start site.js', {env: process.env, stdio: 'pipe'})
        Site.logAppNameAndVersion()
        console.log(` 😈 Launched as daemon on ${clr(`https://${os.hostname()}`, 'green')} serving ${clr(pathToServe, 'cyan')}\n`)

        // Enable.
        childProcess.execSync('sudo systemctl enable site.js', {env: process.env, stdio: 'pipe'})
        console.log(` 😈 Installed for auto-launch at startup.\n`)
      } catch (error) {
        console.log(error, `\n ❌ Error: could not enable server.\n`)
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
      console.log(' 😁👍 You’re all set!\n')
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
    console.log(` 💫 [Sync] site --sync-to=${syncToValue} --exit-on-sync\n`)
  } catch (error) {
    console.log(error, `\n ❌ Error: could not get connection information.\n`)
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
    console.log(error, `\n ❌ Error: could not disable insecure rsync daemon.\n`)
    process.exit(1)
  }
}

module.exports = enable
