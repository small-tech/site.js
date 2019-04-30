//////////////////////////////////////////////////////////////////////
//
// Command: global
//
// Starts web server with globally-trusted certificates
// as a regular process.
//
//////////////////////////////////////////////////////////////////////

const webServer = require('../../index')
const tcpPortUsed = require('tcp-port-used')
const clr = require('../lib/cli').clr

function serve (options) {

tcpPortUsed.check(options.port)
  .then(inUse => {
    if (inUse) {
      console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
      process.exit(1)
    } else {
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
  })
}

module.exports = serve
