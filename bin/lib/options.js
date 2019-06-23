//////////////////////////////////////////////////////////////////////
//
// Singleton with general CLI option parsing methods.
//
//////////////////////////////////////////////////////////////////////

class Options {
  // Return an options object given a command.
  constructor (command) {
    const options = {
      pathToServe: this.pathToServe(command),
      port: this.port(command)
    }
    Object.assign(options, this.proxyOptions(command))
    Object.assign(options, this.syncOptions(command))
    Object.assign(options, this.enableOptions(command))

    return options
  }

  // Return the path to serve (for server commands) or exit the app if it doesn’t exist.
  pathToServe (command) {

    // If no path is passed, we serve the current folder.
    // If there is a path, we’ll serve that.
    let pathToServe = '.'

    if (command.positionalArguments.length === 1) {
      // e.g., site enable path-to-serve OR site --enable path-to-serve
      pathToServe = command.positionalArguments[0]
    }

    // Ensure the path actually exists.
    if (!fs.existsSync(pathToServe)) {
      this.throwError(`Error: could not find path ${pathToServe}`)
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

}

module.exports = Options
