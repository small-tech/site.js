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
  const server = webServer.serve({
    path: options.pathToServe,
    port: options.port,
    global: true
  })

  // Exit on known errors as we have already logged them to console.
  // (Otherwise, the stack trace will be output for debugging purposes.)
  server.on('indie-web-server-address-already-in-use', () => {
    process.exit(1)
  })
}

module.exports = serve
