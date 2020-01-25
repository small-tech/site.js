//////////////////////////////////////////////////////////////////////
//
// Command: uninstall
//
// Uninstalls Site.js after prompting for confirmation.
//
//////////////////////////////////////////////////////////////////////

const fs = require('fs-extra')
const path = require('path')

const prompts = require('prompts')
const Graceful = require('node-graceful')

const ensure = require('../lib/ensure')
const status = require('../lib/status')
const disableServer = require('../lib/disable')

const Site = require('../../index')
const clr = require('../../lib/clr')

const MessageBox = require('../../lib/MessageBox')

async function uninstall (options) {
  const isWindows = process.platform === 'win32'

  if (!isWindows) {
    ensure.systemctl()
    ensure.root('uninstall')
  }

  Site.logAppNameAndVersion()

  const { isActive: serverIsActive, isEnabled: serverIsEnabled } = status()

  const warning = new MessageBox()
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
          console.log(`\n ❌ Could not remove the Site.js binary (${error}).\n`)
          process.exit(1)
        } 
      }
    } else {
      console.log(' ℹ Site binary does not exist; ignoring.')
    }

    if (!isWindows) {
      console.log(`\n 🎉 Site.js uninstalled.`)
    }
    console.log('\n💖 Goodbye!\n')
    Graceful.exit()
  }
}

module.exports = uninstall
