//
// Command: version
//
// Display the version and exit.
//

const Site = require('../../index.js')

function version () {
  Site.logAppNameAndVersion(/* compact = */ true)
  process.exit()
}

module.exports = version
