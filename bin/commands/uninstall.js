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
    const renderLine = (line) => `         ║ ${line}${repeat(boxWidth - actualStringLength(line) - 1, ' ')}║\n`

    const horizontalLine = repeat(boxWidth, '═')
    const top = `\n   🔔    ╔${horizontalLine}╗\n`
    const body = this.lines.reduce((body, currentLine) => `${body}${renderLine(currentLine)}`, /* initial body is */ '')
    const bottom = `         ╚${horizontalLine}╝\n`

    return top + renderLine('') + body + renderLine('') + bottom
  }

  print() {
    const box = this.render()
    console.log(box)
  }
}


async function uninstall (options) {
  Site.logAppNameAndVersion()

  const isWindows = process.platform === 'win32'

  if (!isWindows) {
    ensure.systemctl()
    ensure.root('uninstall')
  }

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
    symbol: () => (done, aborted) => aborted ? '   🛑   ' : done ? '   😉   ' : '   🧐   ',
  })

  if (!response.confirmed) {
    console.log('   🛑    ❨site.js❩ Aborted.')
    console.log('\n   💕    ❨site.js❩ Goodbye!\n')
    Graceful.exit()
  } else {
    console.log('\n   👋    ❨site.js❩ Uninstalling…\n')

    // Disable the server, if it is enabled.
    if (serverIsEnabled) {
      try {
        disableServer()
        console.log(' ✔ Server disabled.')
      } catch (error) {
        process.exit(1)
      }
    }

    // Remove the Site.js settings folder. All configuration data for any dependencies (e.g., @small-tech/https, etc.)
    // are stored under this main top-level directory so it’s all we need to delete.
    if (fs.existsSync(Site.settingsDirectory)) {
      try {
        fs.removeSync(Site.settingsDirectory)
        console.log(' ✔ Site.js settings folder removed.')
      } catch (error) {
        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not remove the Site.js settings folder (${error}).\n`)
        process.exit(1)
      }
    } else {
      console.log(' ℹ Site.js settings folder does not exist; ignoring.')
    }

    // Remove the Site.js binary itself.
    const siteBinary = isWindows ? 'C:\\Program Files\\site.js' : '/usr/local/bin/site'
    if (fs.existsSync(siteBinary)) {
      if (isWindows) {
        // Windows cannot reference count (aww, bless), so we can't uninstall ourselves
        // while running. Ask the person to manually remove it.
        console.log('\n ℹ IMPORTANT: We cannot remove a running process under Windows. Please consider using an operating system that actually works (like Linux) in the future. In the meanwhile, please run the following command manually under a PowerShell account with adminstrative privileges to remove the binary: ')
        console.log(`\n rm -r -fo "${siteBinary}"`)
      } else {
        // Linux-like systems. Ah, the bliss of systems that actually work as they should.
        try {
          fs.removeSync(siteBinary)
          console.log(' ✔ Site.js binary removed.')
        } catch (error) {
          console.log(`\n   ❌     ${clr('❨site.js❩ Error:', 'red')} Could not remove the Site.js binary (${error}).\n`)
          process.exit(1)
        }
      }
    } else {
      console.log('   ℹ    Site binary does not exist; ignoring.')
    }

    if (!isWindows) {
      console.log(`   🎉    ❨site.js❩ Uninstalled.`)
    }
    console.log('\n   💕    ❨site.js❩ Goodbye!\n')
    Graceful.exit()
  }
}

module.exports = uninstall
