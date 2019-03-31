//
// To be run as a daemon by the pm2 process manager when
// web-server is called with the --live option.
//
// Expects the path to serve as the only command-line argument.
//

const args = process.argv.slice(2)

if (args.length !== 1) {
  console.log('\n  💕😈💕 Indie Web Server Daemon\n\n  Please use via web-server --live instead.\n')
  process.exit(1)
}

const pathToServe = args[0]

// Run the web server.
const webServer = require('../index.js')
webServer.serve({
  path: pathToServe,
  global: true
})
