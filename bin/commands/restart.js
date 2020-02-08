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
  ensure.systemctl()
  ensure.root('restart')

  Site.logAppNameAndVersion(/* compact = */ true)

  try {
    // Start the web server.
    _restart()
  } catch (error) {
    process.exit(1)
  }
}

module.exports = restart
