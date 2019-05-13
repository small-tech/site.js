//////////////////////////////////////////////////////////////////////
//
// Command: uninstall
//
// Uninstalls Indie Web Server after prompting for confirmation.
//
//////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const prompts = require('prompts')
const Graceful = require('node-graceful')
const actualStringLength = require('string-length')

const ensure = require('../lib/ensure')
const status = require('../lib/status')
const disableServer = require('../lib/disable')

const webServer = require('../../index')
const clr = require('../../lib/clr')

class WarningBox {
  constructor () {
    this.lines = []
  }

  line (line) {
    this.lines.push(line)
  }

  emptyLine() {
    this.lines.push('')
  }

  render() {
    // Create the box based on the length of the longest line.
    // With 1 space padding on each side of a passed line.
    const boxWidth = this.lines.reduce((longestLineLengthSoFar, currentLine) => Math.max(longestLineLengthSoFar, actualStringLength(currentLine)), /* initial longestLineLengthSoFar value is */ 0) + 2

    const repeat = (thisMany, character) => Array(thisMany).fill(character).join('')
    const renderLine = (line) => `    ║ ${line}${repeat(boxWidth - actualStringLength(line) - 1, ' ')}║\n`

    const horizontalLine = repeat(boxWidth, '═')
    const top = ` 🔔 ╔${horizontalLine}╗\n`
    const body = this.lines.reduce((body, currentLine) => `${body}${renderLine(currentLine)}`, /* initial body is */ '')
    const bottom = `    ╚${horizontalLine}╝\n`

    return top + renderLine('') + body + renderLine('') + bottom
  }

  print() {
    const box = this.render()
    console.log(box)
  }
}


async function uninstall (options) {
  ensure.systemctl()
  ensure.root('uninstall')

  console.log(webServer.version())

  const { isActive: serverIsActive, isEnabled: serverIsEnabled } = status()

  const warning = new WarningBox()
  warning.line(`${clr('WARNING!', 'yellow')} ${clr('About to uninstall Indie Web Server.', 'green')}`)

  // Check if the server is active/enabled and add a note about that to the warning box.
  if (serverIsActive && serverIsEnabled) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is active and enabled.', 'yellow')}`)
    warning.line('  It will be stopped and disabled.')
  } else if (serverIsActive) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is active.', 'yellow')}`)
    warning.line('  It will be stopped.')
  } else if (serverIsEnabled) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is enabled.', 'yellow')}`)
    warning.line('  It will be disabled.')
  }

  const acmeTLSFilePath = path.join(os.homedir(), '.acme-tls')
  const acmeTLSCertificatesExist = fs.existsSync(acmeTLSFilePath)

  // Check if we have provisioned TLS certificates and add a note about that to the warning box.
  if (acmeTLSCertificatesExist) {
    warning.emptyLine()
    warning.line(`• ${clr('You have provisioned Let’s Encrypt TLS certificates.', 'yellow')}`)
    warning.line('  These will be deleted.')
  }

  warning.print()

  const response = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: 'Are you sure you want to proceed (y/n)?',
    initial: false,
    style: 'invisible',
    symbol: () => (done, aborted) => aborted ? ' ❌' : done ? ' 😉' : ' 🧐',
  })

  if (!response.confirmed) {
    console.log('\n ❌ Aborting…\n')
    Graceful.exit()
  } else {
    console.log('\n 👋 Uninstalling…\n')

    // Disable the server, if it is enabled.
    if (serverIsEnabled) {
      try {
        disableServer()
        console.log(' ✔ Server disabled.\n')
      } catch (error) {
        process.exit(1)
      }
    }

    // Remove the Let’s Encrypt certificates folder, if one exists.
    if (acmeTLSCertificatesExist) {
      try {
        childProcess.execSync(`rm -rf ${acmeTLSFilePath}`, {env: process.env})
        console.log(' ✔ Let’s Encrypt certificates removed.\n')
      } catch (error) {
        console.log(`\n ❌ Could not remove the Let’s Encrypt certificates folder (${error}).\n`)
        process.exit(1)
      }
    }

    // Remove the local certificates folder, if one exists.
    const nodecertFilePath = path.join(os.homedir(), '.nodecert')
    if(fs.existsSync(nodecertFilePath)) {
      try {
        childProcess.execSync(`rm -rf ${nodecertFilePath}`, {env: process.env})
        console.log(' ✔ Local certificates removed.\n')
      } catch (error) {
        console.log(`\n ❌ Could not remove the local certificates folder (${error}).\n`)
        process.exit(1)
      }
    }

    // Remove the Indie Web Server binary itself.
    try {
      childProcess.execSync('rm /usr/local/bin/web-server', {env: process.env})
      console.log(' ✔ Indie Web Server binary removed.\n')
    } catch (error) {
      console.log(`\n ❌ Could not remove the Indie Web Server binary (${error}).\n`)
      process.exit(1)
    }

    console.log(`\n 🎉 Indie Web Server uninstalled.\n`)
    console.log('\n💖 Goodbye!\n')
    Graceful.exit()
  }
}

module.exports = uninstall
