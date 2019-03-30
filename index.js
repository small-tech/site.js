const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const childProcess = require('child_process')

const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const AcmeTLS = require('@ind.ie/acme-tls')
const redirectHTTPS = require('redirect-https')

const nodecert = require('@ind.ie/nodecert')


class WebServer {
  // Returns a nicely-formatted version string based on
  // the version set in the package.json file. (Synchronous.)
  version () {
    const version = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf-8')).version
    return `\n 💖 Indie Web Server v${version}\n`
  }

  // Returns an https server instance – the same as you’d get with
  // require('https').createServer() – configured with your locally-trusted nodecert
  // certificates by default. If you pass in {global: true} in the options object,
  // globally-trusted TLS certificates are obtained from Let’s Encrypt.
  //
  // Note: if you pass in a key and cert in the options object, they will not be
  // ===== used and will be overwritten.
  createServer (options = {}, requestListener = undefined) {

    // Let’s be nice and not continue to pollute the options object.
    const requestsGlobalCertificateScope = options.global === true
    if (options.global !== undefined) { delete options.global }

    if (requestsGlobalCertificateScope) {
      return this._createTLSServerWithGloballyTrustedCertificate (options, requestListener)
    } else {
      // Default to using local certificates.
      return this._createTLSServerWithLocallyTrustedCertificate(options, requestListener)
    }
  }


  // Starts a static server. You can customise it by passing an options object with the
  // following properties (all optional):
  //
  // •      path: (string)    the path to serve (defaults to the current working directory).
  // •  callback: (function)  the callback to call once the server is ready (a default is provided).
  // •      port: (integer)   the port to bind to (between 0 - 49,151; the default is 443).
  // •    global: (boolean)   if true, automatically provision an use Let’s Encrypt TLS certificates.
  serve (options) {

    console.log(this.version())

    // The options parameter object and all supported properties on the options parameter
    // object are optional. Check and populate the defaults.
    if (options === undefined) options = {}
    const pathToServe = typeof options.path === 'string' ? options.path : '.'
    const port = typeof options.port === 'number' ? options.port : 443
    const global = typeof options.global === 'boolean' ? options.global : false
    const callback = typeof options.callback === 'function' ? options.callback : function () {
      const serverPort = this.address().port
      let portSuffix = ''
      if (serverPort !== 443) {
        portSuffix = `:${serverPort}`
      }
      const location = global ? os.hostname() : `localhost${portSuffix}`
      console.log(`\n 🎉 Serving ${pathToServe} on https://${location}\n`)
    }

    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (port < 0 || port > 49151) {
      throw new Error('Error: specified port must be between 0 and 49,151 inclusive.')
    }

    // On Linux, we need to get the Node process special access to so-called privileged
    // ports (<1,024). This is meaningless security theatre unless you’re living in 1968
    // and using a mainframe and hopefully Linux will join the rest of the modern world
    // in dropping this requirement soon (macOS just did in Mojave).
    this._ensureWeCanBindToPort(port, pathToServe)

    // Create an express server to serve the path using Morgan for logging.
    const app = express()
    app.use(helmet())                     // Express.js security with HTTP headers.
    app.use(morgan('tiny'))               // Logging.
    app.use(express.static(pathToServe))

    // 404 (Not Found) support.
    app.use((request, response, next) => {

      // Send default 404 page.
      response.status(404).send(`<!doctype html><html style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">${request.path}</span></p></main></body></html>`)
    })

    let server
    try {
      server = this.createServer({global}, app).listen(port, callback)
    } catch (error) {
      console.log('\nError: could not start server', error)
      throw error
    }

    return server
  }

  //
  // Private.
  //

  _createTLSServerWithLocallyTrustedCertificate (options, requestListener = undefined) {
    console.log(' 🚧 [Indie Web Server] Using locally-trusted certificates.')

    // Ensure that locally-trusted certificates exist.
    nodecert()

    const nodecertDirectory = path.join(os.homedir(), '.nodecert')

    const defaultOptions = {
      key: fs.readFileSync(path.join(nodecertDirectory, 'localhost-key.pem')),
      cert: fs.readFileSync(path.join(nodecertDirectory, 'localhost.pem'))
    }

    Object.assign(options, defaultOptions)

    return https.createServer(options, requestListener)
  }


