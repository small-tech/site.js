//////////////////////////////////////////////////////////////////////
//
// Command: local
//
// Starts web server with locally-trusted TLS certificates
// as a regular process.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')
const tcpPortUsed = require('tcp-port-used')
const clr = require('../../lib/clr')

function serve (options) {

  tcpPortUsed.check(options.port)
  .then(inUse => {
    if (inUse) {
      console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
      process.exit(1)
    } else {
      //
      // Start a regular server process with locally-trusted security certificates.
      //
      webServer.serve({
        path: options.pathToServe,
        port: options.port,
        global: false
      })
    }
  })
}

module.exports = serve
