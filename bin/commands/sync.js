//////////////////////////////////////////////////////////////////////
//
// Command: sync
//
// On your development machine:
//
//     Syntax: web-server sync [folder] <domain>
//
// Starts a regular web server process with locally-trusted
// security certificates and rsyncs changes to the server at
// the provided domain. Account must have ssh access to the
// server and the server must have rsync installed.
//
// On the server, to ensure that rsync is installed, run:
//
//     web-server sync
//
//////////////////////////////////////////////////////////////////////

const localServer = require('./local')

const RsyncWatcher = require('../lib/RsyncWatcher')

function sync (options) {
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

module.exports = sync
