////////////////////////////////////////////////////////////////////////////////
//
// Site.js
//
// Develop, test, and deploy your secure static or dynamic personal web site
// with zero configuration.
//
// Copyright ⓒ 2019 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')

const crossPlatformHostname = require('@small-tech/cross-platform-hostname')

const clr = require('./lib/clr')

const express = require('express')
const bodyParser = require('body-parser')
const expressWebSocket = require('@small-tech/express-ws')
const helmet = require('helmet')
const morgan = require('morgan')
const redirectHTTPS = require('redirect-https')
const enableDestroy = require('server-destroy')
const Graceful = require('node-graceful')
const httpProxyMiddleware = require('http-proxy-middleware')

const instant = require('@small-tech/instant')

const cli = require('./bin/lib/cli')
const serve = require('./bin/commands/serve')
const chokidar = require('chokidar')
const decache = require('decache')

const childProcess = require('child_process')

const AcmeTLS = require('@ind.ie/acme-tls')
const nodecert = require('@ind.ie/nodecert')
const getRoutes = require('@ind.ie/web-routes-from-files')
const Stats = require('./lib/Stats')


class Site {

  // Emitted when the address the server is trying to use is already in use by a different process on the system.
  static get EVENT_ADDRESS_ALREADY_IN_USE () { return 'site.js-address-already-in-use' }

  // The cross-platform hostname (os.hostname() on Linux and macOS, special handling on Windows to return
  // the full computer name, which can be a domain name and thus the equivalent of hostname on Linux and macOS).
  static get hostname () { return crossPlatformHostname }

  // Logs a nicely-formatted version string based on
  // the version set in the package.json file to console.
  // (Only once per Site lifetime.)
  // (Synchronous.)
  static logAppNameAndVersion () {
    if (!Site.appNameAndVersionAlreadyLogged && !process.argv.includes('--dont-log-app-name-and-version')) {
      console.log(`\n 💖 Site.js v${Site.versionNumber()} ${clr(`(running on Node ${process.version})`, 'italic')}\n`)
      Site.appNameAndVersionAlreadyLogged = true
    }
  }

  // Calculate and cache version number from package.json on first call.
  static versionNumber () {
    if (Site._versionNumber === null) {
      Site._versionNumber = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json'), 'utf-8')).version
    }
    return Site._versionNumber
  }

