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
    'sync': {
      'from': fromPath,
      'to': `aral@${options.syncHost}:/home/aral/site`,
      'exclude': [
        '.DS_Store',
        '.dat/*',
        '.git/*'
      ],
      'rsyncOptions': {
        'archive': null,
        'chmod': '755',
        'verbose': null,
        'human-readable': null,
        'delete': null,
        'partial': null,
        'progress': null
      },
      'error': function (error) {
        //
        // Rsync error; try to handle gracefully.
        //
        // (Errors list courtesy of https://lxadm.com/Rsync_exit_codes).
        //
        const _ = []
        _[0] = 'Success'
        _[1] = 'Syntax or usage error'
        _[2] = 'Protocol incompatibility'
        _[3] = 'Errors selecting input/output files, dirs'
        _[4] = 'Requested action not supported: an attempt was made to manipulate 64-bit files on a platform that cannot support them; or an option was specified that is supported by the client and not by the server.'
        _[5] = 'Error starting client-server protocol'
        _[6] = 'Daemon unable to append to log-file'
        _[10] = 'Error in socket I/O'
        _[11] = 'Error in file I/O'
        _[12] = 'Error in rsync protocol data stream'
        _[13] = 'Errors with program diagnostics'
        _[14] = 'Error in IPC code'
        _[20] = 'Received SIGUSR1 or SIGINT'
        _[21] = 'Some error returned by waitpid()'
        _[22] = 'Error allocating core memory buffers'
        _[23] = 'Partial transfer due to error'
        _[24] = 'Partial transfer due to vanished source files'
        _[25] = 'The --max-delete limit stopped deletions'
        _[30] = 'Timeout in data send/receive'
        _[35] = 'Timeout waiting for daemon connection'
        _[127] = 'Rsync not found; please run web-server enable --sync'
        _[255] = `Could not resolve hostname ${clr(options.syncHost, 'cyan')}`

        // Scrape the error code from the error string (not ideal but it’s all
        // we have to work with).
        const errorMatch = error.toString().match(/rsync exited with code (\d+)/)

        if (errorMatch !== null) {
          const errorCode = errorMatch[1]
          const errorMessage = _[errorCode]
          if (typeof errorMessage !== 'undefined') {
            console.log(` 🤯 [Sync] Error ${errorCode}: ${errorMessage}\n`)
            process.exit(1)
          }
        }

        console.log(` 🤯 [Sync] Unknown error: ${error}`)
        process.exit(1)
      },
      'sync': function () {
        // Sync succeeded.
        console.log(` 💞 [Sync] Local folder ${clr(fromPath, 'cyan')} synced to ${clr(options.syncHost, 'cyan')}`)
      },
      'watch': function () {
        // Watch succeeded.
        console.log(`\n 🔎 [Watch] Watching ${clr(fromPath, 'cyan')} for changes to sync to ${clr(options.syncHost, 'cyan')}…\n`)
      },
      'watchEvent': function (event, path) {
        // A watch event occurred.
        // Capitalise the first letter of the event name (verb).
        event = `${event[0].toUpperCase()}${event.slice(1)}`
        console.log(` 🔎 [Watch] ${event} ${path}`)
      },
      'watchError': function (error) {
        // A watch error occurred.
        console.log(`\n 🔎 [Watch] Error: ${error}\n`)
        process.exit(1)
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
