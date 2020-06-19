//////////////////////////////////////////////////////////////////////
//
// Command: logs
//
// Displays the Site.js server daemon logs.
//
// Proxies: journalctl --follow --unit web-server
//
//////////////////////////////////////////////////////////////////////

const childProcess = require('child_process')
const Site = require('../../index')
const ensure = require('../lib/ensure')

function logs () {
  Site.logAppNameAndVersion()
  ensure.journalctl()
  console.log(`   📜    ❨site.js❩ Tailing logs (press Ctrl+C to exit).\n`)
  childProcess.spawn('journalctl', ['--since', 'today', '--no-pager', '--follow', '--unit', 'site.js'], {env: process.env, stdio: 'inherit'})
}

module.exports = logs
