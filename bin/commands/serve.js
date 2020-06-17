//////////////////////////////////////////////////////////////////////
//
// Command: serve
//
// Starts web server as a regular system process with either:
//
// • locally-trusted TLS certificates (@localhost), or
// • globally-trusted certificates (@hostname)
//
//////////////////////////////////////////////////////////////////////

// Note: requires are at the bottom to avoid a circular reference as ../../index (Site)
// ===== also requires this module.

const fs = require('fs-extra')
const pathModule = require('path')

const DOMAIN = 'domain'
const ALIASES = 'aliases'
const SYNC_TO = 'sync-to'
const SYNC_FROM = 'sync-from'
const EXIT_ON_SYNC = 'exit-on-sync'
const SYNC_FOLDER_AND_CONTENTS = 'sync-folder-and-contents'

// Internal: used for pre-flight check to ensure the server can launch before creating a daemon.
const EXIT_AFTER_LAUNCH = 'exit-after-launch'

let global = null
let port = null
let path = null
let proxyPort = null

function serve (args) {

  // We repeat the assignment to null here to ensure these variables are null
  // in case the server was restarted and the module itself was cached.
  global = null
  port = null
  path = null
  proxyPort = null

  if (args.positional.length > 2) {
    syntaxError('Serve command has maximum of two arguments (what to serve and where to serve it).')
  }

  // Parse positional arguments.
  args.positional.forEach(arg => {
    if (arg.startsWith('@')) {
      // Parse host.
      let _host = arg
      const multipleHostDefinitionsErrorMessage = 'Multiple host definitions encountered. Please only use one.'

      // Parse port and update host accordingly if a port is provided.
      // e.g., @localhost:999
      if (arg.includes(':')) {
        const hostAndPort = arg.split(':')
        const hasCorrectNumberOfColons = hostAndPort.length === 2
        if (!hasCorrectNumberOfColons) {
          syntaxError('Host definition syntax can only contain one colon: @localhost:port. Default: @localhost:443')
        }

        _host = hostAndPort[0]
        const _port = hostAndPort[1]

        if (port === null) {
          port = ensurePort(_port)
        } else {
          syntaxError(multipleHostDefinitionsErrorMessage)
        }
      }

      // Update global flag based on host type.
      if (global === null) {
        global = isHostGlobal(_host)
      } else {
        syntaxError(multipleHostDefinitionsErrorMessage)
      }
    } else if (arg.startsWith(':')) {
      // Person has requested a proxy server and is specifying the port to proxy.
      const _proxyPort = arg.slice(1)
      if (_proxyPort.length === 0) {
        syntaxError('No port number found after colon. Cannot start proxy server.')
      }
      if (proxyPort === null) {
        proxyPort = ensurePort(_proxyPort)
      } else {
        syntaxError('Two proxy port definitions found. Please only supply one.')
      }
    } else {
      // Since the positional argument doesn’t start with an @ or a :,
      // it must be the name of the directory to serve.
      if (path === null) {
        path = arg
      } else {
        syntaxError('Two folders found to serve. Please only supply one.')
      }
    }
  })

  // Add defaults for any arguments not provided.
  global = global === null ? false : global
  port = port === null ? 443 : port
  path = path === null ? '.' : path

  //
  // Parse named arguments.
  //

  // Domain.
  const domain = args.named[DOMAIN]

  // Aliases.
  const _aliases = args.named[ALIASES]
  const aliases = _aliases === undefined ? [] : _aliases.split(',')

  // Internal: exit on launch. (Used in pre-flight checks to ensure server can launch before installing a daemon.)
  const exitAfterLaunch = args.named[EXIT_AFTER_LAUNCH]

  //
  // Sync options.
  //

  const syncRequested = args.named[SYNC_TO] !== undefined
  const exitOnSync = args.named[EXIT_ON_SYNC]

  // Sync is not supported on Windows as rsync does not exist in that cursed wasteland.
  if (syncRequested && process.platform === 'win32') {
    console.log(`\n   ❌    ❨site.js❩ Sync is not supported on Windows.\n`)
    return
  }

  let syncOptions = null

  if (syncRequested) {
    syncOptions = remoteConnectionInfo(args)
    Object.assign(syncOptions, {
      from: localFolder(args),
      exit: exitOnSync || false,
    })
  }

  // If sync is requested, check if we need to generate any source.
  // Currently, this is a check for Hugo source directories.
  let hasGeneratedContent = false
  if (syncOptions !== null) {
    const hugoSourceFolderPrefixRegExp = /^.hugo(--)?/
    const absolutePathToServe = pathModule.resolve(path)
    const files = fs.readdirSync(absolutePathToServe)
    for (const file of files) {
      if (file.match(hugoSourceFolderPrefixRegExp)) {
        // Delete the .generated folder so that a full
        // generation can happen as we’re about to deploy.
        const generatedContentPath = pathModule.join(absolutePathToServe, '.generated')
        fs.removeSync(generatedContentPath)
        hasGeneratedContent = true
        break
      }
    }
  }

  if (syncOptions !== null && syncOptions.exit && !hasGeneratedContent) {
    // No need to start a server if all we want to do is sync and there’s no generated content.
    sync(syncOptions)
  } else {
    // Ensure privileged ports are disabled on Linux machines.
    // For details, see: https://source.small-tech.org/site.js/app/-/issues/169
    ensure.privilegedPortsAreDisabled()

    // Start a server and also sync if requested.
    tcpPortUsed.check(port)
    .then(async inUse => {
      if (inUse) {
        // Check to see if the problem is that Site.js is running as a daemon and
        // display a more specific error message if so. (Remember that daemons are
        // only supported on port 443 at the moment.)
        if (port === 443) {
          if (ensure.commandExists('systemctl')) {
            if ({ isActive } = status()) {
              console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Cannot start server. Site.js is already running as a daemon on port ${clr(port.toString(), 'cyan')}. Use the ${clr('stop', 'green')} command to stop it.\n`)
              process.exit(1)
            }
          }
        }

        // Generic port-in-use error message.
        console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Cannot start server. Port ${clr(port.toString(), 'cyan')} is already in use.\n`)
        process.exit(1)
      } else {


        const options = {
          domain,
          path,
          port,
          global,
          proxyPort,
          aliases
        }

        // Start serving the site.
        let site
        try {
          site = new Site(options)
        } catch (error) {
          // Rethrow
          throw(error)
        }

        // Start serving.
        try {
          await site.serve()

          if (exitAfterLaunch) {
            console.log('   ✅    Exit after launch requested. Launch successful; exiting…')
            process.exit(0)
          }

        } catch (error) {
          if (error instanceof errors.InvalidPathToServeError) {
            console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} The path to serve ${clr(options.path, 'yellow')} does not exist.\n`)
            process.exit(1)
          } else {
            // Rethrow
            throw(error)
          }
        }

        const server = site.server

        // Start sync if requested.
        if (syncOptions !== null) {
          sync(syncOptions)
        }

        if (!syncRequested && exitOnSync) {
          // Person has provided the --exit-on-sync option but has not specified where to sync to.
          // Warn them and continue.
          console.log (`   ⚠    --exit-on-sync option specified without --sync-to option; ignoring.`)
        }
      }
    })
  }
}

// Display a syntax error.
function syntaxError(message = null) {
  const additionalMessage = message === null ? '' : message
  console.log(`\n   ❌    ${clr('❨site.js❩ Syntax error:', 'red')} ${additionalMessage}`)
  require('./help')()
}

// Throw a general error.
function throwError(errorMessage) {
  console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${errorMessage}\n`)
  throw new Error(`Error: ${errorMessage}`)
}

function isHostGlobal(host) {
  const isValidHost = ['@localhost', '@hostname'].includes(host)
  if (!isValidHost) {
    syntaxError(`Invalid host: ${host}. Host should either be @localhost or @hostname. Default: @localhost`)
  }
  return (host === '@hostname')
}

// Ensures that port is valid before returning it.
function ensurePort (port) {
  // If a port is specified, use it. Otherwise use the default port (443).
  port = parseInt(port)

  const inTheValidPortRange = 'between 0 and 49,151 inclusive'

  // Invalid port.
  if (isNaN(port)) {
    throwError(`“${port}” is not a valid port. Try a number ${inTheValidPortRange}.`)
  }

  // Check for a valid port range
  // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
  if (port < 0 || port > 49151) {
    throwError(`specified port must be ${inTheValidPortRange}.`)
  }

  return port
}


// Returns the local folder given an args object.
function localFolder (args) {

  let localFolder = null

  // If --sync-from is not specified, we default to the path to be served (or default path).
  const syncFrom = args.named[SYNC_FROM] || path
  const syncFromEndsWithPathSeparator = syncFrom.endsWith(_path.sep)

  // Handle the sync-folder-and-contents flag or its lack
  if (args.named[SYNC_FOLDER_AND_CONTENTS] === true) {
    // We should sync both the folder itself and its contents. We signal this to rsync
    // by ensuring that the name of the folder *does not* end in a trailing slash.
    if (syncFromEndsWithPathSeparator) {
      localFolder = syncFrom.substr(0, syncFrom - 1)
    }
  } else {
    // Default: we sync only the contents of the local folder, not the folder itself. To
    // ======== specify this to rsync, we ensure that the local folder path ends with a slash.
    if (!syncFromEndsWithPathSeparator) {
      localFolder = `${syncFrom}${_path.sep}`
    }
  }

  return localFolder
}


// Returns a remote connection info object from the provided args object:
//
// {
//   to,
//   account,
//   host,
//   remotePath,
// }
//
// (All properties strings.)
//
// Argument syntax:
//
// Short-hand: my.site         →   <same-as-local-account-name>@my.site:/home/me/<same-as-from-folder>
//             me@my.site      →   me@my.site:/home/me/<same-as-from-folder>
//             me@my.site:www  →   me@my.site:/home/me/www
//       Full: me@my.site:/var/www

function remoteConnectionInfo (args) {

  const syncFrom = args.named[SYNC_FROM]
  const syncTo = args.named[SYNC_TO]

  let account = null
  let host = null
  let remotePath = null

  function remotePathPrefix (account) {
    return _path.join('/home', account)
  }

  function remotePathForAccountAndLocalFolderName (account, localFolderName) {
    return _path.join(remotePathPrefix(account), localFolderName)
  }

  function defaultRemotePath (account) {
    const localFolderPath = _path.resolve(syncFrom || path)
    const localFolderFragments = localFolderPath.split(_path.sep)
    const localFolderName = localFolderFragments[localFolderFragments.length-1]

    return _path.join(remotePathPrefix(account), localFolderName)
  }

  const splitOnAt = syncTo.split('@')

  let hostAndMaybePort = null

  if (splitOnAt.length === 1) {
    // No account provided. Default to the same account as on local machine.
    account = process.env.USER
    hostAndMaybePort = splitOnAt[0]
    remotePath = defaultRemotePath(account)
  }

  if (splitOnAt.length === 2) {
    account = splitOnAt[0]
    hostAndMaybePort = splitOnAt[1]
  }

  // Check if remote path is provided.
  const splitOnColon = hostAndMaybePort.split(':')
  host = splitOnColon[0]

  if (splitOnColon.length === 1) {
    // No remote path provided. Default to the same directory in the person’s home directory
    // as the current directory.
    remotePath = defaultRemotePath(account)
  }

  if (splitOnColon.length === 2) {
    // Remote path provided. Check if it is a relative or absolute path and
    // set the remotePath accordingly.
    if (splitOnColon[1].startsWith('/')) {
      // Remote path is an absolute path, use it as-is.
      remotePath = splitOnColon[1]
    } else {
      // Remote path is relative; rewrite it.
      remotePath = remotePathForAccountAndLocalFolderName(account, splitOnColon[1])
    }
  }

  const to = `${account}@${host}:${remotePath}`

  return {
    to,
    account,
    host,
    remotePath,
  }
}

module.exports = serve

// Note: requires are at the bottom to avoid a circular reference as ../../index (Site)
// ===== also requires this module.

const _path = require('path')

const sync = require('../lib/sync')

const Site = require('../../index')
const ensure = require('../lib/ensure')
const status = require('../lib/status')
const tcpPortUsed = require('tcp-port-used')
const clr = require('../../lib/clr')
const errors = require('../../lib/errors')
