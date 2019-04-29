//////////////////////////////////////////////////////////////////////
//
// Command: global
//
// Starts web server with globally-trusted certificates
// as a regular process.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')

function serve (options) {
  //
  // Start a regular server process.
  //
  webServer.serve({
    path: options.pathToServe,
    port: options.port,
    global: true
  })
}

module.exports = serve
