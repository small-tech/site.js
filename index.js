const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const childProcess = require('child_process')

const express = require('express')
const morgan = require('morgan')
const Greenlock = require('greenlock')
const redirectHTTPS = require('redirect-https')

// Requiring nodecert ensures that locally-trusted TLS certificates exist.
require('@ind.ie/nodecert')

const nodecertDirectory = path.join(os.homedir(), '.nodecert')

if (!fs.existsSync(nodecertDirectory)) {
  throw new Error('Error: requires nodecert.\n\nInstall: npm i -g nodecert\nRun    : nodecert\n\nMore information: https://source.ind.ie/hypha/tools/nodecert')
}


class HttpsServer {

  //
  // Public.
  //

  // Returns an https server instance – the same as you’d get with
  // require('https').createServer – configured with your locally-trusted nodecert
  // certificates by default. If you pass in an email address, globally-trusted
  // are obtained from Let’s Encrypt.
  //
  // Note: if you pass in a key and cert in the options object, they will not be
  // ===== used and will be overwritten.
  createServer (options = {}, requestListener = undefined) {
    // TODO: Create local certificate authority and certificates if on development
    // ===== or use Greenlock on production to ensure that we have Let’s Encrypt
    //       certificates set up.
    if (options.email !== undefined) {
      return this._createTLSServerWithGloballyTrustedCertificate (options, requestListener)
    } else {
      // Default to using local certificates.
      return this._createTLSServerWithLocallyTrustedCertificate(options, requestListener)
    }
  }


  // Starts a static server serving the contents of the passed path at the passed port
  // and returns the server. If an email address is provided, then global certificates
  // are obtained and used from Let’s Encrypt.
  serve (pathToServe = '.', callback = null, port = 443, email = undefined) {

    // Can also be called as serve(pathToServe, port)
    if (typeof callback === 'number') {
      port = callback
      callback = null
    }

    this._ensureWeCanBindToPort(port, pathToServe)

    // If a callback isn’t provided, fallback to a default one that gives a status update.
    if (callback === null) {
      callback = function () {
        const serverPort = this.address().port
        let portSuffix = ''
        if (serverPort !== 443) {
          portSuffix = `:${serverPort}`
        }
        console.log(` 🎉 Serving ${pathToServe} on https://localhost${portSuffix}\n`)
      }
    }

    // Create an express server to serve the path using Morgan for logging.
    const app = express()
    app.use(morgan('tiny'))
    app.use(express.static(pathToServe))

    let server
    try {
      server = this.createServer({certificateType, email}, app).listen(port, callback)
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
    console.log('[https-server] Using locally-trusted certificates.')
    const defaultOptions = {
      key: fs.readFileSync(path.join(nodecertDirectory, 'localhost-key.pem')),
      cert: fs.readFileSync(path.join(nodecertDirectory, 'localhost.pem'))
    }

    Object.assign(options, defaultOptions)

    return https.createServer(options, requestListener)
  }


  _createTLSServerWithGloballyTrustedCertificate (options, requestListener = undefined) {
    console.log('[https-server] Using globally-trusted certificates.')

    const email = options.email
    delete options.email // Let’s be nice and not pollute that object.

    // Certificates are automatically obtained for the hostname and the www. subdomain of the hostname
    // for the machine that we are running on.
    const hostname = os.hostname()

    const greenlock = Greenlock.create({
      // Note: while testing, you might want to use the staging server at:
      // ===== https://acme-staging-v02.api.letsencrypt.org/directory
      server: 'https://acme-v02.api.letsencrypt.org/directory',

      version: 'draft-11',
      configDir: `~/.nodecert/${hostname}/`,
      approvedDomains: [hostname, `www.${hostname}`],
      agreeTos: true,
      telemetry: false,
      communityMember: false,
      email,
    })

    // Create an HTTP server to handle redirects for the Let’s Encrypt ACME HTTP-01 challenge method that we use.
    const httpsRedirectionMiddleware = redirectHTTPS()
    const httpServer = http.createServer(greenlock.middleware(httpsRedirectionMiddleware))
    httpServer.listen(80, () => {
      console.log('[https-server] (Globally-trusted TLS) HTTP → HTTPS redirection active.')
    })

    // Debug
    console.log('greenlock.tlsOptions', greenlock.tlsOptions)

    // Add the TLS options from Greenlock to any existing options that might have been passed in.
    Object.assign(options, greenlock.tlsOptions)

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

module.exports = new HttpsServer()
