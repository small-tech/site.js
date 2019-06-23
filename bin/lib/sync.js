//////////////////////////////////////////////////////////////////////
//
// sync
//
// Uses rsync to sync changes to a remote server at
// the provided domain. Account must have ssh access to the
// server and the server must have rsync installed.
//
// On the remote server, to ensure that rsync is installed, run:
//
// site --ensure-can-sync
//
//////////////////////////////////////////////////////////////////////

const Graceful = require('node-graceful')

const RsyncWatcher = require('./RsyncWatcher')
const ensure = require('./ensure')
const clr = require('../../lib/clr')

function sync (options) {
  // Check for prerequisites (sync functionality requires rsync to be installed.)
  ensure.rsyncExists()

  //
  // Start rsync watcher.
  //
  console.log(`\n 💞 [Sync] Will sync folder ${clr(options.from, 'cyan')} to host ${clr(options.syncRemoteHost, 'cyan')}`)

  const rsyncOptions = {
    'sync': {
      'from': options.syncLocalFolder,
      'to': `${options.syncRemoteConnectionString}`,
      // TODO: allow overrides of these.
      'exclude': [
        '.DS_Store',
        '.gitignore',
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
        _[127] = 'Rsync not found; please run site enable --sync'
        _[255] = `SSH error while connecting to ${clr(options.syncRemoteHost, 'cyan')} (is this hostname/SSH certificates correct?)`

        // Scrape the error code from the error string (not ideal but it’s all
        // we have to work with).
        const errorMatch = error.toString().match(/rsync exited with code (\d+)/)

        if (errorMatch !== null) {
          const errorCode = errorMatch[1]
          const errorMessage = _[errorCode]
          if (typeof errorMessage !== 'undefined') {
            console.log(` 🤯 [Sync] Error ${errorCode}: ${errorMessage}\n`)
            console.log(error)
            process.exit(1)
          }
        }

        console.log(` 🤯 [Sync] Unknown error: ${error}`)
        process.exit(1)
      },
      'sync': function () {
        // Sync succeeded.
        console.log(` 💞 [Sync] Local folder ${clr(options.syncLocalFolder, 'cyan')} synced to ${clr(options.syncRemoteHost, 'cyan')}`)

        if (options.syncExitOnSync) {
          // We've been asked to exit once we’ve successfully synced. Do so.
          console.log('\n 👋 Exit on sync requested, exiting…')
          Graceful.exit()
        }
      },
      'watch': function () {
        // Watch succeeded.
        console.log(`\n 🔎 [Watch] Watching ${clr(options.syncLocalFolder, 'cyan')} for changes to sync to ${clr(options.syncRemoteHost, 'cyan')}…\n`)
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

  // Create the rsync watcher.
  new RsyncWatcher(rsyncOptions)

  if (options.syncStartProxyServer === true) {
    //
    // Start a proxy server.
    //
    proxyServer(options)
  } else {
    //
    // Start a regular local server.
    //

    // Set the path to serve for the local server.
    options.pathToServe = options.syncLocalFolder

    // Launch local server.
    localServer(options)
  }
}

module.exports = sync

/////
/////

// Check that the passed string has correct syntax.
const remoteConnectionStringSyntaxMatch = command.namedArguments.to.match(/(.*?)@(.*?):(.*?)$/)
if (remoteConnectionStringSyntaxMatch === null) {
  this.syntaxError(`could not parse rsync connection string in ${clr('--to', 'yellow')} option (${clr(command.namedArguments.to, 'cyan')}). It should be in the form ${clr('account@host:/path/to/folder', 'cyan')}`)
}

// Helper: redundant but useful so we don’t have to parse the remote connection string again.
syncOptions.syncRemoteHost = remoteConnectionStringSyntaxMatch[2]

// No conflicts or syntax issues: set the remote connection string to the one provided.
syncOptions.syncRemoteConnectionString = command.namedArguments.to

////


// The account to use is either what is set explicitly using the --account option
// or defaults to the same account as the person has on their local machine.
const _account = namedArgumentExists('account') ? command.namedArguments.account : process.env.USER
const _host = namedArgumentExists('host') ? command.namedArguments.host : syncOptionsDerivedFromPositionalArguments.syncRemoteHost

// Helper: redundant but useful so we don’t have to parse the remote connection string again.
syncOptions.syncRemoteHost = _host

// We expect the remote folder to be at /home/<account>/<folder> where <folder> either defaults
// to the name of the current folder on the local machine or is overridden using the --folder option.
// If you want to specify any arbitrary folder on the remote machine, provide the full rsync
// connection string using the --to option.
const remoteFolderPrefix = `/home/${_account}`
const localFolderPath = path.resolve(syncOptionsDerivedFromPositionalArguments.syncLocalFolder)
const localFolderFragments = localFolderPath.split(path.sep)
const currentLocalFolderName = localFolderFragments[localFolderFragments.length-1]

const _folder = namedArgumentExists('folder') ? `${remoteFolderPrefix}/${command.namedArguments.folder}` : `${remoteFolderPrefix}/${currentLocalFolderName}`

syncOptions.syncRemoteConnectionString = `${_account}@${_host}:${_folder}`

///

// Ensure that the local folder exists.
if (!fs.existsSync(syncOptions.syncLocalFolder)) {
  this.throwError(`Error: Folder not found (${clr(syncOptions.syncFolder, 'cyan')}).\n\n    Syntax: site ${clr('sync', 'green')} ${clr('folder', 'cyan')} ${clr('domain', 'yellow')}\n    Command: site ${clr('sync', 'green')} ${clr(syncOptions.syncFolder, 'cyan')} ${clr(syncOptions.syncDomain, 'yellow')}`)
}

////

//
// Add any remaining sync options that have been provided.
//

// Handle the sync-folder-and-contents flag or its lack
if (command.namedArguments['sync-folder-and-contents'] === true) {
  // We should sync both the folder itself and its contents. We signal this to rsync
  // by ensuring that the name of the folder *does not* end in a trailing slash.
  if (syncOptions.syncLocalFolder.endsWith(path.sep)) {
    syncOptions.syncLocalFolder = syncOptions.syncLocalFolder.substr(0, syncOptions.syncLocalFolder.length - 1)
  }
} else {
  // Default: we sync only the contents of the local folder, not the folder itself. To
  // ======== specify this to rsync, we ensure that the local folder path ends with a slash.
  if (!syncOptions.syncLocalFolder.endsWith(path.sep)) {
    syncOptions.syncLocalFolder = `${syncOptions.syncLocalFolder}${path.sep}`
  }
}

    // Sync on exit flag.
    syncOptions.syncExitOnSync = command.namedArguments['exit-on-sync'] === true


    // Debug. (That’s it, this is the syncOptions object we’ll be returning).
    // console.log('syncOptions', syncOptions)
