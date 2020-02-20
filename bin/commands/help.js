//////////////////////////////////////////////////////////////////////
//
// Command: help
//
// Displays the help screen and exits.
//
//////////////////////////////////////////////////////////////////////

const ensure = require('../lib/ensure')

const Help = require('../lib/Help')

// Platform detection.
const systemdExists = ensure.commandExists('systemctl')
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

function help () {
  const help = new Help(systemdExists, isLinux, isWindows, isMac)

  console.log(help.text)
  process.exit()
}

module.exports = help
