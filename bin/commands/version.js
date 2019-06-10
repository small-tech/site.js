//
// Command: version
//
// Display the version and exit.
//

const site = require('../../index.js')

function version () {
  console.log(site.version())
  process.exit()
}

module.exports = version
