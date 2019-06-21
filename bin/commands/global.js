//////////////////////////////////////////////////////////////////////
//
// Command: global
//
// Starts web server with globally-trusted certificates
// as a regular process.
//
//////////////////////////////////////////////////////////////////////


const site = require('../../index')
const ensure = require('../lib/ensure')
const tcpPortUsed = require('tcp-port-used')
const clr = require('../../lib/clr')

function serve (options) {
  const port = options.port
  ensure.weCanBindToPort(port, () => {
    tcpPortUsed.check(port)
    .then(inUse => {
      if (inUse) {
        console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
        process.exit(1)
      } else {
        //
        // Start a regular server process.
        //
        const server = site.serve({
          path: options.pathToServe,
          port: options.port,
          global: true
        })

        // Exit on known errors as we have already logged them to console.
        // (Otherwise, the stack trace will be output for debugging purposes.)
        server.on('site.js-address-already-in-use', () => {
          process.exit(1)
        })
      }
    })
  })
}

module.exports = serve
