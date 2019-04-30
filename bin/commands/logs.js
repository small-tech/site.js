//////////////////////////////////////////////////////////////////////
//
// Command: logs
//
// Displays the web server daemon logs.
//
// Proxies: journalctl --follow --unit web-server
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const ensure = require('../lib/ensure')

function logs () {
  ensure.journalctl()
  console.log(`\n 📜 Tailing logs (press Ctrl+C to exit).\n`)
  childProcess.spawn('journalctl', ['--follow', '--unit', 'web-server'], {env: process.env, stdio: 'inherit'})
}

module.exports = logs
