//////////////////////////////////////////////////////////////////////
//
// Command: local
//
// Starts web server with locally-trusted TLS certificates
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
    global: false
  })
}

module.exports = serve
