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

const runtime = require('../utilities/runtime')
const ensure = require('../utilities/ensure')
const clr = require('../utilities/cli').clr

const webServer = require('../../index')

function enable (pathToServe) {
  //
  // Sanity checks.
  //
  ensure.systemctl()
  ensure.root('enable')

  //
  // Create the systemd service unit.
  //
  const binaryExecutable = '/usr/local/bin/web-server'
  const sourceDirectory = path.resolve(__dirname, '..', '..')
  const nodeExecutable = `node ${path.join(sourceDirectory, 'bin/web-server.js')}`
  const executable = runtime.isBinary ? binaryExecutable : nodeExecutable

  const absolutePathToServe = path.resolve(pathToServe)

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
}

module.exports = enable
