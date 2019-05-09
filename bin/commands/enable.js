//////////////////////////////////////////////////////////////////////
//
// Command: enable
//
// Enables the web server daemon (launches it as a startup daemon).
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

const webServer = require('../../index')

function enable (options) {
  //
  // Sanity checks.
  //
  ensure.systemctl()
  ensure.serverDaemonNotActive()

  // While we’ve already checked that the Indie Web Server daemon is not
  // active, above, it is still possible that there is another service
  // running on port 443. We could ignore this and enable the systemd
  // service anyway and this command would succeed and our server would
  // start being served when the blocking service is stopped. However, this
  // is misleading as the command succeeding makes it appear as if the
  // server has started running. So, instead, we detect if the port
  // is already in use and, if it is, refuse to install and activate the
  // service. This is should provide the least amount of surprise in usage.
  tcpPortUsed.check(options.port)
  .then(inUse => {
    if (inUse) {
      console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
      process.exit(1)
    } else {

      // Ensure we are root (we do this here instead of before the asynchronous call to
      // avoid any timing-related issues around a restart and a port-in-use error).
      ensure.root()

      //
      // Create the systemd service unit.
      //
      const pathToServe = options.pathToServe
      const binaryExecutable = '/usr/local/bin/web-server'
      const sourceDirectory = path.resolve(__dirname, '..', '..')
      const nodeExecutable = `node ${path.join(sourceDirectory, 'bin/web-server.js')}`
      const executable = runtime.isBinary ? binaryExecutable : nodeExecutable

      const absolutePathToServe = path.resolve(pathToServe)

      // Expectation: At this point, regardless of whether we are running as a regular
      // Node script or as a standalone executable created with Nexe, all paths should
      // be set correctly.

      // Get the regular account name (i.e, the unprivileged account that is
      // running the current process via sudo).
      const accountUID = parseInt(process.env.SUDO_UID)
      if (!accountUID) {
        console.error(`\n 👿 Error: could not get account ID.\n`)
        process.exit(1)
      }

      let accountName
      try {
        // Courtesy: https://www.unix.com/302402784-post4.html
        accountName = childProcess.execSync(`awk -v val=${accountUID} -F ":" '$3==val{print $1}' /etc/passwd`, {env: process.env, stdio: 'pipe'}).toString()
      } catch (error) {
        console.error(`\n 👿 Error: could not get account name \n${error}.`)
        process.exit(1)
      }

      const unit = `[Unit]
      Description=Indie Web Server
      Documentation=https://ind.ie/web-server/
      After=network.target
      StartLimitIntervalSec=0

      [Service]
      Type=simple
      User=${accountName}
      Environment=PATH=/sbin:/usr/bin:/usr/local/bin
      Environment=NODE_ENV=production
      RestartSec=1
      Restart=always

      ExecStart=${executable} global ${absolutePathToServe}

      [Install]
      WantedBy=multi-user.target
      `

      // Save the systemd service unit.
      fs.writeFileSync('/etc/systemd/system/web-server.service', unit, 'utf-8')

      //
      // Enable and start systemd service.
      //
      try {
        // Start.
        childProcess.execSync('sudo systemctl start web-server', {env: process.env, stdio: 'pipe'})
        console.log(`${webServer.version()}\n 😈 Launched as daemon on ${clr(`https://${os.hostname()}`, 'green')} serving ${clr(pathToServe, 'cyan')}\n`)

        // Enable.
        childProcess.execSync('sudo systemctl enable web-server', {env: process.env, stdio: 'pipe'})
        console.log(` 😈 Installed for auto-launch at startup.\n`)
      } catch (error) {
        console.error(error, `\n 👿 Error: could not enable web server.\n`)
        process.exit(1)
      }

      // When enable command is run with the --sync option, ensure that the current environment
      // is set up to accept remote rsync over ssh and also provide some useful information
      // for setting up the client-side development server.
      if (options.enableSync) {
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

    const homeDirectory = process.env.HOME

    // Note: since this process will be run internally with sudo, we cannot use process.env.USER
    // ===== here as that would return root. However, process.env.HOME returns the regular account’s home folder
    //       and we can use that to find the account name.
    const homeDirectoryFragments = homeDirectory.split(path.sep)
    const account = homeDirectoryFragments[homeDirectoryFragments.length - 1]

    const absolutePathToServe = path.resolve(pathToServe)
    const absolutePathToServeIsChildOfHome = absolutePathToServe.startsWith(homeDirectory)

    let options = null
    if (absolutePathToServeIsChildOfHome) {
      // We can use the --folder argument
      let folder = absolutePathToServe.replace(`${homeDirectory}`, '')
      if (folder.startsWith('/')) { folder = folder.substr(1) }
      if (!folder.endsWith('/')) { folder = `${folder}/` }

      options = `--host=${hostname} --account=${account} --folder=${folder}`
    } else {
      // We need to specify an absolute path to the folder and provide a remote connection string.
      options = `--to=${account}@${hostname}:${absolutePathToServe}`
    }
    console.log(` 💞 [Sync] To sync from your local machine, from within your site’s folder, use:`)
    console.log(` 💞 [Sync] web-server sync ${options}\n`)
  } catch (error) {
    console.error(error, `\n 👿 Error: could not get connection information.\n`)
    process.exit(1)
  }
}


// Disable rsync daemon on host to plug that security hole in case it was on. (All
// our rsync calls will take place via ssh as they should.)
function disableInsecureRsyncDaemon() {
  try {
    process.stdout.write(' 💞 [Sync] Securing Rsync… ')
    childProcess.execSync('sudo systemctl stop rsync', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl disable rsync', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl mask rsync', {env: process.env, stdio: 'pipe'})
    console.log('done!')
    console.log(` 💞 [Sync] Rsync set up to only allow secure access via ssh.\n`)
  } catch (error) {
    console.error(error, `\n 👿 Error: could not disable insecure rsync daemon.\n`)
    process.exit(1)
  }
}

module.exports = enable
