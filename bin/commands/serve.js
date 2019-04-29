//////////////////////////////////////////////////////////////////////
//
// Command: serve
//
// Starts web server as a regular process.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')

function serve (pathToServe, port, global) {
  //
  // Start a regular server process.
  //
  webServer.serve({
    path: pathToServe,
    port,
    global
  })
}

module.exports = serve
