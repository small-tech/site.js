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
  console.log(`   💫    ❨site.js❩ Syncing folder ${clr(options.from, 'cyan')} to account ${clr(options.account, 'cyan')} on host ${clr(options.host, 'cyan')}`)

  const rsyncOptions = {
    'sync': {
      'from': options.from,
      'to': options.to,
      // TODO: allow overrides of these.
      'exclude': [
        '.DS_Store',
        '.gitignore',
        '.hugo*',
        '.hugo*/*',
        '.dat/*',
        '.git/*'
      ],
      'rsyncOptions': {
        'archive': null,
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
        _[255] = `SSH error while connecting to ${clr(options.host, 'cyan')} (is this hostname/SSH certificates correct?)`

        // Scrape the error code from the error string (not ideal but it’s all
        // we have to work with).
        const errorMatch = error.toString().match(/rsync exited with code (\d+)/)

        if (errorMatch !== null) {
          const errorCode = errorMatch[1]
          const errorMessage = _[errorCode]
          if (typeof errorMessage !== 'undefined') {
            console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${errorCode} (${errorMessage})\n`)
            console.log(error)
            process.exit(1)
          }
        }

        console.log(`\n   ❌    ${clr('❨site.js❩ Unknown error:', 'red')} ${error}`)
        process.exit(1)
      },
      'sync': function () {
        // Sync succeeded.
        console.log(`   💫    ❨site.js❩ Local folder ${clr(options.from, 'cyan')} synced to ${clr(options.host, 'cyan')}`)

        if (!options.live) {
          // We've been asked to exit once we’ve successfully synced. Do so.
          console.log('\n   💕    ❨site.js❩ Goodbye!\n')
          Graceful.exit()
        }
      },
      'watch': function () {
        // Watch succeeded.
        console.log(`   🔎    ❨site.js❩ Watching ${clr(options.from, 'cyan')} for changes to sync to ${clr(options.host, 'cyan')}…`)
      },
      'watchEvent': function (event, path) {
        // A watch event occurred.
        // Capitalise the first letter of the event name (verb).
        event = `${event[0].toUpperCase()}${event.slice(1)}`
        console.log(`   🔎    ❨site.js❩ ${event} ${path}`)
      },
      'watchError': function (error) {
        // A watch error occurred.
        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${error}`)
        process.exit(1)
      }
    }
  }

  // Add Windows support if necessary.
  if (process.platform === 'win32') {
    console.log('   ✨    ❨site.js❩ Configuring sync to use our bundled rsync and ssh on Windows.')

    //
    // First off, our bundled ssh that runs under a cygwin emulation layer will choke if the ssh key
    // on Windows has Windows line endings (CRLF). So, if a key file exists using Small Web conventions
    // for this project (e.g., id-me.small-web.org if the project folder is me.small-web.org/) or for
    // popular default keys (id_rsa and id_rsa.pub), we read the key in and write it out again as Node
    // always writes Linux-style line endings (LF). The OpenSSH that ships with Windows 10 can handle
    // key files with LF line endings so this should not break anything.
    //
    // Ah, Windows...
    //
    console.log('FROM: ', rsyncOptions.from)
    process.exit()

    // const _ = rsyncOptions.rsyncOptions
    // _.
  }

  // Create the rsync watcher.
  new RsyncWatcher(rsyncOptions)

}

module.exports = sync
