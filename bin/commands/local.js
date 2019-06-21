//////////////////////////////////////////////////////////////////////
//
// Command: local
//
// Starts web server with locally-trusted TLS certificates
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
    tcpPortUsed.check(options.port)
    .then(inUse => {
      if (inUse) {
        console.log(`\n 🤯 Error: Cannot start server. Port ${clr(options.port.toString(), 'cyan')} is already in use.\n`)
        process.exit(1)
      } else {
        //
        // Start a regular server process with locally-trusted security certificates.
        //
        site.serve({
          path: options.pathToServe,
          port: options.port,
          global: false
        })
      }
    })
  })
}

module.exports = serve
