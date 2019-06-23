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

const site = require('../../index')
const ensure = require('../lib/ensure')
const tcpPortUsed = require('tcp-port-used')
const clr = require('../../lib/clr')

function serve (args) {

  if (args.positionalArguments.length > 2) {
    syntaxError('Serve command has maximum of two arguments (what to serve and where to serve it).')
  }

  let global = null
  let port = null
  let path = null
  let proxyPort = null

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
          syntaxError('Host definition syntax can only contain one colon: either @localhost:port or @hostname:port. Default: @localhost:443')
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

  // Parse named arguments.
  let sync = null

  if (args.named.syncTo !== undefined) {
    sync = {}
    sync.to = args.named.syncTo
    sync.from = args.named.syncFrom || path
    sync.exit = args.named.exitOnSync || false
    sync.folderAndContents = args.named.syncFolderAndContents || false
  }

  ensure.weCanBindToPort(port, () => {
    tcpPortUsed.check(port)
    .then(inUse => {
      if (inUse) {
        console.log(`\n 🤯 Error: Cannot start server. Port ${clr(port.toString(), 'cyan')} is already in use.\n`)
        process.exit(1)
      } else {

        // TODO: Start sync if requested.

        // TODO: Only start server is --exit-on-sync is false.
        site.serve ({
          path,
          port,
          global,
          proxyPort
        })
      }
    })
  })
}

// Display a syntax error.
function syntaxError(message = null) {
  const additionalMessage = message === null ? '' : ` (${message})`
  require('./help')
}

function throwError(errorMessage) {
  console.log(`\n 🤯 ${errorMessage}\n`)
  throw new Error(errorMessage)
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
  let port = parseInt(port)

  const inTheValidPortRange = 'between 0 and 49,151 inclusive'

  // Invalid port.
  if (isNaN(port)) {
    this.throwError(`Error: “${port}” is not a valid port. Try a number ${inTheValidPortRange}.`)
  }

  // Check for a valid port range
  // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
  if (port < 0 || port > 49151) {
    this.throwError(`Error: specified port must be ${inTheValidPortRange}.`)
  }

  return port
}

module.exports = serve
