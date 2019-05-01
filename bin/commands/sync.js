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

const localServer = require('./local')
const daemon = require('./enable')

const RsyncWatcher = require('../lib/RsyncWatcher')

function sync (options) {
  if (options.syncIsServer) {
    //
    // Sync server.
    //
    console.log('Sync: is server. [UNIMPLEMENTED]')
  } else {
    //
    // Sync client.
    //

    //
    // Start rsync watcher.
    //
    options.pathToServe = (options.syncFolder === null) ? '.' : options.syncFolder
    console.log(`Starting rsync watcher. Folder: ${options.pathToServe} ←→ domain: ${options.syncDomain} [TODO]`)

    let fromPath = options.pathToServe
    if (!fromPath.endsWith('/')) {fromPath = `${fromPath}/`}

    console.log('fromPath', fromPath)

    // TODO: Remove: Hardcoded config.
    const rsyncOptions = {
      "live.ar.al": {
        "from": fromPath,
        "to": "aral@my-demo.site:/home/aral/site",
        "exclude": [
          ".DS_Store",
          ".dat/*",
          ".git/*"
        ],
        "rsyncOptions": {
          "archive": null,
          "chmod": "755",
          "verbose": null,
          "human-readable": null,
          "delete": null,
          "partial": null,
          "progress": null
        }
      }
    }

    // Create the rsync watcher.
    new RsyncWatcher(rsyncOptions)

    // Launch local server.
    localServer(options)
  }
}

module.exports = sync