  // Default error pages.
  static default404ErrorPage(missingPath) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">${missingPath}</span></p></main></body></html>`
  }

  static default500ErrorPage(errorMessage) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">${errorMessage}</span></p></main></body></html>`
  }

  // Creates a Site instance. Customise it by passing an options object with the
  // following properties (all optional):
  //
  // •      path: (string)    the path to serve (defaults to the current working directory).
  // •      port: (integer)   the port to bind to (between 0 - 49,151; the default is 443).
  // •    global: (boolean)   if true, automatically provision an use Let’s Encrypt TLS certificates.
  // • proxyPort: (number)    if provided, a proxy server will be created for the port (and path will be ignored)
  // •   aliases: (string)    comma-separated list of domains that we should get TLS certs
  //                          for and serve.
  //
  // Note: if you want to run the site on a port < 1024 on Linux, ensure your process has the
  // ===== necessary privileges to bind to such ports. E.g., use require('lib/ensure').weCanBindToPort(port, callback)
  constructor (options) {
    // Introduce ourselves.
    Site.logAppNameAndVersion()

    // Ensure that the settings directory exists and create it if it doesn’t.
    this.settingsDirectory = path.join(os.homedir(), '.site.js')

    if (!fs.existsSync(this.settingsDirectory)) {
      fs.mkdirSync(this.settingsDirectory)
    }

    // The options parameter object and all supported properties on the options parameter
    // object are optional. Check and populate the defaults.
    if (options === undefined) options = {}
    this.pathToServe = typeof options.path === 'string' ? options.path : '.'
    this.port = typeof options.port === 'number' ? options.port : 443
    this.global = typeof options.global === 'boolean' ? options.global : false
    this.aliases = Array.isArray(options.aliases) ? options.aliases : []

    // The www subdomain is a default alias.
    this.aliases.push(`www.${Site.hostname}`)

    // Has a proxy server been requested? If so, we flag it and save the port
    // we were asked to proxy. In this case, pathToServe is ignored/unused.
    this.isProxyServer = false
    this.proxyPort = null
    if (typeof options.proxyPort === 'number') {
      this.isProxyServer = true
      this.proxyPort = options.proxyPort
    }

    // Auto updates.
    //
    // If we’re running in production, set up a timer to periodically check for
    // updates and perform them if necessary.

    function checkForUpdates () {
      console.log(' 🛰 Running auto-update…')

      const options = {env: process.env, stdio: 'inherit'}
      try {
        childProcess.execSync('site update', options)
      } catch (error) {
        console.log(' 😱 Error: Could not check for updates.')
        console.log(error)
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.log(' ⏰ Setting up auto-update check interval.')
      this.autoUpdateCheckInterval = setInterval(checkForUpdates, 30000 /* TODO: Increase */)

      // And perform an initial check at startup.
      checkForUpdates()
    }

    //
    // Configure the Express app.
    //
    this.stats = this.initialiseStatistics()
    this.app = express()

    this.startAppConfiguration()

    if (this.isProxyServer) {
      this.configureProxyRoutes()
    } else {
      this.configureAppRoutes()
    }

    this.endAppConfigurationAndCreateServer()

    // If running as child process, notify person.
    process.on('message', (m) => {
      if (m.IAmYourFather !== undefined) {
        process.stdout.write(`\n 👶 Running as child process.`)
      }
    })
  }


  // Middleware common to both regular servers and proxy servers
  // that go at the start of the app configuration.
  startAppConfiguration() {
    // Express.js security with HTTP headers.
    this.app.use(helmet())

    // Statistics middleware (captures anonymous, ephemeral statistics).
    this.app.use(this.stats.middleware)

    // Logging.
    this.app.use(morgan('tiny'))

    // Add domain aliases support (add 302 redirects for any domains
    // defined as aliases so that the URL is rewritten). There is always
    // at least one alias (the www. subdomain) for global servers.
    if (this.global) {
      const mainHostname = Site.hostname
      this.app.use((request, response, next) => {
        const requestedHost = request.header('host')
        if (requestedHost === mainHostname) {
          next()
        } else {
          console.log(` 👉 [Site.js] Redirecting alias ${requestedHost} to main hostname ${mainHostname}.`)
          response.redirect(`https://${mainHostname}${request.path}`)
        }
      })
    }

    // Statistics view (displays anonymous, ephemeral statistics)
    this.app.get(this.stats.route, this.stats.view)
  }


  // Middleware and routes that are unique to regular sites
  // (not used on proxy servers).
  configureAppRoutes () {
    this.add4042302Support()
    this.addCustomErrorPagesSupport()

    // Add routes
    this.appAddTest500ErrorPage()
    this.appAddDynamicRoutes()
    this.appAddStaticRoutes()
    this.appAddArchiveCascade()
  }


  // Middleware unique to proxy servers.
  // TODO: Refactor: Break this method up. []
  configureProxyRoutes () {

    const proxyHttpUrl = `http://localhost:${this.proxyPort}`
    const proxyWebSocketUrl = `ws://localhost:${this.proxyPort}`

    function prettyLog (message) {
      console.log(` 🔁 ${message}`)
    }

    const logProvider = function(provider) {
      return { log: prettyLog, debug: prettyLog, info: prettyLog, warn: prettyLog, error: prettyLog }
    }

    const webSocketProxy = httpProxyMiddleware({
      target: proxyWebSocketUrl,
      ws: true,
      changeOrigin:false,
      logProvider,
      logLevel: 'info'
    })

    const httpsProxy = httpProxyMiddleware({
      target: proxyHttpUrl,
      changeOrigin: true,
      logProvider,
      logLevel: 'info',
    })

    this.app.use(httpsProxy)
    this.app.use(webSocketProxy)

    this.httpsProxy = httpsProxy
    this.webSocketProxy = webSocketProxy
  }


  // Finish configuring the app and create the server.
  // (We need to add the WebSocket (WSS) routes after the server has been created).
  endAppConfigurationAndCreateServer () {

    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (this.port < 0 || this.port > 49151) {
      throw new Error('Error: specified port must be between 0 and 49,151 inclusive.')
    }

    // Create the server.
    this.server = this.createServer({global: this.global}, this.app)

    // Enable the ability to destroy the server (close all active connections).
    enableDestroy(this.server)

    if (!this.isProxyServer) {

      const createWebSocketServer = () => {
        expressWebSocket(this.app, this.server, { perMessageDeflate: false })
      }

      // If we need to load dynamic routes from a routesJS file, do it now.
      if (this.routesJsFile !== undefined) {
        createWebSocketServer()
        require(path.resolve(this.routesJsFile))(this.app)
      }

      // If there are WebSocket routes, create a regular WebSocket server and
      // add the WebSocket routes (if any) to the app.
      if (this.wssRoutes !== undefined) {
        createWebSocketServer()
        this.wssRoutes.forEach(route => {
          console.log(` 🐁 Adding WebSocket (WSS) route: ${route.path}`)
          this.app.ws(route.path, require(route.callback))
        })
      }
    }

    this.server.on('error', error => {
      console.log('\n 🤯 Error: could not start server.\n')
      if (error.code === 'EADDRINUSE') {
        console.log(` 💥 Port ${this.port} is already in use.\n`)
      }
      this.server.emit(Site.EVENT_ADDRESS_ALREADY_IN_USE)
    })

    this.server.on('close', () => {
      // Ensure dynamic route watchers are removed.
      if (this.app.__dynamicFileWatcher !== undefined) {
        this.app.__dynamicFileWatcher.close()
        console.log (` 🚮 Removed dynamic file watchers.`)
      }

      // Ensure that the static route file watchers are removed.
      if (this.app.__instant !== undefined) {
        this.app.__instant.cleanUp(() => {
          console.log(' 🚮 Live reload file system watchers removed on server close.')
        })
      }
    })

    // The error routes go at the very end.

    //
    // 404 (Not Found) support.
    //
    this.app.use((request, response, next) => {
      // If a 4042302 (404 → 302) redirect has been requested, honour that.
      // (See https://4042302.org/). Otherwise, if there is a custom 404 error page,
      // serve that. (The template variable THE_PATH, if present on the page, will be
      // replaced with the current request path before it is returned.)
      if (this.has4042302) {
        const forwardingURL = `${this._4042302}${request.url}`
        console.log(`404 → 302: Forwarding to ${forwardingURL}`)
        response.redirect(forwardingURL)
      } else if (this.hasCustom404) {
        // Enable basic template support for including the missing path.
        const custom404WithPath = this.custom404.replace('THE_PATH', request.path)

        // Enable relative links to work in custom error pages.
        const custom404WithPathAndBase = custom404WithPath.replace('<head>', '<head>\n\t<base href="/404/">')

        response.status(404).send(custom404WithPathAndBase)
      } else {
        // Send default 404 page.
        response.status(404).send(Site.default404ErrorPage(request.path))
      }
    })

    //
    // 500 (Server error) support.
    //
    this.app.use((error, request, response, next) => {
      // Strip the Error: prefix from the message.
      const errorMessage = error.toString().replace('Error: ', '')

      // If there is a custom 500 path, serve that. The template variable
      // THE_ERROR, if present on the page, will be replaced with the error description.
      if (this.hasCustom500) {
        // Enable basic template support for including the error message.
        const custom500WithErrorMessage = this.custom500.replace('THE_ERROR', errorMessage)

        // Enable relative links to work in custom error pages.
        const custom500WithErrorMessageAndBase = custom500WithErrorMessage.replace('<head>', '<head>\n\t<base href="/500/">')

        response.status(500).send(custom500WithErrorMessageAndBase)
      } else {
        // Send default 500 page.
        response.status(500).send(Site.default500ErrorPage(errorMessage))
      }
    })
  }


  initialiseStatistics () {
    const statisticsRouteSettingFile = path.join(this.settingsDirectory, 'statistics-route')
    return new Stats(statisticsRouteSettingFile)
  }


  // Returns an https server instance – the same as you’d get with
  // require('https').createServer() – configured with your locally-trusted nodecert
  // certificates by default. If you pass in {global: true} in the options object,
  // globally-trusted TLS certificates are obtained from Let’s Encrypt.
  //
  // Note: if you pass in a key and cert in the options object, they will not be
  // ===== used and will be overwritten.
  createServer (options = {}, requestListener = undefined) {
    // Let’s be nice and not continue to pollute the options object
    // with our custom property (global).
    const requestsGlobalCertificateScope = options.global === true
    if (options.global !== undefined) { delete options.global }

    if (requestsGlobalCertificateScope) {
      return this._createTLSServerWithGloballyTrustedCertificate (options, requestListener)
    } else {
      // Default to using local certificates.
      return this._createTLSServerWithLocallyTrustedCertificate(options, requestListener)
    }
  }


  // Starts serving the site (or starts the proxy server).
  //   • callback: (function) the callback to call once the server is ready (defaults are provided).
  //
  // Can throw.
  serve (callback) {

    if (typeof callback !== 'function') {
      callback = this.isProxyServer ? this.proxyCallback : this.regularCallback
    }

    // Handle graceful exit.
    this.goodbye = (done) => {
      console.log('\n 💃 Preparing to exit gracefully, please wait…')

      // Close all active connections on the server.
      // (This is so that long-running connections – e.g., WebSockets – do not block the exit.)
      this.server.destroy()

      // Stop accepting new connections.
      this.server.close( () => {
        // OK, it’s time to go :)
        console.log('\n 💖 Goodbye!\n')
        done()
      })
    }
    Graceful.on('SIGINT', this.goodbye)
    Graceful.on('SIGTERM', this.goodbye)

    // Start the server.
    this.server.listen(this.port, () => {
      if (this.isProxyServer) {
        // As we’re using a custom server, manually listen for the http upgrade event
        // and upgrade the web socket proxy also.
        // (See https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade)
        this.server.on('upgrade', this.webSocketProxy.upgrade)
      }

      // Call the overridable callback (the defaults for these are purely informational/cosmetic
      // so they are safe to override).
      callback.apply(this, [this.server])
    })

    return this.server
  }

  //
  // Private.
  //

  prettyLocation () {
    let portSuffix = ''
    if (this.port !== 443) {
      portSuffix = `:${this.port}`
    }
    return this.global ? `${Site.hostname}${portSuffix}` : `localhost${portSuffix}`
  }


  showStatisticsUrl (location) {
    console.log(` 📊 For statistics, see https://${location}${this.stats.route}`)
  }


  // Callback used in regular servers.
  regularCallback (server) {
    const location = this.prettyLocation()
    console.log(`\n 🎉 Serving ${clr(this.pathToServe, 'cyan')} on ${clr(`https://${location}`, 'green')}\n`)
    this.showStatisticsUrl(location)
  }


  // Callback used in proxy servers.
  proxyCallback (server) {
    const location = this.prettyLocation()
    console.log(`\n 🚚 [Site.js] Proxying: HTTP/WS on localhost:${this.proxyPort} ←→ HTTPS/WSS on ${location}\n`)
    this.showStatisticsUrl(location)
  }


  // Adds custom error page support for 404 and 500 errors.
  addCustomErrorPagesSupport () {
    // Check if a custom 404 page exists at the conventional path. If it does, load it for use later.
    const custom404Path = path.join(this.pathToServe, '404', 'index.html')
    this.hasCustom404 = fs.existsSync(custom404Path)
    this.custom404 = null
    if (this.hasCustom404) {
      this.custom404 = fs.readFileSync(custom404Path, 'utf-8')
    }


    // Check if a custom 500 page exists at the conventional path. If it does, load it for use later.
    const custom500Path = path.join(this.pathToServe, '500', 'index.html')
    this.hasCustom500 = fs.existsSync(custom500Path)
    this.custom500 = null
    if (this.hasCustom500) {
      this.custom500 = fs.readFileSync(custom500Path, 'utf-8')
    }
  }


  // Check if a 4042302 (404 → 302) redirect has been requested.
  //
  // What if links never died? What if we never broke the Web? What if it didn’t involve any extra work?
  // It’s possible. And easy. (And with Site.js, it’s seamless.)
  // Just make your 404s into 302s.
  //
  // Find out more at https://4042302.org/
  add4042302Support () {
    const _4042302Path = path.join(this.pathToServe, '4042302')

    // TODO: We should really be checking that this is a file, not that it
    // ===== exists, on the off-chance that someone might have a directory
    //       with that name in their web root (that someone was me when I
    //       erroneously ran Site.js on the directory that I had the
    //       actually 4042302 project folder in).
    this.has4042302 = fs.existsSync(_4042302Path)
    this._4042302 = null
    if (this.has4042302) {
      this._4042302 = fs.readFileSync(_4042302Path, 'utf-8').replace(/\s/g, '')
    }
  }


  // To test a 500 error, hit /test-500-error
  appAddTest500ErrorPage () {
    this.app.use((request, response, next) => {
      if (request.path === '/test-500-error') {
        throw new Error('Bad things have happened.')
      } else {
        next()
      }
    })
  }


  // Add static routes.
  // (Note: directories that begin with a dot (hidden directories) will be ignored.)
  appAddStaticRoutes () {
    this.app.__instant = instant(this.pathToServe, {
      watch: ['html', 'js', 'css', 'svg', 'png', 'jpg', 'jpeg']
    })
    this.app.use(this.app.__instant)
  }


  // Add dynamic routes, if any, if a <pathToServe>/.dynamic/ folder exists.
  // If there are errors in any of your dynamic routes, you will get 500 (server) errors.
  //
  // Each of the routing conventions are mutually exclusive and applied according to the following precedence rules:
  //
  // 1. Advanced _routes.js_-based advanced routing.
  //
  // 2. Separate folders for _.https_ and _.wss_ routes routing (the _.http_ folder itself will apply precedence rules 3 and 4 internally).
  //
  // 3. Separate folders for _.get_ and _.post_ routes in HTTPS-only routing.
  //
  // 4. GET-only routing.
  //
  // For full details, please see the readme file.

  appAddDynamicRoutes () {

    // Initially check if a dynamic routes directory exists. If it does not,
    // we don’t need to take this any further.
    const dynamicRoutesDirectory = path.join(this.pathToServe, '.dynamic')

    if (fs.existsSync(dynamicRoutesDirectory)) {
      // Watch .dynamic directory (recursively) so we can restart server when code changes.
      // Windows-style slashes are not part of the glob standard so we have to ensure all
      // slashes are forward slashes to ensure correct functioning on Windows 10
      // (see https://github.com/paulmillr/chokidar#api).
      const watchPath = `${dynamicRoutesDirectory.replace(/\\/g, '/')}/**`

      this.app.__dynamicFileWatcher = chokidar.watch(watchPath, {
        persistent: true,
        ignoreInitial: true
      })

      this.app.__dynamicFileWatcher.on ('all', (event, file) => {
        console.log(`\n 🐁 ${clr('Code updated', 'green')} in ${clr(file, 'cyan')}!`)
        console.log(' 🐁 Requesting restart…\n')

        if (process.env.NODE_ENV === 'production') {
          // We’re running production, to restart the daemon, just exit.
          // (We let ourselves fall, knowing that systemd will catch us.) ;)
          process.exit()
        } else {
          // We’re running as a regular process. Just restart the server, not the whole process.

          // Do some housekeeping.
          Graceful.off('SIGINT', this.goodbye)
          Graceful.off('SIGTERM', this.goodbye)

          // Destroy the current server (so we do not get a port conflict on restart before
          // we’ve had a chance to terminate our own process).
          this.server.destroy()

          // Stop accepting new connections.
          this.server.close(() => {
            // Restart the server.
            this.server.removeAllListeners('close')
            this.server.removeAllListeners('error')
            const {commandPath, args} = cli.initialise(process.argv.slice(2))
            serve(args)
            console.log('\n 🐁 Restarted server.\n')
          })
        }
      })

      const addBodyParser = () => {
        this.app.use(bodyParser.json())
        this.app.use(bodyParser.urlencoded({ extended: true }))
      }

      // Attempts to load HTTPS routes from the passed directory,
      // adhering to rules 3 & 4.
      const loadHttpsRoutesFrom = (httpsRoutesDirectory) => {
        // Attempts to load HTTPS GET routes from the passed directory.
        const loadHttpsGetRoutesFrom = (httpsGetRoutesDirectory) => {
          const httpsGetRoutes = getRoutes(httpsGetRoutesDirectory)
          httpsGetRoutes.forEach(route => {
            console.log(` 🐁 Adding HTTPS GET route: ${route.path}`)
            // Ensure we are loading a fresh copy in case it has changed.
            decache(route.callback)
            this.app.get(route.path, require(route.callback))
          })
        }

        // Check if separate .get and .post route directories exist.
        const httpsGetRoutesDirectory = path.join(httpsRoutesDirectory, '.get')
        const httpsPostRoutesDirectory = path.join(httpsRoutesDirectory, '.post')
        const httpsGetRoutesDirectoryExists = fs.existsSync(httpsGetRoutesDirectory)
        const httpsPostRoutesDirectoryExists = fs.existsSync(httpsPostRoutesDirectory)

        //
        // Rule 3: If a .get or a .post directory exists, attempt to load the dotJS routes from there.
        // ===========================================================================================
        //

        if (httpsGetRoutesDirectoryExists || httpsPostRoutesDirectoryExists) {
          // Either .get or .post routes directories (or both) exist.
          console.log(' 🐁 Found .get/.post folders. Will load dynamic routes from there.')
          if (httpsGetRoutesDirectoryExists) {
            loadHttpsGetRoutesFrom(httpsGetRoutesDirectory)
          }
          if (httpsPostRoutesDirectoryExists) {
            // Load HTTPS POST routes.

            addBodyParser()

            const httpsPostRoutes = getRoutes(httpsPostRoutesDirectory)
            httpsPostRoutes.forEach(route => {
              console.log(` 🐁 Adding HTTPS POST route: ${route.path}`)
              this.app.post(route.path, require(route.callback))
            })
          }
          return
        }

        //
        // Rule 4: If all else fails, try to load dotJS GET routes.
        // ========================================================
        //

        loadHttpsGetRoutesFrom(httpsRoutesDirectory)
      }

      //
      // Rule 1: Check if a routes.js file exists. If it does, we just need to load that in.
      // ===================================================================================
      //

      const routesJsFile = path.join(dynamicRoutesDirectory, 'routes.js')

      if (fs.existsSync(routesJsFile)) {
        console.log(' 🐁 Found routes.js file, will load dynamic routes from there.')
        // We flag that this needs to be done here and actually require the file
        // once the server has been created so that WebSocket routes can be added also.
        this.routesJsFile = routesJsFile

        // Add POST handling in case there are POST routes defined.
        addBodyParser()
        return
      }

      //
      // Rule 2: Check if .https and/or .wss folders exist. If they do, load the routes from there.
      // ==========================================================================================
      //

      const httpsRoutesDirectory = path.join(dynamicRoutesDirectory, '.https')
      const wssRoutesDirectory = path.join(dynamicRoutesDirectory, '.wss')
      const httpsRoutesDirectoryExists = fs.existsSync(httpsRoutesDirectory)
      const wssRoutesDirectoryExists = fs.existsSync(wssRoutesDirectory)

      if (httpsRoutesDirectoryExists || wssRoutesDirectoryExists) {
        // Either .https or .wss routes directories (or both) exist.
        console.log(' 🐁 Found .https/.wss folders. Will load dynamic routes from there.')
        if (httpsRoutesDirectoryExists) {
          loadHttpsRoutesFrom(httpsRoutesDirectory)
        }
        if (wssRoutesDirectoryExists) {
          // Load WebSocket (WSS) routes.
          //
          // Note: we are not adding them to the app here because Express-WS requires a
          // ===== reference to the server instance that we create manually (in order to
          //       add its HTTP upgrade handling. Since we don’t have the server instance
          //       yet, we delay adding the routes until the server is created).
          this.wssRoutes = getRoutes(wssRoutesDirectory)
        }
        return
      }

      // Fallback behaviour: routes.js file doesn’t exist and we don’t have
      // separate folders for .https and .wss routes. Attempt to load HTTPS
      // routes from the dynamic routes directory, while applying rules 3 & 4.
      loadHttpsRoutesFrom(dynamicRoutesDirectory)
    }
  }


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
  appAddArchiveCascade () {
    const archiveCascade = []
    const absolutePathToServe = path.resolve(this.pathToServe)

    // (Windows uses forward slashes in paths so write the RegExp accordingly for that platform.)
    const pathName = process.platform === 'win32' ? absolutePathToServe.match(/.*\\(.*?)$/)[1] : absolutePathToServe.match(/.*\/(.*?)$/)[1]

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

    // Serve the archive cascade (if there is one).
    // Note: for the archive cascade, we use express.static instead of instant as, by the
    // ===== nature of it being an archive, live reload should not be a requirement.
    let archiveNumber = 0
    archiveCascade.forEach(archivePath => {
      archiveNumber++
      console.log(` 🌱 [Site.js] Evergreen web: serving archive #${archiveNumber}`)
      this.app.use(express.static(archivePath))
    })
  }


  _createTLSServerWithLocallyTrustedCertificate (options, requestListener = undefined) {
    console.log(' 🚧 [Site.js] Using locally-trusted certificates.')

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
    console.log(' 🌍 [Site.js] Using globally-trusted certificates.')

    // Certificates are automatically obtained for the hostname and the www. subdomain of the hostname
    // for the machine that we are running on.
    const hostname = Site.hostname

    const acmeTLSOptions = {
      // Note: while testing, you might want to use the staging server at:
      // ===== https://acme-staging-v02.api.letsencrypt.org/directory
      server: 'https://acme-v02.api.letsencrypt.org/directory',

      version: 'draft-11',

      // Certificates are stored in ~/.acme-tls/<hostname>
      configDir: `~/.acme-tls/${hostname}/`,

      approvedDomains: [hostname],
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
      email: Site.hostname,

      // These will be removed altogether soon.
      telemetry: false,
      communityMember: false,
    }

    // If additional aliases have been specified, add those to the approved domains list.
    acmeTLSOptions.approvedDomains = acmeTLSOptions.approvedDomains.concat(this.aliases)
    const listOfAliases = this.aliases.reduce((prev, current) => {
      return `${prev}${current}, `
    }, '').slice(0, -2)
    console.log(` 👉 [Site.js] Aliases: also responding for ${listOfAliases}.`)

    const acmeTLS = AcmeTLS.create(acmeTLSOptions)

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
      httpsServer.emit('site.js-address-already-in-use')
    })

    httpServer.listen(80, () => {
      console.log(' 👉 [Site.js] HTTP → HTTPS redirection active.')
    })

    // Add the TLS options from ACME TLS to any existing options that might have been passed in.
    Object.assign(options, acmeTLS.tlsOptions)

    // Create and return the HTTPS server.
    // Note: calling method will add the error handler.
    const httpsServer = https.createServer(options, requestListener)
    return httpsServer
  }
}

Site.appNameAndVersionAlreadyLogged = false
Site._versionNumber = null

module.exports = Site

