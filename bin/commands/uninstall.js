//////////////////////////////////////////////////////////////////////
//
// Command: uninstall
//
// Uninstalls Site.js after prompting for confirmation.
//
//////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const childProcess = require('child_process')

const prompts = require('prompts')
const Graceful = require('node-graceful')
const actualStringLength = require('string-length')

const ensure = require('../lib/ensure')
const status = require('../lib/status')
const disableServer = require('../lib/disable')

const Site = require('../../index')
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

  Site.logAppNameAndVersion()

  const { isActive: serverIsActive, isEnabled: serverIsEnabled } = status()

  const warning = new WarningBox()
  warning.line(`${clr('WARNING!', 'yellow')} ${clr('About to uninstall Site.js.', 'green')}`)

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

  const globalTLSFilePath = path.join(Site.settingsDirectory, 'tls', 'global')
  const globalTLSCertificatesExist = fs.existsSync(globalTLSFilePath)

  // Check if we have provisioned global TLS certificates and add a note about that to the warning box.
  if (globalTLSCertificatesExist) {
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
        console.log(' ✔ Server disabled.')
      } catch (error) {
        process.exit(1)
      }
    }

    // Remove the Site.js settings folder. All configuration data for any dependencies
    // (e.g., @small-tech/https, @ind.ie/nodecert, etc.) are stored under this main
    // top-level directory so it’s all we need to delete.
    if (fs.existsSync(Site.settingsDirectory)) {
      try {
        fs.removeSync(Site.settingsDirectory)
        console.log(' ✔ Site.js settings folder removed.')
      } catch (error) {
        console.log(`\n ❌ Could not remove the Site.js settings folder (${error}).\n`)
        process.exit(1)
      }
    } else {
      console.log(' ℹ Site.js settings folder does not exist; ignoring.')
    }

    // Remove the Site.js binary itself.
    const isWindows = process.platform === 'win32'
    const siteBinary = isWindows ? 'C:\\Program Files\\site.js' : '/usr/local/bin/site'
    if (fs.existsSync(siteBinary))
    try {
      fs.removeSync(siteBinary)
      console.log(' ✔ Site.js binary removed.')
    } catch (error) {
      console.log(`\n ❌ Could not remove the Site.js binary (${error}).\n`)
      process.exit(1)
    } else {
      console.log(' ℹ Site binary does not exist; ignoring.')
    }

    console.log(`\n 🎉 Site.js uninstalled.`)
    console.log('\n💖 Goodbye!\n')
    Graceful.exit()
  }
}

module.exports = uninstall
