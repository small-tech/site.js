//////////////////////////////////////////////////////////////////////
//
// Command: stop
//
// Stops the Site.js daemon.
//
//////////////////////////////////////////////////////////////////////

const _stop = require('../lib/stop')
const ensure = require('../lib/ensure')
const Site = require('../../index')

function stop () {
  ensure.systemctl()
  ensure.root('stop')

  Site.logAppNameAndVersion(/* compact = */ true)

  try {
    // Stop the web server.
    _stop()
  } catch (error) {
    process.exit(1)
  }
}

module.exports = stop
