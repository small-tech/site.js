////////////////////////////////////////////////////////////////////////////////
//
// The command-line interface.
//
////////////////////////////////////////////////////////////////////////////////

const fs = require('fs')
const path = require('path')

const clr = require('../../lib/clr')

class CommandLineInterface {

  // Initialise the command-line interface.
  initialise () {
    const commandLineOptions = require('minimist')(process.argv.slice(2), {boolean: true})
    const command = this.command(commandLineOptions)
    this.execute(command)
  }


  // Return the command given a command-line options object.
  command (commandLineOptions) {
    const positionalArguments = commandLineOptions._
    const positionalCommand = positionalArguments[0]

    const command = {
      isHelp: (commandLineOptions.h || commandLineOptions.help || positionalCommand === 'help'),
      isVersion: (commandLineOptions.version || commandLineOptions.v || positionalCommand === 'version'),
      isGlobal: (commandLineOptions.global || positionalCommand === 'global'),
      isProxy: (commandLineOptions.proxy || positionalCommand === 'proxy'),
      isSync: (commandLineOptions.sync || positionalCommand === 'sync'),
      isEnable: (commandLineOptions.enable || positionalCommand === 'enable'),
      isDisable: (commandLineOptions.disable || positionalCommand === 'disable'),
      isLogs: (commandLineOptions.logs || positionalCommand === 'logs'),
      isStatus: (commandLineOptions.status || positionalCommand === 'status'),
    //isLocal: is handled below.
    }

    // If we didn’t match a command, we default to local.
    const didMatchCommand = Object.values(command).reduce((p,n) => p || n)
    command.isLocal = (commandLineOptions.local || positionalCommand === 'local' || !didMatchCommand)

    const positionalCommandDidMatchCommand = ['version', 'help', 'local', 'global', 'proxy', 'sync', 'enable', 'disable', 'logs', 'status'].reduce((p, n) => p || (positionalCommand === n), false)

    // Save the commands arguments.
    command.positionalArguments = positionalCommandDidMatchCommand ? commandLineOptions._.slice(1) : commandLineOptions._

    // Remove the positional arguments from the command line options object and
    // save the remaining named arguments.
    delete commandLineOptions._
    command.namedArguments = commandLineOptions

    return command
  }


  // Execute the requested command.
  execute (command) {
    let requirement = null
    Object.entries(command).some(theCommand => {
      if (theCommand[1] === true) {
        const commandName = theCommand[0].slice(2).toLowerCase()
        requirement = `../commands/${commandName}`
        return true
      }
    })

    const options = this.options(command)

    if (requirement === null) {
      // No commands matched; display help.
      require ('../commands/help')
    } else {
      // Load and run the command.
      require(requirement)(options)
    }
  }


  // Return an options object given a command.
  options (command) {
    const options = {
      pathToServe: this.pathToServe(command),
      port: this.port(command)
    }
    Object.assign(options, this.proxyOptions(command))
    Object.assign(options, this.syncOptions(command))

    return options
  }


  // Display a syntax error.
  syntaxError(message = null) {
    const additionalMessage = message === null ? '' : ` (${message})`
    console.log(`\n 🤯 Syntax error${additionalMessage}. Displaying help…`)
    require('../commands/help')()
  }


  // Return the path to serve (for server commands) or exit the app if it doesn’t exist.
  pathToServe (command) {
    const isServerCommand = command.isLocal || command.isGlobal || command.isEnable

    // Only relevant for server commands.
    if (!isServerCommand) {
      return null
    }

    if (command.positionalArguments.length > 1) {
      // Syntax error.
      this.syntaxError()
    }

    // If no path is passed, we serve the current folder.
    // If there is a path, we’ll serve that.
    let pathToServe = '.'

    if (command.positionalArguments.length === 1) {
      // e.g., web-server enable path-to-serve OR web-server --enable path-to-serve
      pathToServe = command.positionalArguments[0]
    }

    // Ensure the path actually exists.
    if (!fs.existsSync(pathToServe)) {
      console.error(`\n 🤔 Error: could not find path ${pathToServe}\n`)
      process.exit(1)
    }

    return pathToServe
  }


  // Return the requested port given a command or exit the app if it is invalid.
  port (command) {
    // If a port is specified, use it. Otherwise use the default port (443).
    let port = 443
    if (command.namedArguments.port !== undefined) {
      port = parseInt(command.namedArguments.port)
    }

    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (port < 0 || port > 49151) {
      console.error('\n 🤯 Error: specified port must be between 0 and 49,151 inclusive.\n')
      process.exit(1)
    }

    return port
  }


  // Return the proxy urls (http and ws) for a given host string.
  proxyUrls (host) {
    const proxyOptions = {}
    proxyOptions.proxyHttpURL = host

    if (proxyOptions.proxyHttpURL.startsWith('https://')) {
      // Cannot proxy HTTPS.
      console.log('\n 🤯 Error: cannot proxy HTTPS.\n')
      process.exit(1)
    }

    if (!proxyOptions.proxyHttpURL.startsWith('http://')) {
      proxyOptions.proxyHttpURL = `http://${proxyOptions.proxyHttpURL}`
    }

    proxyOptions.proxyWebSocketURL = proxyOptions.proxyHttpURL.replace('http://', 'ws://')

    return proxyOptions
  }


