const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const childProcess = require('child_process')

const clr = require('./lib/clr')

const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const AcmeTLS = require('@ind.ie/acme-tls')
const redirectHTTPS = require('redirect-https')

const nodecert = require('@ind.ie/nodecert')

const Graceful = require('node-graceful')

class WebServer {

  // Default error pages.
  static default404ErrorPage(missingPath) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">${missingPath}</span></p></main></body></html>`
  }

  static default500ErrorPage(errorMessage) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">${errorMessage}</span></p></main></body></html>`
  }

  // Returns a nicely-formatted version string based on
  // the version set in the package.json file. (Synchronous.)
  version () {
    const version = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf-8')).version
    return `\n 💖 Indie Web Server v${version} ${clr(`(running on Node ${process.version})`, 'italic')}\n`
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
      console.log(`\n 🎉 Serving ${clr(pathToServe, 'cyan')} on ${clr(`https://${location}`, 'green')}\n`)
    }

    // Check if a 4042302 (404 → 302) redirect has been requested.
    //
    // What if links never died? What if we never broke the Web? What if it didn’t involve any extra work?
    // It’s possible. And easy. (And with Indie Web Server, it’s seamless.)
    // Just make your 404s into 302s.
    //
    // Find out more at https://4042302.org/
    const _4042302Path = path.join(pathToServe, '4042302')

    // TODO: We should really be checking that this is a file, not that it
    // ===== exists, on the off-chance that someone might have a directory
    //       with that name in their web root (that someone was me when I
    //       erroneously ran web-server on the directory that I had the
    //       actually 4042302 project folder in).
    const has4042302 = fs.existsSync(_4042302Path)
    let _4042302 = null
    if (has4042302) {
      _4042302 = fs.readFileSync(_4042302Path, 'utf-8').replace(/\s/g, '')
    }

    // Check if a custom 404 page exists at the conventional path. If it does, load it for use later.
    const custom404Path = path.join(pathToServe, '404', 'index.html')
    const hasCustom404 = fs.existsSync(custom404Path)
    let custom404 = null
    if (hasCustom404) {
      custom404 = fs.readFileSync(custom404Path, 'utf-8')
    }

    // Check if a custom 500 page exists at the conventional path. If it does, load it for use later.
    const custom500Path = path.join(pathToServe, '500', 'index.html')
    const hasCustom500 = fs.existsSync(custom500Path)
    let custom500 = null
    if (hasCustom500) {
      custom500 = fs.readFileSync(custom500Path, 'utf-8')
    }

    //
    // Check if we should implement an archive cascade.
    // e.g., given the following folder structure:
    //
    // |-site
    // |- site-archive-2
    // |- site-archive-1
    //
    // If we are asked to serve site, we would try and serve any 404s
    // first from site-archive-2 and then from site-archive-1. The idea
    // is that site-archive-\d+ are static archives of older versions of
    // the site and they are being served in order to maintain an
    // evergreen web where we try not to break existing links. If site
    // has a path, it will override site-archive-2 and site-archive-1. If
    // site-archive-2 has a path, it will override site-archive-1 and so
    // on. In terms of latest version to oldest version, the order is
    // site, site-archive-2, site-archive-1.
    //
    // The archive cascade is automatically created by naming and location
    // convention. If the folder that is being served is called
    // my-lovely-site, then the archive folders we would look for are
    // my-lovely-site-archive-1, etc.
    //
    const archiveCascade = []
    const absolutePathToServe = path.resolve(pathToServe)
    const pathName = absolutePathToServe.match(/.*\/(.*?)$/)[1]
    if (pathName !== '') {
      let archiveLevel = 0
      do {
        archiveLevel++
        const archiveDirectory = path.resolve(absolutePathToServe, '..', `${pathName}-archive-${archiveLevel}`)
        if (fs.existsSync(archiveDirectory)) {
          // Archive exists, add it to the archive cascade.
          archiveCascade.push(archiveDirectory)
        } else {
          // Archive does not exist.
          break
        }
      } while (true)

      // We will implement the cascade in reverse (from highest archive number to the
      // lowest, with latter versions overriding earlier ones), so reverse the list.
      archiveCascade.reverse()
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
    this.ensureWeCanBindToPort(port)

    // Create an express server to serve the path using Morgan for logging.
    const app = express()
    app.use(helmet())                     // Express.js security with HTTP headers.
    app.use(morgan('tiny'))               // Logging.

    // To test a 500 error, hit /test-500-error
    app.use((request, response, next) => {
      if (request.path === '/test-500-error') {
        throw new Error('Bad things have happened.')
      } else {
        next()
      }
    })

    app.use(express.static(pathToServe))

    // Serve the archive cascade (if there is one).
    let archiveNumber = 0
    archiveCascade.forEach(archivePath => {
      archiveNumber++
      console.log(` 🌱 [Indie Web Server] Evergreen web: serving archive #${archiveNumber}`)
      app.use(express.static(archivePath))
    })

    // 404 (Not Found) support.
    app.use((request, response, next) => {
      // If a 4042302 (404 → 302) redirect has been requested, honour that.
      // (See https://4042302.org/). Otherwise, if there is a custom 404 error page,
      // serve that. (The template variable THE_PATH, if present on the page, will be
      // replaced with the current request path before it is returned.)
      if (has4042302) {
        const forwardingURL = `${_4042302}${request.url}`
        console.log(`404 → 302: Forwarding to ${forwardingURL}`)
        response.redirect(forwardingURL)
      } else if (hasCustom404) {
        // Enable basic template support for including the missing path.
        const custom404WithPath = custom404.replace('THE_PATH', request.path)

        // Enable relative links to work in custom error pages.
        const custom404WithPathAndBase = custom404WithPath.replace('<head>', '<head>\n\t<base href="/404/">')

        response.status(404).send(custom404WithPathAndBase)
      } else {
        // Send default 404 page.
        response.status(404).send(WebServer.default404ErrorPage(request.path))
      }
    })

    // 500 (Server error) support.
    app.use((error, request, response, next) => {
      // Strip the Error: prefix from the message.
      const errorMessage = error.toString().replace('Error: ', '')

      // If there is a custom 500 path, serve that. The template variable
      // THE_ERROR, if present on the page, will be replaced with the error description.
      if (hasCustom500) {
        // Enable basic template support for including the error message.
        const custom500WithErrorMessage = custom500.replace('THE_ERROR', errorMessage)

        // Enable relative links to work in custom error pages.
        const custom500WithErrorMessageAndBase = custom500WithErrorMessage.replace('<head>', '<head>\n\t<base href="/500/">')

        response.status(500).send(custom500WithErrorMessageAndBase)
      } else {
        // Send default 500 page.
        response.status(500).send(WebServer.default500ErrorPage(errorMessage))
      }
    })

    // Create the server and start listening on the requested port.
    let server = this.createServer({global}, app).listen(port, callback)

    server.on('error', error => {
      console.log('\n 🤯 Error: could not start server.\n')
      if (error.code === 'EADDRINUSE') {
        console.log(` 💥 Port ${port} is already in use.\n`)
      }
      server.emit('indie-web-server-address-already-in-use')
    })

    // Handle graceful exit.
    const goodbye = (done) => {
      console.log('\n 💃 Preparing to exit gracefully, please wait…')
      server.close( () => {
        // The server close event will be the last one to fire. Let’s say goodbye :)
        console.log('\n 💖 Goodbye!\n')
        done()
      })
    }
    Graceful.on('SIGINT', goodbye)
    Graceful.on('SIGTERM', goodbye)

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

    // Note: calling method will add the error handler.
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
      // architectural knock-ons including to the way certificates are stored in
      // the le-store-certbot storage strategy, etc. Instead of forking and gutting
      // multiple modules (I’ve already had to fork a number to remove the telemetry),
      // we are using the hostname in place of the email address as a local identifier.
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

    httpServer.on('error', error => {
      console.log('\n 🤯 Error: could not start HTTP server for ACME TLS.\n')
      if (error.code === 'EADDRINUSE') {
        console.log(` 💥 Port 80 is already in use.\n`)
      }
      // We emit this on the httpsServer that is returned so that the calling
      // party can listen for the event on the returned server instance. (We do
      // not return the httpServer instance and hence there is no purpose in
      // emitting the event on that server.)
      httpsServer.emit('indie-web-server-address-already-in-use')
    })

    httpServer.listen(80, () => {
      console.log(' 👉 [Indie Web Server] HTTP → HTTPS redirection active.')
    })

    // Add the TLS options from ACME TLS to any existing options that might have been passed in.
    Object.assign(options, acmeTLS.tlsOptions)

    // Create and return the HTTPS server.
    // Note: calling method will add the error handler.
    const httpsServer = https.createServer(options, requestListener)
    return httpsServer
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
  ensureWeCanBindToPort (port) {
    if (port < 1024 && os.platform() === 'linux') {
      const options = {env: process.env}
      try {
        childProcess.execSync(`setcap -v 'cap_net_bind_service=+ep' $(which ${process.title})`, options)
      } catch (error) {
        try {
          // Allow Node.js to bind to ports < 1024.
          childProcess.execSync(`sudo setcap 'cap_net_bind_service=+ep' $(which ${process.title})`, options)

          console.log(' 😇 [Indie Web Server] First run on Linux: got privileges to bind to ports < 1024. Restarting…')

          // Fork a new instance of the server so that it is launched with the privileged Node.js.
          childProcess.fork(path.join(__dirname, 'bin', 'web-server.js'), process.argv.slice(2), {env: process.env})

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

