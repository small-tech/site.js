//
// Command: version
//
// Display the version and exit.
//

const Site = require('../../index.js')

function version () {
  Site.logAppNameAndVersion()
  process.exit()
}

module.exports = version
