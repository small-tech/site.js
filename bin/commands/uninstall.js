//////////////////////////////////////////////////////////////////////
//
// Command: uninstall
//
// Uninstalls Indie Web Server after prompting for confirmation.
//
//////////////////////////////////////////////////////////////////////

const prompts = require('prompts')
const Graceful = require('node-graceful')

const status = require('../lib/status')

const webServer = require('../../index')
const clr = require('../../lib/clr')

async function uninstall (options) {
  console.log(webServer.version())

  const { isActive, isEnabled } = status()

  let serverStatusMessage = ''
  if (isActive && isEnabled) {
    serverStatusMessage = `\n    ║                                               ║\n    ║ • ${clr('The server is active and enabled.', 'yellow')}           ║\n    ║   It will be stopped and disabled.            ║\n    ║                                               ║`
  } else if (isActive) {
    serverStatusMessage = '\n 🐭 The server is active.\nIt will be stopped.\n'
  } else if (isEnabled) {
    serverStatusMessage = '\n 🐭 The server is enabled.\nIt will be disabled.\n'
  }

  console.log(' 🔔 ╔═══════════════════════════════════════════════╗ ')
  console.log(`    ║ ${clr('WARNING!', 'yellow')} ${clr('About to uninstall Indie Web Server.', 'green')} ║${serverStatusMessage}`)
  console.log('    ╚═══════════════════════════════════════════════╝\n')

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
