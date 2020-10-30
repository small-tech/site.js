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

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const childProcess = require('child_process')
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
        '.hugo*',   // Exclude Hugo source directories…
        '.hugo*/*', // …and their contents.
        '.dat',     // Exclude Dat directory…
        '.dat/*',   // …and its contents.
        '.git',     // Exclude Git directory…
        '.git/*'    // …and its contents
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
        _[255] = `SSH error while connecting to ${clr(options.host, 'cyan')} – is this hostname/SSH certificates correct?`

        // Scrape the error code from the error string (not ideal but it’s all
        // we have to work with).
        const errorMatch = error.toString().match(/rsync exited with code (\d+)/)

        if (errorMatch !== null) {
          const errorCode = errorMatch[1]
          const errorMessage = _[errorCode]
          if (typeof errorMessage !== 'undefined') {
            console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${errorCode} (${errorMessage})\n`)
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

  // The default is to exclude databases from syncs.
  if (!options.includeDatabase) {
    rsyncOptions.sync.exclude.push('.db')
    rsyncOptions.sync.exclude.push('.db/*')
  } else {
    console.log('   💫    ❨site.js❩ Sync will include the database as requested.')
  }

  const sshDirectory = path.join(os.homedir(), '.ssh')
  const folderToSyncPathSegments = path.resolve(rsyncOptions.sync.from).split(path.sep)
  const folderToSyncName = folderToSyncPathSegments[folderToSyncPathSegments.length - 1]

  const keyNameBasedOnFolderName = `id_${folderToSyncName}_ed25519`
  const ed25519KeyBasedOnFolderName = path.join(sshDirectory, keyNameBasedOnFolderName)

  if (fs.existsSync(ed25519KeyBasedOnFolderName)) {
    // A key for this project exists based on naming convention. Specify the key directly.
    // We don't need to rewrite the key with Linux line endings since this is our convention and so
    // we expect that the key was written out from Node with the correct line endings to begin with.
    console.log(`   🔑    ❨site.js❩ Using site-specific SSH key: ${ed25519KeyBasedOnFolderName}`)
    rsyncOptions.sync.rsyncOptions.rsh = `ssh -i ${ed25519KeyBasedOnFolderName} -o ConnectTimeout=5`
  } else {
    rsyncOptions.sync.rsyncOptions.rsh = `ssh -o ConnectTimeout=5`
  }

  // Add Windows support if necessary.
  if (process.platform === 'win32') {
    console.log('   💫    ❨site.js❩ Configuring sync to use bundled rsync and ssh on Windows.')

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
    const ed25519Key = path.join(sshDirectory, 'id_rsa')
    const rsaKey = path.join(sshDirectory, 'id_ed25519')

    // Resolve the from path so it is correctly handled under Windows.
    rsyncOptions.sync.from = path.resolve(rsyncOptions.sync.from)

    // Add back the final slashes removed by path.resolve so that the directory's contents
    // are synced not the directory itself.
    if (!rsyncOptions.sync.from.endsWith('\\\\')) {
      rsyncOptions.sync.from = `${rsyncOptions.sync.from}\\\\`
    }

    // Configure the rsync library to use our bundled rsync executable instead of the system one.
    const externalRsyncBundleDirectory = path.join(os.homedir(), '.small-tech.org', 'site.js', 'portable-rsync-with-ssh-for-windows')
    const externalRsyncBundleBinDirectory = path.join(externalRsyncBundleDirectory, 'bin')
    const rsyncExecutable = path.join(externalRsyncBundleBinDirectory, 'rsync.exe')
    const sshExecutable = path.join(externalRsyncBundleBinDirectory, 'ssh.exe')
    rsyncOptions.sync.config = { executable: rsyncExecutable }

    //
    // Handle SSH keys.
    //

    if (fs.existsSync(ed25519KeyBasedOnFolderName)) {
      // A key for this project exists based on naming convention. Specify the key directly.
      // We don't need to rewrite the key with Linux line endings since this is our convention and so
      // we expect that the key was written out from Node with the correct line endings to begin with.
      console.log('   🔑    ❨site.js❩ Updating configuration of site-specific SSH key for Windows.')
      rsyncOptions.sync.rsyncOptions.rsh = `${sshExecutable} -i ${ed25519KeyBasedOnFolderName}`
    } else {
      console.log('   🔑    ❨site.js❩ No specific ssh key for this project found.')

      function recreateKeysWithLinuxLineEndings (keyToUpdate) {
        function recreateKey (keyToUpdate) {
          console.log(`   🔑    ❨site.js❩ Recreating SSH keys with Linux line endings (${keyToUpdate}).`)
          try {
            const fileBuffer = fs.readFileSync(keyToUpdate, 'binary')
            fs.writeFileSync(keyToUpdate, fileBuffer, {encoding: 'binary', mode: 0o600})
          } catch (error) {
            throw new Error(`   ❌    ❨site.js❩ Panic: Could not update SSH key ${keyToUpdate} to Linux line endings: ${error.message}`)
          }
        }
        recreateKey(keyToUpdate)            // Recreate the private key using Linux line endings.
        recreateKey(`${keyToUpdate}.pub`)   // Recreate the public key using Linux line endings.
      }

      // Make sure generic keys have Linux line endings (see longer note, above).
      const ed25519KeyExists = fs.existsSync(ed25519Key)
      const rsaKeyExists = fs.existsSync(rsaKey)

      if (!ed25519KeyExists && !rsaKeyExists) {
        // Note: this does not take into consideration the more esoteric SSH keys but that should be an edge case.
        throw new Error(`   ❌    ❨site.js❩ Panic: Could not find a site-specific SSH key, ~/.ssh/id_ed25519, or ~/.ssh/id_rsa. Cannot srsync over SSH.`)
      }

      if (ed25519KeyExists) { recreateKeysWithLinuxLineEndings(ed25519Key) }
      if (rsaKeyExists) { recreateKeysWithLinuxLineEndings(rsaKey) }

      // Configure the bundled rsync to use the bundled ssh with the generic keys on the system.
      // Note: ./ refers to the same directory that rsync.exe was run from.
      rsyncOptions.sync.rsyncOptions.rsh = sshExecutable
    }
  }

  rsyncOptions.sync.isPull = options.isPull

  // Create the rsync watcher.
  const rsyncWatcher = new RsyncWatcher(rsyncOptions)

  // If the database is being synced to a deployment machine, also issue an ssh command to
  // restart the server on the remote machine so that the database has immediate effect.
  if (!options.isPull && options.includeDatabase) {
    rsyncWatcher.addListener('rsync-complete', () => {
      console.log('   💫    ❨site.js❩ Requesting restart of remote server for database changes to take immediate effect…')
      const sshBinary = rsyncOptions.sync.rsyncOptions.rsh
      const sshHost = options.to.split(':')[0]
      const sshCommand = `${sshBinary} ${sshHost} "site restart"`

      try {
        childProcess.execSync(sshCommand)
        console.log('   💫    ❨site.js❩ Remote server restarted.')
      } catch (error) {
        console.log(`\n   ⚠    ${clr('❨site.js❩ Warning:', 'yellow')} Could not restart remote server!`, error)
      }
    })
  }
}

module.exports = sync
