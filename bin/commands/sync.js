//////////////////////////////////////////////////////////////////////
//
// Command: sync
//
// Client: starts a regular web server process with locally-trusted
// ======= security certificates and rsyncs changes to the server at
//         the provided domain. Account must have ssh access to the
//         server and the server must have been set up with the
//         rsync daemon (sync on the server does this for you).
//
//         Syntax: web-server sync [domain] [folder]
//
// Server: enables the web server startup daemon and also starts up
// ======= the rsync service. Requires systemd.
//
//         Syntax: web-server sync [folder] [--port=N]
//
//////////////////////////////////////////////////////////////////////

function sync (options) {
  console.log('Sync: unimplemented')
  console.log(options)
}

module.exports = sync
