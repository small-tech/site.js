//////////////////////////////////////////////////////////////////////
//
// Command: uninstall
//
// Uninstalls Indie Web Server after prompting for confirmation.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')
const clr = require('../../lib/clr')
const prompts = require('prompts')

const Graceful = require('node-graceful')

async function uninstall (options) {
  console.log(webServer.version())

  console.log(' 🔔 ╔═══════════════════════════════════════════════╗ ')
  console.log(`    ║ ${clr('WARNING!', 'yellow')} ${clr('About to uninstall Indie Web Server.', 'green')} ║`)
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
