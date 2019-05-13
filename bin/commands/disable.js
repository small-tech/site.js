//////////////////////////////////////////////////////////////////////
//
// Command: disable
//
// Disables the web server daemon (stops it and removes it
// from startup items).
//
//////////////////////////////////////////////////////////////////////

const _disable = require('../lib/disable')

function disable () {

  try {
    // Disable and stop the web server.
    _disable()
    console.log('\n 🎈 Server stopped and removed from startup.\n')
  } catch (error) {
    process.exit(1)
  }
}

module.exports = disable
