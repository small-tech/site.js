//////////////////////////////////////////////////////////////////////
//
// Command: disable
//
// Disables the web server daemon (stops it and removes it
// from startup items).
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const ensure = require('../utilities/ensure')

function disable () {
  ensure.systemctl()
  ensure.root('disable')

  try {
    childProcess.execSync('sudo systemctl disable web-server', {env: process.env, stdio: 'pipe'})
    childProcess.execSync('sudo systemctl stop web-server', {env: process.env, stdio: 'pipe'})
    console.log('\n 🎈 Server stopped and removed from startup.\n')
  } catch (error) {
    console.error(`\n 👿 Error: Could not disable web server.\n ${error}`)
    process.exit(1)
  }
}

module.exports = disable