  // If the server type is proxy, return a proxy options object (and exit with an error if one is not provided).
  proxyOptions (command) {
    let proxyOptions = {proxyHttpURL: null, proxyWebSocketURL: null}

    if (command.isProxy) {
      if (command.positionalArguments.length < 1) {
        // A proxy path must be included.
        const errorMessage = 'Error: you must supply a URL to proxy. e.g., web-server proxy http://localhost:1313'
        console.log(`\n 🤯 ${errorMessage}\n`)
        throw new Error(errorMessage)
      }
      if (command.positionalArguments.length > 1) {
        // Syntax error.
        this.syntaxError()
      }
      proxyOptions = this.proxyUrls(command.positionalArguments[0])
    }

    return proxyOptions
  }


  // Return a sync options object given a command.
  syncOptions (command) {
    //
    // Syntax:
    //
    //  1. web-server sync --host=<host> [--folder=<folder>] [--account=<account>] [--proxy=<proxy-host>]
    //  2. web-server sync <host>
    //  3. web-server sync <folder> --host=<host>
    //  4. web-server sync <folder> <host>
    //  5. web-server sync --to=<account>@<host>:/home/<account>/<folder> [--proxy=<proxy-host>]
    //  6. web-server sync <folder> --to=<account>@<host>:/home/<account>/<folder> [--proxy=<proxy-host>]
    //
    // Key: […] = optional, <…> = value placeholder.
    //

    const syncOptionsDerivedFromPositionalArguments = { syncLocalFolder: null, syncRemoteHost: null }

    const syncOptions = { syncRemoteConnectionString: null, syncLocalFolder: null, syncStartProxyServer: null, syncRemoteHost: null }

    if (command.isSync) {

      // Adds remote server --<option>s, if any, to the syncOptions object.
      const addNamedArguments = () => {
        console.log('Sync: adding named arguments.')

        function namedArgumentExists(namedArgument) {
          return typeof command.namedArguments[namedArgument] === 'string'
        }

        // Check for conflicts between positional arguments and named arguments
        // and fail if there are any.
        if (namedArgumentExists('to')) {
          if (syncOptionsDerivedFromPositionalArguments.syncRemoteHost !== null) {
            // Conflict: remote host specified as both a positional argument and within the --to option.
            this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('to', 'cyan')} option or provide the remote host as a positional argument, but not both.`)
          } else if (namedArgumentExists('account') || namedArgumentExists('host') || namedArgumentExists('folder')) {
            // Conflict: --to option used alongside the --account, --host, or --folder arguments.
            this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('to', 'cyan')} option or use ${clr('account', 'cyan')}/${clr('host', 'cyan')}/${clr('folder', 'cyan')} options but not both.`)
          } else {
            // Check that the passed string has correct syntax.
            remoteConnectionStringSyntaxMatch = command.namedArguments.to.match(/(.*?)@(.*?):(.*?)$/)
            if (remoteConnectionStringSyntaxMatch === null) {
              this.syntaxError(`could not parse rsync connection string in ${clr('--to', 'yellow')} option (${clr(command.namedArguments.to, 'cyan')}). It should be in the form ${clr('account@host:/path/to/folder', 'cyan')}`)
            }

          // Helper: redundant but useful so we don’t have to parse the remote connection string again.
          syncOptions.syncRemoteHost = remoteConnectionStringSyntaxMatch[2]

            // No conflicts or syntax issues: set the remote connection string to the one provided.
            syncOptions.syncRemoteConnectionString = command.namedArguments.to
          }
        } else {
          // Construct the remote connection string.
          if (syncOptionsDerivedFromPositionalArguments.syncRemoteHost !== null && namedArgumentExists('host')) {
            this.syntaxError(`ambiguous sync options: please provide ${clr('either', 'italics')} the ${clr('host', 'cyan')} option or provide the remote host as a positional argument, but not both.`)
          }

          // The account to use is either what is set explicitly using the --account option
          // or defaults to the same account as the person has on their local machine.
          const _account = namedArgumentExists('account') ? command.namedArguments.account : process.env.USER
          const _host = namedArgumentExists('host') ? command.namedArguments.host : syncOptionsDerivedFromPositionalArguments.syncRemoteHost

          if (_host === null) {
            // This should not happen.
            this.syntaxError(`remote ${clr('host', 'cyan')} not provided either using the ${clr('--host', 'yellow')} option or via a positional argument. This should not happen.`)
          }

          // Helper: redundant but useful so we don’t have to parse the remote connection string again.
          syncOptions.syncRemoteHost = _host

          // We expect the remote folder to be at /home/<account>/<folder> where <folder> either defaults
          // to the name of the current folder on the local machine or is overriden using the --folder option.
          // If you want to specify any arbitrary folder on the remote machine, provide the full rsync
          // connection string using the --to option.
          const remoteFolderPrefix = `/home/${_account}`
          const localFolderPath = path.resolve(syncOptionsDerivedFromPositionalArguments.syncLocalFolder)
          const localFolderFragments = localFolderPath.split(path.sep)
          const currentLocalFolderName = localFolderFragments[localFolderFragments.length-1]

          const _folder = namedArgumentExists('folder') ? `${remoteFolderPrefix}/${command.namedArguments.folder}` : `${remoteFolderPrefix}/${currentLocalFolderName}`

          syncOptions.syncRemoteConnectionString = `${_account}@${_host}:${_folder}`

          console.log('>>> Constructed remote connection string', syncOptions.syncRemoteConnectionString)
        }

        // Add the local folder to sync. This should have been set before we reach this point.
        // Sanity check:
        if (syncOptionsDerivedFromPositionalArguments.syncLocalFolder === null) {
          throw new Error('Sanity check failed: syncOptionsDerivedFromPositionalArguments.syncLocalFolder should not be null.')
        }
        syncOptions.syncLocalFolder = syncOptionsDerivedFromPositionalArguments.syncLocalFolder

        // Add a trailing slash to the local folder if one doesn’t already exist.
        if (!syncOptions.syncLocalFolder.endsWith('/')) {syncOptions.syncLocalFolder = `${syncOptions.syncLocalFolder}/`}

        // Ensure that the local folder exists.
        if (!fs.existsSync(syncOptions.syncLocalFolder)) {
          console.log(`\n 🤯 Error: Folder not found (${clr(syncOptions.syncFolder, 'cyan')}).\n\n    Syntax:\tweb-server ${clr('sync', 'green')} ${clr('folder', 'cyan')} ${clr('domain', 'yellow')}\n    Command:\tweb-server ${clr('sync', 'green')} ${clr(syncOptions.syncFolder, 'cyan')} ${clr(syncOptions.syncDomain, 'yellow')}\n`)
          process.exit(1)
        }

        //
        // Add any remaining sync options that have been provided.
        //
        if (namedArgumentExists('proxy')) {
          syncOptions.syncStartProxyServer = true
          const proxyOptions = this.proxyUrls(command.namedArguments.proxy)
          Object.assign(syncOptions, proxyOptions)
        }

        // Debug. (That’s it, this is the syncOptions object we’ll be returning).
        console.log('syncOptions', syncOptions)
      }

