//
// Command: version
//
// Display the version and exit.
//

const webServer = require('../../index.js')

function version () {
  console.log(webServer.version())
  process.exit()
}

module.exports = version
