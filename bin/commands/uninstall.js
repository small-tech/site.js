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

const prompts = require('prompts')
const Graceful = require('node-graceful')
const actualStringLength = require('string-length')

const status = require('../lib/status')

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
  console.log(webServer.version())

  const { isActive, isEnabled } = status()

  const warning = new WarningBox()
  warning.line(`${clr('WARNING!', 'yellow')} ${clr('About to uninstall Indie Web Server.', 'green')}`)

  // Check if the server is active/enabled and add a note about that to the warning box.
  if (isActive && isEnabled) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is active and enabled.', 'yellow')}`)
    warning.line('  It will be stopped and disabled.')
  } else if (isActive) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is active.', 'yellow')}`)
    warning.line('  It will be stopped.')
  } else if (isEnabled) {
    warning.emptyLine()
    warning.line(`• ${clr('The server is enabled.', 'yellow')}`)
    warning.line('  It will be disabled.')
  }

  // Check if we have provisioned TLS certificates and add a note about that to the warning box.
  if (fs.existsSync(path.join(os.homedir(), '.acme-tls'))) {
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
    // TODO
  }
}

module.exports = uninstall
