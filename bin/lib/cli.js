////////////////////////////////////////////////////////////////////////////////
//
// The command-line interface.
//
////////////////////////////////////////////////////////////////////////////////

const fs = require('fs')
const path = require('path')

const minimist = require('minimist')

const clr = require('../../lib/clr')

class CommandLineInterface {

  // Initialise the command-line interface.
  initialise () {
    const options = minimist(process.argv.slice(2), {boolean: true})
    const positionalArguments = options._
    const arg0 = positionalArguments[0]

    // Note: for the version and help commands, we also accept the -v and --version forms as
    // ===== these are frequently used, even though version and help are commands and not options.
    //       We do not accept this form for any other command, however.
    const commands = [
      ['version', options.version === true || options.v === true || arg0 === 'version'],
      ['uninstall', arg0 === 'uninstall'],
      ['help', options.h === true || options.help === true || arg0 === 'help'],
      ['serve', arg0 === 'serve'],
      ['enable', arg0 === 'enable'],
      ['disable', arg0 === 'disable'],
      ['logs', arg0 === 'logs'],
      ['status', arg0 === 'status'],
    ]

    const command = commands.find(i => i[1])
    const commandExplicitlySupplied = command !== undefined

    // Set the command name and normalise the positional arguments.
    let commandName
    let commandPositionalArguments

    if (commandExplicitlySupplied) {
      commandName = command[0]
      // Remove the command name itself from the list of positional arguments.
      commandPositionalArguments = positionalArguments.slice(1)
    } else {
      // No explicit command supplied; default to 'serve'
      commandName = 'serve'
      commandPositionalArguments = positionalArguments
    }
    // Remove the positional arguments from the command line options object and
    // save the remaining named arguments.
    delete options._
    const commandNamedArguments = options

    const commandPath = `../commands/${commandName}`

    require(commandPath)({
      positional: commandPositionalArguments,
      named: commandNamedArguments
    })
  }

//   throwError(errorMessage) {
//     console.log(`\n 🤯 ${errorMessage}\n`)
//     throw new Error(errorMessage)
//   }





//   // Display a syntax error.
//   syntaxError(message = null) {
//     const additionalMessage = message === null ? '' : ` (${message})`
//     this.throwError(`Syntax error${additionalMessage}`)
//   }




//   // Return the proxy urls (http and ws) for a given host string.
//   proxyUrls (host) {
//     const proxyOptions = {}
//     proxyOptions.proxyHttpURL = host

//     if (proxyOptions.proxyHttpURL.startsWith('https://')) {
//       // Cannot proxy HTTPS.
//       this.throwError('Error: cannot proxy HTTPS.')
//     }

//     if (!proxyOptions.proxyHttpURL.startsWith('http://')) {
//       proxyOptions.proxyHttpURL = `http://${proxyOptions.proxyHttpURL}`
//     }

//     proxyOptions.proxyWebSocketURL = proxyOptions.proxyHttpURL.replace('http://', 'ws://')

//     return proxyOptions
//   }


//   // If the command is enable, populate its options.
//   enableOptions (command) {
//     let enableOptions = { enableSync: null }

//     if (command.isEnable) {
//       if (command.namedArguments.sync === true) {
//         enableOptions.enableSync = true
//       }
//     }

//     return enableOptions
//   }


//   // If the server type is proxy, return a proxy options object (and exit with an error if one is not provided).
//   proxyOptions (command) {
//     let proxyOptions = {proxyHttpURL: null, proxyWebSocketURL: null}

//     if (command.isProxy) {
//       if (command.positionalArguments.length < 1) {
//         // A proxy path must be included.
//         this.throwError('Error: you must supply a URL to proxy. e.g., site proxy http://localhost:1313')
//       }
//       if (command.positionalArguments.length > 1) {
//         // Syntax error.
//         this.syntaxError('Error: cannot have more than one positional argument in a proxy command.')
//       }
//       proxyOptions = this.proxyUrls(command.positionalArguments[0])
//     }

//     return proxyOptions
//   }


//   // Return a sync options object given a command.
//   syncOptions (command) {
//     //
//     // Syntax:
//     //
//     //  1. site sync --host=<host> [--folder=<folder>] [--account=<account>] [--proxy=<proxy-host>]
//     //  2. site sync <host>
//     //  3. site sync <folder> --host=<host>
//     //  4. site sync <folder> <host>
//     //  5. site sync --to=<account>@<host>:/home/<account>/<folder> [--proxy=<proxy-host>]
//     //  6. site sync <folder> --to=<account>@<host>:/home/<account>/<folder> [--proxy=<proxy-host>]
//     //
//     // Key: […] = optional, <…> = value placeholder.
//     //

//     const syncOptionsDerivedFromPositionalArguments = { syncLocalFolder: null, syncRemoteHost: null }

//     const syncOptions = { syncRemoteConnectionString: null, syncLocalFolder: null, syncStartProxyServer: null, syncRemoteHost: null, syncExitOnSync: null }

//     if (command.isSync) {

//       // Adds remote server --<option>s, if any, to the syncOptions object.
//       const addNamedArguments = () => {
//         function namedArgumentExists(namedArgument) {
//           return typeof command.namedArguments[namedArgument] === 'string'
//         }
// ''
//         // Check for conflicts between positional arguments and named arguments
//         // and fail if there are any.
//         if (namedArgumentExists('to')) {
//           if (syncOptionsDerivedFromPositionalArguments.syncRemoteHost !== null) {
//             // Conflict: remote host specified as both a positional argument and within the --to option.
//             this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('to', 'cyan')} option or provide the remote host as a positional argument, but not both.`)
//           } else if (namedArgumentExists('account') || namedArgumentExists('host') || namedArgumentExists('folder')) {
//             // Conflict: --to option used alongside the --account, --host, or --folder arguments.
//             this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('to', 'cyan')} option or use ${clr('account', 'cyan')}/${clr('host', 'cyan')}/${clr('folder', 'cyan')} options but not both.`)
//           } else {
//             // Check that the passed string has correct syntax.
//             const remoteConnectionStringSyntaxMatch = command.namedArguments.to.match(/(.*?)@(.*?):(.*?)$/)
//             if (remoteConnectionStringSyntaxMatch === null) {
//               this.syntaxError(`could not parse rsync connection string in ${clr('--to', 'yellow')} option (${clr(command.namedArguments.to, 'cyan')}). It should be in the form ${clr('account@host:/path/to/folder', 'cyan')}`)
//             }

//             // Helper: redundant but useful so we don’t have to parse the remote connection string again.
//             syncOptions.syncRemoteHost = remoteConnectionStringSyntaxMatch[2]

//             // No conflicts or syntax issues: set the remote connection string to the one provided.
//             syncOptions.syncRemoteConnectionString = command.namedArguments.to
//           }
//         } else {
//           // Construct the remote connection string.
//           if (syncOptionsDerivedFromPositionalArguments.syncRemoteHost !== null && namedArgumentExists('host')) {
//             this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('host', 'cyan')} option or provide the remote host as a positional argument, but not both.`)
//           }

//           if (syncOptionsDerivedFromPositionalArguments.syncRemoteHost === null && !namedArgumentExists('host')) {
//             // This should not happen.
//             this.syntaxError(`remote ${clr('host', 'cyan')} not provided either using the ${clr('--host', 'yellow')} option or via a positional argument.`)
//           }

//           // The account to use is either what is set explicitly using the --account option
//           // or defaults to the same account as the person has on their local machine.
//           const _account = namedArgumentExists('account') ? command.namedArguments.account : process.env.USER
//           const _host = namedArgumentExists('host') ? command.namedArguments.host : syncOptionsDerivedFromPositionalArguments.syncRemoteHost

//           // Helper: redundant but useful so we don’t have to parse the remote connection string again.
//           syncOptions.syncRemoteHost = _host

//           // We expect the remote folder to be at /home/<account>/<folder> where <folder> either defaults
//           // to the name of the current folder on the local machine or is overridden using the --folder option.
//           // If you want to specify any arbitrary folder on the remote machine, provide the full rsync
//           // connection string using the --to option.
//           const remoteFolderPrefix = `/home/${_account}`
//           const localFolderPath = path.resolve(syncOptionsDerivedFromPositionalArguments.syncLocalFolder)
//           const localFolderFragments = localFolderPath.split(path.sep)
//           const currentLocalFolderName = localFolderFragments[localFolderFragments.length-1]

//           const _folder = namedArgumentExists('folder') ? `${remoteFolderPrefix}/${command.namedArguments.folder}` : `${remoteFolderPrefix}/${currentLocalFolderName}`

//           syncOptions.syncRemoteConnectionString = `${_account}@${_host}:${_folder}`
//         }

//         // Add the local folder to sync. This should have been set before we reach this point.
//         // Sanity check:
//         if (syncOptionsDerivedFromPositionalArguments.syncLocalFolder === null) {
//           throw new Error('Sanity check failed: syncOptionsDerivedFromPositionalArguments.syncLocalFolder should not be null.')
//         }
//         syncOptions.syncLocalFolder = syncOptionsDerivedFromPositionalArguments.syncLocalFolder

//         // Ensure that the local folder exists.
//         if (!fs.existsSync(syncOptions.syncLocalFolder)) {
//           this.throwError(`Error: Folder not found (${clr(syncOptions.syncFolder, 'cyan')}).\n\n    Syntax: site ${clr('sync', 'green')} ${clr('folder', 'cyan')} ${clr('domain', 'yellow')}\n    Command: site ${clr('sync', 'green')} ${clr(syncOptions.syncFolder, 'cyan')} ${clr(syncOptions.syncDomain, 'yellow')}`)
//         }

//         //
//         // Add any remaining sync options that have been provided.
//         //

//         // Handle the sync-folder-and-contents flag or its lack
//         if (command.namedArguments['sync-folder-and-contents'] === true) {
//           // We should sync both the folder itself and its contents. We signal this to rsync
//           // by ensuring that the name of the folder *does not* end in a trailing slash.
//           if (syncOptions.syncLocalFolder.endsWith(path.sep)) {
//             syncOptions.syncLocalFolder = syncOptions.syncLocalFolder.substr(0, syncOptions.syncLocalFolder.length - 1)
//           }
//         } else {
//           // Default: we sync only the contents of the local folder, not the folder itself. To
//           // ======== specify this to rsync, we ensure that the local folder path ends with a slash.
//           if (!syncOptions.syncLocalFolder.endsWith(path.sep)) {
//             syncOptions.syncLocalFolder = `${syncOptions.syncLocalFolder}${path.sep}`
//           }
//         }

//         // Sync on exit flag.
//         syncOptions.syncExitOnSync = command.namedArguments['exit-on-sync'] === true

//         // Proxy.
//         if (namedArgumentExists('proxy')) {
//           syncOptions.syncStartProxyServer = true
//           const proxyOptions = this.proxyUrls(command.namedArguments.proxy)
//           Object.assign(syncOptions, proxyOptions)
//         }

//         // Debug. (That’s it, this is the syncOptions object we’ll be returning).
//         // console.log('syncOptions', syncOptions)
//       }

//       if (command.positionalArguments.length === 0) {
//         //
//         // No positional arguments. Must at least specify either:
//         //
//         //  Syntax 1. host as a named argument (--host), or
//         //  Syntax 5. the full rsync connection string using the --to named argument.
//         //
//         // Note: If the --to option is specified, it will override the host, folder,
//         // ===== and account arguments (whether named or positional).
//         //
//         if (typeof command.namedArguments.to === 'string') {
//           //
//           // Syntax 5.
//           //
//           syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
//         } else if (typeof command.namedArguments.host === 'string') {
//           //
//           // Syntax 1.
//           //
//           syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
//         } else if (typeof command.namedArguments.to === 'string') {
//           //
//           // Syntax error.
//           //
//           this.syntaxError(`must specify either ${clr('host', 'cyan')} to sync to or provide full rsync connection string using ${clr('to', 'cyan')} option`)
//         }
//       } else if (command.positionalArguments.length === 1) {
//         //
//         // One argument is provided, if:
//         //
//         // Syntax 2: it is the local folder if --host is set.
//         // Syntax 6: it is the local folder if --to is set.
//         // Syntax 3: it is the host if --host is not set. The folder to sync is the current folder.
//         //
//         if (typeof command.namedArguments.host === 'string') {
//           //
//           // Syntax 2.
//           //
//           syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
//         } else if (typeof command.namedArguments.to === 'string') {
//           //
//           // Syntax 6.
//           //
//           syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
//         } else {
//           //
//           // Syntax 3.
//           //
//           syncOptionsDerivedFromPositionalArguments.syncRemoteHost = command.positionalArguments[0]
//           syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
//         }
//       } else if (command.positionalArguments.length === 2) {
//         //
//         // Syntax 4: Two arguments provided. We interpret the first as the path of the
//         // folder to serve and the second as the host.
//         //
//         syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
//         syncOptionsDerivedFromPositionalArguments.syncRemoteHost = command.positionalArguments[1]
//       } else {
//         //
//         // Syntax error: we can have at most two positional arguments.
//         //
//         this.syntaxError('too many arguments')
//       }

//       // Add any named arguments (--<option>) that may exist to the syncOptions object.
//       addNamedArguments()
//     }

//     return syncOptions
//   }
}

module.exports = new CommandLineInterface()