  _createTLSServerWithGloballyTrustedCertificate (options, requestListener = undefined) {
    console.log(' 🌍 [Indie Web Server] Using globally-trusted certificates.')

    // Certificates are automatically obtained for the hostname and the www. subdomain of the hostname
    // for the machine that we are running on.
    const hostname = os.hostname()

    const acmeTLS = AcmeTLS.create({
      // Note: while testing, you might want to use the staging server at:
      // ===== https://acme-staging-v02.api.letsencrypt.org/directory
      server: 'https://acme-v02.api.letsencrypt.org/directory',

      version: 'draft-11',

      // Certificates are stored in ~/.acme-tls/<hostname>
      configDir: `~/.acme-tls/${hostname}/`,

      approvedDomains: [hostname, `www.${hostname}`],
      agreeTos: true,

      // Instead of an email address, we pass the hostname. ACME TLS is based on
      // Greenlock.js and those folks decided to make email addresses a requirement
      // instead of an optional element as is the case with Let’s Encrypt. This has deep
      // architectural knock-offs including to the way certificates are stored in
      // the le-store-certbot storage strategy, etc. Instead of forking and gutting
      // multiple modules (I’ve already had to fork a number to remove the telemetry),
      // we are using the hostmail in place of the email address as a local identifier.
      // Our fork of acme-v02 is aware of this and will simply disregard any email
      // addresses passed that match the hostname before making the call to the ACME
      // servers. (That module, as it reflects the ACME spec, does _not_ have the email
      // address as a required property.)
      email: os.hostname(),

      // These will be removed altogether soon.
      telemetry: false,
      communityMember: false,
    })

    // Create an HTTP server to handle redirects for the Let’s Encrypt ACME HTTP-01 challenge method that we use.
    const httpsRedirectionMiddleware = redirectHTTPS()
    const httpServer = http.createServer(acmeTLS.middleware(httpsRedirectionMiddleware))
    httpServer.listen(80, () => {
      console.log(' 👉 [Indie Web Server] HTTP → HTTPS redirection active.')
    })

    // Add the TLS options from ACME TLS to any existing options that might have been passed in.
    Object.assign(options, acmeTLS.tlsOptions)

    // Create and return the HTTPS server.
    return https.createServer(options, requestListener)
  }


  // If we’re on Linux and the requested port is < 1024 ensure that we can bind to it.
  // (As of macOS Mojave, privileged ports are only an issue on Linux. Good riddance too,
  // as these so-called privileged ports are a relic from the days of mainframes and they
  // actually have a negative impact on security today:
  // https://www.staldal.nu/tech/2007/10/31/why-can-only-root-listen-to-ports-below-1024/
  //
  // Note: this might cause issues if https-server is used as a library as it assumes that the
  // ===== current app is in index.js and that it can be forked. This might be an issue if a
  //       process manager is already being used, etc. Worth keeping an eye on and possibly
  //       making this method an optional part of server startup.
  _ensureWeCanBindToPort (port, pathToServe) {
    if (port < 1024 && os.platform() === 'linux') {
      const options = {env: process.env}
      try {
        childProcess.execSync("setcap -v 'cap_net_bind_service=+ep' $(which node)", options)
      } catch (error) {
        try {
          // Allow Node.js to bind to ports < 1024.
          childProcess.execSync("sudo setcap 'cap_net_bind_service=+ep' $(which node)", options)
          // Fork a new instance of the server so that it is launched with the privileged Node.js.
          childProcess.fork(path.join(__dirname, 'index.js'), [pathToServe, port], {env: process.env, shell: true})
          // We’re done here. Go into an endless loop. Exiting (Ctrl+C) this will also exit the child process.
          while(1){}
        } catch (error) {
          console.log(`\n Error: could not get privileges for Node.js to bind to port ${port}.`, error)
          throw error
        }
      }
    }
  }
}

module.exports = new WebServer()