      if (command.positionalArguments.length === 0) {
        //
        // No positional arguments. Must at least specify either:
        //
        //  Syntax 1. host as a named argument (--host), or
        //  Syntax 4. the full rsync connection string using the --to named argument.
        //
        // Note: If the --to option is specified, it will override the host, folder,
        // ===== and account arguments (whether named or positional).
        //
        console.log("Syntax 1 or 5")

        if (typeof command.namedArguments.to === 'string') {
          console.log("Syntax 5")
          syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
        } else if (typeof command.namedArguments.host === 'string') {
          console.log("Syntax 1")
          syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
        } else if (typeof command.namedArguments.to === 'string') {
          // Syntax error.
          this.syntaxError(`must specify either ${clr('host', 'cyan')} to sync to or provide full rsync connection string using ${clr('to', 'cyan')} option`)
        }
      } else if (command.positionalArguments.length === 1) {
        console.log("Syntax 2, 3, or 6")
        //
        // One argument is provided, if:
        //
        // Syntax 2: it is the local folder if --host is set
        // Syntax 6: it is the local folder if --to is set
        // Syntax 3: it is the host if --host is not set. The folder to sync is the current folder.
        //
        if (typeof command.namedArguments.host === 'string') {
          console.log('Syntax 2')
          syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
        } else if (typeof command.namedArguments.to === 'string') {
          console.log('Syntax 6')
          syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
        } else {
          console.log('Syntax 3')
          syncOptionsDerivedFromPositionalArguments.syncRemoteHost = command.positionalArguments[0]
          syncOptionsDerivedFromPositionalArguments.syncLocalFolder = '.'
        }
      } else if (command.positionalArguments.length === 2) {
        console.log("Syntax 4")
        //
        // Syntax 4: Two arguments provided. We interpret the first as the path of the
        // folder to serve and the second as the host.
        //
        syncOptionsDerivedFromPositionalArguments.syncLocalFolder = command.positionalArguments[0]
        syncOptionsDerivedFromPositionalArguments.syncRemoteHost = command.positionalArguments[1]
      } else {
        // Syntax error: we can have at most two positional arguments.
        this.syntaxError('too many arguments')
      }

      // Add any named arguments (--<option>) that may exist to the syncOptions object.
      addNamedArguments()
    }

    return syncOptions
  }
}

module.exports = new CommandLineInterface()
