//////////////////////////////////////////////////////////////////////
//
// Command: restart
//
// Restarts the Site.js daemon.
//
//////////////////////////////////////////////////////////////////////

const _restart = require('../lib/restart')
const ensure = require('../lib/ensure')
const Site = require('../../index')

function restart () {
  Site.logAppNameAndVersion()

  ensure.systemctl()
  ensure.root()

  try {
    // Start the web server.
    _restart()
  } catch (error) {
    process.exit(1)
  }
}

module.exports = restart
