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
const clr = require('../lib/cli').clr

function sync (options) {
  //
  // Start rsync watcher.
  //
  options.pathToServe = (options.syncFolder === null) ? '.' : options.syncFolder

  console.log(` 💞 [Sync] Will sync folder ${clr(options.syncFolder, 'cyan')} to host ${clr(options.syncHost, 'cyan')}`)

  let fromPath = options.syncFolder
  if (!fromPath.endsWith('/')) {fromPath = `${fromPath}/`}

  // TODO: Remove: Hardcoded config.
  const rsyncOptions = {
    "live.ar.al": {
      "from": fromPath,
      "to": `aral@${options.syncHost}:/home/aral/site`,
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
      },
      "error": function (error) {
        //
        // Rsync error; try to handle gracefully.
        //
        // Supported errors:
        //
        // 255: Proxied SSH error (“Could not resolve hostname”)
        //
        if (error.toString().match('rsync exited with code 255')) {
          console.log(` 🤯 Sync error: could not resolve hostname ${clr(options.syncHost, 'cyan')}\n`)
          process.exit(1)
        }
      },
      "sync": function () {
        // Sync succeeded.
        console.log(` 💞 [Sync] Local folder ${clr(fromPath, 'cyan')} synced to ${clr(options.syncHost, 'cyan')}`)
      },
      "watch": function () {
        // Watch succeeded.
        console.log(`\n 🔎 Watching ${fromPath} for changes to sync to ${options.syncHost}\n`)
      },
      "watchEvent": function (event, path) {
        // A watch event occured.
        console.log(` 🔎 Sync ${event} ${path}`)
      }
    }
  }

  // Debug
  // console.log('rsyncOptions', rsyncOptions)

  // Create the rsync watcher.
  new RsyncWatcher(rsyncOptions)

  // Launch local server.
  localServer(options)
}

module.exports = sync
