////////////////////////////////////////////////////////////////////////////////
//
// Site.js
//
// Develop, test, and deploy your secure static or dynamic personal web site
// with zero configuration.
//
// Includes and has automatic support for the Hugo static site generator
// (https://gohugo.io). Just add your source to a folder called .hugo (to mount
// onto a path other than the root, name the folder with the path you want
// e.g., .hugo-docs will be mounted on https://<your.site>/docs).
//
// Copyright ⓒ 2019-2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////

const fs                    = require('fs-extra')
const path                  = require('path')
const os                    = require('os')
const EventEmitter          = require('events')
const childProcess          = require('child_process')
const http                  = require('http')
const https                 = require('@small-tech/https')
const expressWebSocket      = require('@small-tech/express-ws')
const Hugo                  = require('@small-tech/node-hugo')
const instant               = require('@small-tech/instant')
const crossPlatformHostname = require('@small-tech/cross-platform-hostname')
const getRoutes             = require('@small-tech/web-routes-from-files')
const JSDB                  = require('@small-tech/jsdb')
const Graceful              = require('node-graceful')
const express               = require('express')
const bodyParser            = require('body-parser')
const helmet                = require('helmet')
const httpProxyMiddleware   = require('http-proxy-middleware')
const enableDestroy         = require('server-destroy')
const moment                = require('moment')
const morgan                = require('morgan')
const chokidar              = require('chokidar')
const decache               = require('decache')
const prepareRequest        = require('bent')
const clr                   = require('./lib/clr')
const cli                   = require('./bin/lib/cli')
const serve                 = require('./bin/commands/serve')
const Stats                 = require('./lib/Stats')
const asyncForEach          = require('./lib/async-foreach')
const errors                = require('./lib/errors')


class Site {

  //
  // Class.
  //

  static #appNameAndVersionAlreadyLogged = false
  static #manifest = null

  static get HUGO_LOGO () {
    return `${clr('🅷', 'magenta')} ${clr('🆄', 'blue')} ${clr('🅶', 'green')} ${clr('🅾', 'yellow')} `
  }

  //
  // Manifest helpers. The manifest file is created by the build script and includes metadata such as the
  // binary version (in calendar version format YYYYMMDDHHmmss), the package version (in semantic version format),
  // the source version (the git hash of the commit that corresponds to the source code the binary was built from), and
  // the release channel (alpha, beta, or release).
  //

  static RELEASE_CHANNEL = {
    alpha  : 'alpha',
    beta   : 'beta',
    release: 'release',
    npm: 'npm'
  }

  static readAndCacheManifest () {
    try {
      this.#manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'))
    } catch (error) {
      // When running under Node (not wrapped as a binary), there will be no manifest file. So mock one.
      const options = {shell: os.platform() === 'win32' ? 'powershell' : '/bin/bash', env: process.env}

      // Note: we switch to __dirname because we need to if Site.js is running as a daemon from source.
      this.#manifest = {
        releaseChannel: 'npm',
        binaryVersion: '20000101000000',
        packageVersion: (require(path.join(__dirname, 'package.json'))).version,
        sourceVersion: childProcess.execSync(`pushd ${__dirname} ${os.platform() === 'win32' ? '' : '> /dev/null'}; git log -1 --oneline`,options).toString().match(/^[0-9a-fA-F]{7}/)[0],
        hugoVersion: (new Hugo()).version,
        platform: {linux: 'linux', win32: 'windows', 'darwin': 'macOS'}[os.platform()],
        architecture: os.arch()
      }
    }
  }

  static getFromManifest (key) {
    if (this.#manifest === null) {
      this.readAndCacheManifest()
    }
    return this.#manifest[key]
  }

  static get releaseChannel () { return this.getFromManifest('releaseChannel') }
  static get binaryVersion  () { return this.getFromManifest('binaryVersion')  }
  static get packageVersion () { return this.getFromManifest('packageVersion') }
  static get sourceVersion  () { return this.getFromManifest('sourceVersion')  }
  static get hugoVersion    () { return this.getFromManifest('hugoVersion')    }
  static get platform       () { return this.getFromManifest('platform')       }
  static get architecture   () { return this.getFromManifest('architecture')   }

  static binaryVersionToHumanReadableDateString (binaryVersion) {
    // Is this the dummy version that signals a development build?
    if (binaryVersion === '20000101000000') {
      return 'Dev'
    }
    const m = moment(binaryVersion, 'YYYYMMDDHHmmss')
    return `${m.format('MMMM Do, YYYY')} at ${m.format('HH:mm:ss')}`
  }

  static get humanReadableBinaryVersion () {
    if (this.#manifest === null) {
      this.readAndCacheManifest()
    }
    return this.binaryVersionToHumanReadableDateString(this.#manifest.binaryVersion)
  }

  static get releaseChannelFormattedForConsole () {
    switch(this.releaseChannel) {

      // Spells ALPHA in large red block letters.
      case this.RELEASE_CHANNEL.alpha:
        return [
          `         ${clr(' █████  ██      ██████  ██   ██  █████ ', 'red')}\n`,
          `         ${clr('██   ██ ██      ██   ██ ██   ██ ██   ██ ', 'red')}\n`,
          `         ${clr('███████ ██      ██████  ███████ ███████ ', 'red')}\n`,
          `         ${clr('██   ██ ██      ██      ██   ██ ██   ██ ', 'red')}\n`,
          `         ${clr('██   ██ ███████ ██      ██   ██ ██   ██', 'red')}\n`,
          '\n'
        ]

      // Spells BETA in large yellow block letters.
      case this.RELEASE_CHANNEL.beta:
        return [
          `         ${clr('██████  ███████ ████████  █████', 'yellow')}\n`,
          `         ${clr('██   ██ ██         ██    ██   ██', 'yellow')}\n`,
          `         ${clr('██████  █████      ██    ███████', 'yellow')}\n`,
          `         ${clr('██   ██ ██         ██    ██   ██', 'yellow')}\n`,
          `         ${clr('██████  ███████    ██    ██   ██', 'yellow')}\n`,
          '\n'
        ]

        default:
          return []
    }
  }

  // Returns the cross-platform hostname (os.hostname() on Linux and macOS, special handling on Windows to return the
  // full computer name, which can be a domain name and thus the equivalent of hostname on Linux and macOS).
  static get hostname () { return this._hostname ? this._hostname : crossPlatformHostname }

  static set hostname (domain) { this._hostname = domain }

  // This is the directory that settings and other persistent data is stored for Site.js.
  static get settingsDirectory () { return path.join(os.homedir(), '.small-tech.org', 'site.js') }

  // Logs a nicely-formatted version string based on
  // the version set in the package.json file to console.
  // (Only once per Site lifetime.)
  // (Synchronous.)
  static logAppNameAndVersion (compact = false) {

    if (process.env.QUIET) {
      return
    }

    if (!Site.#appNameAndVersionAlreadyLogged && !process.argv.includes('--dont-log-app-name-and-version')) {
      let prefix1 = compact ? ' 🌱 ' : '   🌱    '
      let prefix2 = '         '

      this.readAndCacheManifest()

      let message = [
        `\n${prefix1}Site.js\n\n`
      ].concat(this.releaseChannelFormattedForConsole).concat([
        `${prefix2}Created ${clr(this.humanReadableBinaryVersion, 'green')}\n`,
        '\n',
        `${prefix2}Version ${clr(`${this.binaryVersion}-${this.packageVersion}-${this.sourceVersion}-${this.platform}/${this.architecture}`, 'green')}\n`,
        `${prefix2}Node.js ${clr(`${process.version.replace('v', '')}`, 'green')}\n`,
        `${prefix2}Hugo    ${clr(`${this.hugoVersion}`, 'green')}\n`,
        '\n',
        `${prefix2}Base    ${clr(`https://sitejs.org/nexe/${process.platform}-${process.arch}-${process.version.replace('v', '')}`, 'cyan')}\n`,
        `${prefix2}Source  ${clr(`https://source.small-tech.org/site.js/app/-/tree/${this.sourceVersion}`, 'cyan')}\n\n`,
        `${prefix2}╔═══════════════════════════════════════════╗\n`,
        `${prefix2}║ Like this? Fund us!                       ║\n`,
        `${prefix2}║                                           ║\n`,
        `${prefix2}║ We’re a tiny, independent not-for-profit. ║\n`,
        `${prefix2}║ https://small-tech.org/fund-us            ║\n`,
        `${prefix2}╚═══════════════════════════════════════════╝\n`,
      ])

      if (compact) {
        message = message.map(l => l.replace(/^     /, ''))
      }

      message = message.join('')

      console.log(message)

      Site.#appNameAndVersionAlreadyLogged = true
    }
  }

  // Default error pages.
  static default404ErrorPage(missingPath) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">${missingPath}</span></p></main></body></html>`
  }

  static default500ErrorPage(errorMessage) {
    return `<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">${errorMessage}</span></p></main></body></html>`
  }

  //
  // Instance.
  //

  // Creates a Site instance. Customise it by passing an options object with the
  // following properties (all optional):
  //
  // •    domain: (string)    the main domain to serve (defaults to the hostname)
  // •      path: (string)    the path to serve (defaults to the current working directory).
  // •      port: (integer)   the port to bind to (between 0 - 49,151; the default is 443).
  // •    global: (boolean)   if true, automatically provision an use Let’s Encrypt TLS certificates.
  // • proxyPort: (number)    if provided, a proxy server will be created for the port (and path will be ignored)
  // •   aliases: (string)    comma-separated list of domains that we should get TLS certs
  //                          for and serve.
  //
  // Note: if you want to run the site on a port < 1024 on Linux, ensure that privileged ports are disabled.
  // ===== e.g., use require('lib/ensure').disablePrivilegedPorts()
  //
  //       For details, see: https://source.small-tech.org/site.js/app/-/issues/169

  constructor (options) {
    // Introduce ourselves.
    Site.logAppNameAndVersion()

    this.eventEmitter = new EventEmitter()

    // Ensure that the settings directory exists and create it if it doesn’t.
    fs.ensureDirSync(Site.settingsDirectory)

    // The options parameter object and all supported properties on the options parameter
    // object are optional. Check and populate the defaults.
    if (options === undefined) options = {}
    if (typeof options.domain === 'string') {
      Site.hostname = options.domain
    }
    this.pathToServe = typeof options.path === 'string' ? options.path : '.'
    this.absolutePathToServe = path.resolve(this.pathToServe)
    this.databasePath = path.join(this.absolutePathToServe, '.db')
    this.port = typeof options.port === 'number' ? options.port : 443
    this.global = typeof options.global === 'boolean' ? options.global : false
    this.aliases = Array.isArray(options.aliases) ? options.aliases : []
    this.syncHost = options.syncHost
    this.skipDomainReachabilityCheck = options.skipDomainReachabilityCheck

    // Substitute shorthand www alias for full domain.
    this.aliases = this.aliases.map(alias => alias === 'www' ? `www.${Site.hostname}` : alias)

    // Has a proxy server been requested? If so, we flag it and save the port
    // we were asked to proxy. In this case, pathToServe is ignored/unused.
    this.isProxyServer = false
    this.proxyPort = null
    if (typeof options.proxyPort === 'number') {
      this.isProxyServer = true
      this.proxyPort = options.proxyPort
    }

    // Also save a copy of the options.
    this.options = options

    //
    // Create the Express app. We will configure it later.
    //
    this.stats = this.initialiseStatistics()
    this.app = express()

    // Create the HTTPS server.
    this.createServer()
  }


  // Conditionally log to console.
  log(...args) {
    if (process.env.QUIET) {
      return
    }
    console.log(...args)
  }


  // The app configuration is handled in an asynchronous method
  // as there is a chance that we will have to wait for a Hugo
  // build to complete.
  async configureApp () {
    this.startAppConfiguration()

    if (this.isProxyServer) {
      this.configureProxyRoutes()
    } else {
      await this.configureAppRoutes()
    }

    this.endAppConfiguration()
  }


  // Middleware common to both regular servers and proxy servers
  // that go at the start of the app configuration.
  startAppConfiguration() {
    // Express.js security with HTTP headers.
    this.app.use(helmet())

    // Statistics middleware (captures anonymous, ephemeral statistics).
    this.app.use(this.stats.middleware)

    // Logging.
    this.app.use(morgan(function (tokens, req, res) {

      if (process.env.QUIET) {
        return
      }

      let hasWarning = false
      let hasError = false

      let method = tokens.method(req, res)
      if (method === 'GET') method = '↓ GET'
      if (method === 'POST') method = '↑ POST'

      let durationWarning = ''
      let duration = parseFloat(tokens['response-time'](req, res)).toFixed(1)
      if (duration > 500) { durationWarning = ' !'}
      if (duration > 1000) { durationWarning = ' !!'}
      if (durationWarning !== '') {
        hasWarning = true
      }

      duration = `${duration} ms${clr(durationWarning, 'yellow')}`

      if (duration === 'NaN ms') {
        //
        // I’ve only encountered this once (in response to what seems to
        // be a client-side issue with Firefox on Linux possibly related to
        // server-sent events:
        //
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1077089)
        //
        duration = '   -   !'
        hasError = true
      }

      let sizeWarning = ''
      let size = (tokens.res(req, res, 'content-length')/1024).toFixed(1)
      if (size > 500) { sizeWarning = ' !' }
      if (size > 1000) { sizeWarning = ' !!'}
      if (sizeWarning !== '') {
        hasWarning = true
      }

      size = `${size} kb${clr(sizeWarning, 'yellow')}`
      if (size === 'NaN kb') { size = '   -   ' }

      let url = tokens.url(req, res)

      if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.svg') || url.endsWith('.gif')) {
        url = `🌌 ${url}`
      } else if (url.endsWith('.ico')) {
        url = `💠 ${url}`
      }
      else if (url.endsWith('.css')) {
        url = `🎨 ${url}`
      } else if (url.includes('.css?v=')) {
        url = `✨ Live reload (CSS) ${url}`
      } else if (url === '/instant/client/bundle.js') {
        url = `⚡ Live reload script load`
      } else if (url.endsWith('js')) {
        url = `⚡ ${url}`
      } else if (url === '/instant/events') {
        url = `✨ Live reload`
      } else {
        url = `📄 ${url}`
      }

      let status = tokens.status(req, res)

      const statusToTextColour = {
        '404': 'red',
        '304': 'cyan',
        '200': 'green',
      }

      let textColour = statusToTextColour[status]
      if (hasWarning) { textColour = 'yellow' }
      if (hasError) { textColour = 'red' }

      const log = [
        clr(method, textColour),
        '\t',
        clr(status, textColour),
        '\t',
        clr(duration, textColour),
        '\t',
        clr(size, textColour),
        '\t',
        clr(url, textColour),
      ].join(' ')

      return `   💞    ${log}`
    }))

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
          this.log(`   👉    ❨site.js❩ Redirecting alias ${requestedHost} to main hostname ${mainHostname}.`)
          response.redirect(`https://${mainHostname}${request.path}`)
        }
      })
    }

    // Inject an html() method into the response object as a handy utility
    // for both setting the type of the response to HTML and ending it with
    // the passed content. Let’s save some keystrokes. Over time, they can
    // add up to whole lifetimes.
    this.app.use((request, response, next) => {
      (() => {
        const self = response
        response.html = content => {
          self.type('html')
          self.end(content)
        }
      })()
      next()
    })

    // Statistics view (displays anonymous, ephemeral statistics)
    this.app.get(this.stats.route, this.stats.view)
  }


  // Auto detect and support hugo source directories if they exist.
  async addHugoSupport() {

    if (this.syncHost !== undefined) {
      // If about to sync to a remote host, delete the .generated folder so that a full
      // generation can happen as we’re about to deploy.
      const generatedContentPath = path.join(this.absolutePathToServe, '.generated')
      fs.removeSync(generatedContentPath)
    }

    // Hugo source folder names must begin with either
    // .hugo or .hugo--. Anything after the first double-dash
    // specifies a custom mount path (double dashes are converted
    // to forward slashes when determining the mount path).
    const hugoSourceFolderPrefixRegExp = /^.hugo(--)?/

    const files = fs.readdirSync(this.absolutePathToServe)

    for (const file of files) {
      if (file.match(hugoSourceFolderPrefixRegExp)) {

        const hugoSourceDirectory = path.join(this.absolutePathToServe, file)

        let mountPath = '/'
        // Check for custom mount path naming convention.
        if (hugoSourceDirectory.includes('--')) {
          // Double dashes are translated into forward slashes.
          const fragments = hugoSourceDirectory.split('--')

          // Discard the first '.hugo' bit.
          fragments.shift()

          const _mountPath = fragments.reduce((accumulator, currentValue) => {
            return accumulator += `/${currentValue}`
          }, /* initial value = */ '')

          mountPath = _mountPath
        }

        if (fs.existsSync(hugoSourceDirectory)) {

          const serverDetails = clr(`${file}${path.sep}`, 'green') + clr(' → ', 'cyan') + clr(`https://${this.prettyLocation()}${mountPath}`, 'green')
          this.log(`   🎠    ❨site.js❩ Starting Hugo server (${serverDetails})`)

          if (this.hugo === null || this.hugo === undefined) {
            this.hugo = new Hugo(path.join(Site.settingsDirectory, 'node-hugo'))
          }

          const sourcePath = path.join(this.pathToServe, file)
          const destinationPath = `../.generated${mountPath}`

          const localBaseURL = `https://localhost${mountPath}`
          const globalBaseURL = `https://${Site.hostname}${mountPath}`
          let baseURL = this.global ? globalBaseURL : localBaseURL

          // If a syncHost is provided (because we are about to sync), that overrides the calculated base
          // URL as we are generating the content not for localhost or the current machine’s hostname but
          // for the remote machine’s host name.
          let buildDrafts = true
          if (this.syncHost !== undefined) {
            baseURL = `https://${this.syncHost}`

            // Also, if syncing to a remote host, do NOT build drafts as we do not want to publish drafts.
            buildDrafts = false
          }

          // Start the server and await the end of the build process.
          let hugoServerProcess, hugoBuildOutput
          try {
            const response = await this.hugo.serve(sourcePath, destinationPath, baseURL, buildDrafts)
            hugoServerProcess = response.hugoServerProcess
            hugoBuildOutput = response.hugoBuildOutput
          } catch (error) {
            let errorMessage = error

            if (errorMessage.includes('--appendPort=false not supported when in multihost mode')) {
              errorMessage = 'Hugo’s Multilingual Multihost mode is not supported in Site.js.'
            }

            this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not start Hugo server. ${errorMessage}\n`)
            process.exit(1)
          }

          // At this point, the build process is complete and the .generated folder should exist.

          // Listen for standard output and error output on the server instance.
          hugoServerProcess.stdout.on('data', (data) => {
            const lines = data.toString('utf-8').split('\n')
            lines.forEach(line => this.log(`${Site.HUGO_LOGO} ${line}`))
          })

          hugoServerProcess.stderr.on('data', (data) => {
            const lines = data.toString('utf-8').split('\n')
            lines.forEach(line => {
              this.log(`${Site.HUGO_LOGO} [ERROR] ${line}`)

              if (line.includes('panic: runtime error: index out of range [1] with length 1')) {
                this.log('\n   📎    ❨site.js❩ Looks like you configured Multilingual Multihost mode in Hugo. This is not supported.\n')
              }
            })
          })

          // Save a reference to all hugo server processes so we can
          // close them later and perform other cleanup.
          if (this.hugoServerProcesses === null || this.hugoServerProcesses === undefined) {
            this.hugoServerProcesses = []
          }
          this.hugoServerProcesses.push(hugoServerProcess)

          // Print the output received so far.
          hugoBuildOutput.split('\n').forEach(line => {
            this.log(`${Site.HUGO_LOGO} ${line}`)
          })
        }
      }
    }
  }

  // Middleware and routes that are unique to regular sites
  // (not used on proxy servers).
  async configureAppRoutes () {
    // Ensure that the requested path to serve actually exists.
    if (!fs.existsSync(this.absolutePathToServe)) {
      throw new errors.InvalidPathToServeError(`Path ${this.pathToServe} does not exist.`)
    }

    // Async
    await this.addHugoSupport()

    // Continue configuring the rest of the app routes.
    this.add4042302Support()
    this.addCustomErrorPagesSupport()

    // Add routes
    this.appAddTest500ErrorPage()
    this.appAddDynamicRoutes()
    this.appAddStaticRoutes()
    this.appAddWildcardRoutes()
    this.appAddArchivalCascade()
  }


  // Middleware unique to proxy servers.
  // TODO: Refactor: Break this method up. []
  configureProxyRoutes () {

    const proxyHttpUrl = `http://localhost:${this.proxyPort}`
    const proxyWebSocketUrl = `ws://localhost:${this.proxyPort}`

    let prettyLog = function (message) {
      this.log(`   🔁    ❨site.js❩ ${message}`)
    }
    prettyLog = prettyLog.bind(this)

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

  // Creates a web socket server.
  createWebSocketServer () {
    expressWebSocket(this.app, this.server, { perMessageDeflate: false })
  }

  // Create the server. Use this first to create the server and add the routes later
  // so that you can support asynchronous tasks (e.g., generating a Hugo site).
  createServer () {
    // Check for a valid port range
    // (port above 49,151 are ephemeral ports. See https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Dynamic,_private_or_ephemeral_ports)
    if (this.port < 0 || this.port > 49151) {
      throw new Error('Error: specified port must be between 0 and 49,151 inclusive.')
    }

    // Create the server.
    this.server = this._createServer({global: this.global}, this.app)

    // Enable the ability to destroy the server (close all active connections).
    enableDestroy(this.server)

    this.server.on('close', async () => {
      // Clear the auto update check interval.
      if (this.autoUpdateCheckInterval !== undefined) {
        clearInterval(this.autoUpdateCheckInterval)
        this.log('   ⏰    ❨site.js❩ Cleared auto-update check interval.')
      }

      if (this.app.__fileWatcher !== undefined) {
        try {
          await this.app.__fileWatcher.close()
          this.log (`   🚮    ❨site.js❩ Removed file watcher.`)
        } catch (error) {
          this.log(`   ❌    ❨site.js❩ Could not remove file watcher: ${error}`)
        }
      }

      // Ensure that the static route file watchers are removed.
      if (this.app.__staticRoutes !== undefined) {
        await new Promise((resolve, reject) => {
          this.app.__staticRoutes.cleanUp(() => {
            this.log('   🚮    ❨site.js❩ Live reload file system watchers removed from static web routes on server close.')
            resolve()
          })
        })
      }

      if (globalThis._db) {
        this.log('   🚮    ❨site.js❩ Closing database.')
        await globalThis._db.close()
      }

      this.log('   🚮    ❨site.js❩ Housekeeping is done!')
      this.eventEmitter.emit('housekeepingIsDone')
    })
  }

  // Finish configuring the app. These are the routes that come at the end.
  // (We need to add the WebSocket (WSS) routes after the server has been created).
  endAppConfiguration () {
    // Create the file watcher to watch for changes on dynamic and wildcard routes.
    this.createFileWatcher()

    // If we need to load dynamic routes from a routesJS file, do it now.
    if (this.routesJsFile !== undefined) {
      this.createWebSocketServer()
      const routesJSFilePath = path.resolve(this.routesJsFile)
      decache(routesJSFilePath)
      require(routesJSFilePath)(this.app)
    }

    // If there are WebSocket routes, create a regular WebSocket server and
    // add the WebSocket routes (if any) to the app.
    if (this.wssRoutes !== undefined) {
      this.createWebSocketServer()
      this.wssRoutes.forEach(route => {
        this.log(`   🐁    ❨site.js❩ Adding WebSocket (WSS) route: ${route.path}`)
        decache(route.callback)
        this.app.ws(route.path, require(route.callback))
      })
    }

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
        this.log(`   ♻    ❨site.js❩ 404 → 302: Forwarding to ${forwardingURL}`)
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
    const statisticsRouteSettingFile = path.join(Site.settingsDirectory, 'statistics-route')
    return new Stats(statisticsRouteSettingFile)
  }


  // Returns an https server instance configured with your locally-trusted TLS
  // certificates by default. If you pass in {global: true} in the options object,
  // globally-trusted TLS certificates are obtained from Let’s Encrypt.
  //
  // Note: if you pass in a key and cert in the options object, they will not be
  // ===== used and will be overwritten.
  _createServer (options = {}, requestListener = undefined) {
    const requestsGlobalCertificateScope = options.global === true

    if (requestsGlobalCertificateScope) {
      this.log('   🌍    ❨site.js❩ Using globally-trusted certificates.')

      // Let’s be nice and not continue to pollute the options object
      // with our custom property (global).
      delete options.global

      // Certificates are automatically obtained for the hostname and the www. subdomain of the hostname
      // for the machine that we are running on.
      let domains = [Site.hostname]

      // If additional aliases have been specified, add those to the domains list.
      domains = domains.concat(this.aliases)
      options.domains = domains

      // Display aliases we’re responding to.
      if (this.aliases.length > 0) {
        const listOfAliases = this.aliases.reduce((prev, current) => {
          return `${prev}${current}, `
        }, '').slice(0, -2)
        this.log(`   👉    ❨site.js❩ Aliases: also responding for ${listOfAliases}.`)
      } else {
        this.log(`   👉    ❨site.js❩ No aliases. Only responding for ${Site.hostname}.`)
      }
    } else {
      this.log('   🚧    ❨site.js❩ Using locally-trusted certificates.')
    }

    // Specify custom certificate directory for Site.js.
    options.settingsPath = path.join(os.homedir(), '.small-tech.org', 'site.js', 'tls')

    // Create and return the HTTPS server.
    return https.createServer(options, requestListener)
  }


  // There is no use in starting a server if the domains it will be serving on are not reachable.
  // If we do, this can lead to all sorts of pain later on. Much better to inform the person early on
  // that there is a problem with the domain (possibly a typo or a DNS issue) and to go no further.
  async ensureDomainsAreReachable () {
    // Note: spacing around this emoji is correct. It requires less than the others.
    this.log('   🧚‍♀️  ❨site.js❩ Ensuring domains are reachable before starting global server.')

    const reachabilityMessage = 'site.js-domain-is-reachable'
    const preFlightCheckServer = http.createServer((request, response) => {
      response.statusCode = 200
      response.end(reachabilityMessage)
    })

    await new Promise((resolve, reject) => {
      try {
        preFlightCheckServer.listen(80, () => {
          this.log('   ✨    ❨site.js❩ Pre-flight domain reachability check server started.')
          resolve()
        })
      } catch (error) {
        this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Pre-flight domain reachability server could not be started.\n`)
        process.exit(1)
      }
    })

    const domainsToCheck = [Site.hostname].concat(this.aliases)

    await asyncForEach(
      domainsToCheck,
      async domain => {
        try {
          this.log (`   ✨    ❨site.js❩ Attempting to reach domain ${domain}…`)
          const domainCheck = prepareRequest('GET', 'string', `http://${domain}`)
          const response = await domainCheck()
          if (response !== reachabilityMessage) {
            // If this happens, there is most likely another site running at this domain.
            // We cannot continue.
            let responseToShow = response.length > 100 ? 'response is too long to show' : response
            if (response.includes('html')) {
              responseToShow = `${responseToShow.replace('is', 'looks like HTML and is')}`
            }
            this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Got unexpected response from ${domain} (${responseToShow}).\n`)
            process.exit(1)
          }
          this.log (`   💖    ❨site.js❩ ${domain} is reachable.`)
        } catch (error) {
          // The site is not reachable. We cannot continue.
          this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Domain ${domain} is not reachable. (${error.toString().replace(/Error.*?: /, '')})\n`)

          process.exit(1)
        }
      }
    )

    await new Promise((resolve, reject) => {
      preFlightCheckServer.close(() => {
        resolve()
      }, error => {
        this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not close the pre-flight domain reachability server.\n`)
        process.exit(1)
      })
    })

    this.log('   ✨    ❨site.js❩ Pre-flight domain reachability check server stopped.')
  }


  // Starts serving the site (or starts the proxy server).
  //   • callback: (function) the callback to call once the server is ready (defaults are provided).
  //
  // Can throw.
  async serve (callback) {
    // Before anything else, if this is a global server, let’s ensure that the domains we are trying to support
    // are reachable. If it is not, we will be prevented from going any further.
    // Note: this feature can be disabled by specifying the --skip-domain-reachability-check flag.
    if (this.global) {
      if (this.skipDomainReachabilityCheck !== true) {
        await this.ensureDomainsAreReachable()
      } else {
        this.log('\n   🐇    ❨site.js❩ Skipping domain reachability check as requested.')
      }
    }

    // Before starting the server, we have to configure the app. We do this here
    // instead of in the constructor since the process might have to wait for the
    // Hugo build process to complete.
    await this.configureApp()

    // If a JavaScript Database (JSDB) database exists for the current app, load it in right now (since this is a
    // relatively slow process, we want it to happen at server start, not while the server is up and running and during
    // a request.). If a database doesn’t already exist, we don’t want to pollute the project directory with a database
    // directory unnecessarily so we  create a global property accessor to instantiates a database instance on first
    // attempt to access it.
    if (!this.isProxyServer) {
      if (fs.existsSync(this.databasePath)) {
        // We still create the _db property so we can use that to check if a database exist during graceful shutdown
        // instead of possibly accessing the accessor defined in the other branch of this conditional, thereby
        // triggering it to be created when all we want to do is perform housekeeping.
        globalThis._db = JSDB.open(this.databasePath)
        globalThis.db = globalThis._db
      } else {
        // We check for existence first as the property will already exist if this is a server restart.
        if (!globalThis.db) {
          Object.defineProperty(globalThis, 'db', {
            get: (function () {
              if (!globalThis._db) {
                this.log('\n   💾    ❨site.js❩ Lazily creating database.')
                globalThis._db = JSDB.open(this.pathToServe)
                this.log('\n   💾    ❨site.js❩ Database ready.')
              }
              return globalThis._db
            }).bind(this)
          })
        }
      }
    }

    if (typeof callback !== 'function') {
      callback = this.isProxyServer ? this.proxyCallback : this.regularCallback
    }

    // Handle graceful exit.
    this.goodbye = (done) => {
      this.log('\n   💃    ❨site.js❩ Preparing to exit gracefully, please wait…')

      if (this.hugoServerProcesses) {
        this.log('   🚮    ❨site.js❩ Killing Hugo server processes.')
        this.hugoServerProcesses.forEach(hugoServerProcess => hugoServerProcess.kill())
      }

      // Close all active connections on the server.
      // (This is so that long-running connections – e.g., WebSockets – do not block the exit.)
      this.server.destroy(() => {
        // OK, it’s time to go :)
        this.log('\n   💕    ❨site.js❩ Goodbye!\n')
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

      // Auto updates.
      //
      // If we’re running in production, set up a timer to periodically check for
      // updates and perform them if necessary.
      if (process.env.NODE_ENV === 'production') {

        const checkForUpdates = () => {
          this.log('   🛰    ❨site.js❩ Running auto update check…')

          const options = {env: process.env, stdio: 'inherit'}

          let appReference = process.title
          if (appReference.includes('node')) {
            appReference = `${appReference} ${path.join(__dirname, 'bin', 'site.js')}`
          }
          const updateCommand = `${appReference} update --dont-log-app-name-and-version`
          childProcess.exec(updateCommand, options, (error, stdout, stderr) => {
            if (error !== null) {
              this.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not check for updates.\n`, error)
            } else {
              this.log(stdout)
            }
          })
        }

        this.log('   ⏰    ❨site.js❩ Setting up auto-update check interval.')
        // Regular and alpha releases check for updates every 6 hours.
        // (You  should not be deploying servers using the alpha release channel.)
        let hours = 6
        let minutes = 60
        if (Site.releaseChannel === Site.RELEASE_CHANNEL.beta) {
          // Beta releases check for updates every 10 minutes.
          hours = 1
          minutes = 10
        }
        this.autoUpdateCheckInterval = setInterval(checkForUpdates, /* every */ hours * minutes * 60 * 1000)

        // And perform an initial check a few seconds after startup.
        setTimeout(checkForUpdates, 3000)
      }
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
    this.log(`\n   📊    ❨site.js❩ For statistics, see https://${location}${this.stats.route}\n`)
  }


  // Callback used in regular servers.
  regularCallback (server) {
    const location = this.prettyLocation()
    const prettyPathToServe = this.pathToServe === '.' ? 'current directory' : this.pathToServe
    this.log(`   🎉    ❨site.js❩ Serving ${clr(prettyPathToServe, 'cyan')} on ${clr(`https://${location}`, 'green')}`)
    this.showStatisticsUrl(location)
  }


  // Callback used in proxy servers.
  proxyCallback (server) {
    const location = this.prettyLocation()
    this.log(`   🚚    ❨site.js❩ Proxying: HTTP/WS on localhost:${this.proxyPort} ←→ HTTPS/WSS on ${location}`)
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
    const instantOptions = { watch: ['html', 'js', 'css', 'svg', 'png', 'jpg', 'jpeg'] }

    const roots = []

    // Serve any generated static content (e.g., Hugo output) that might exist.
    const generatedStaticFilesDirectory = path.join(this.pathToServe, '.generated')
    if (fs.existsSync(generatedStaticFilesDirectory)) {
      this.log(`   🎠    ❨site.js❩ Serving generated static files.`)
      roots.push(generatedStaticFilesDirectory)
    }

    // Add the regular static web root.
    roots.push(this.pathToServe)

    this.app.__staticRoutes = instant(roots, instantOptions)
    this.app.use(this.app.__staticRoutes)
  }


  // Restarts the server.
  async restartServer () {
    if (process.env.NODE_ENV === 'production') {
      // We’re running production, to restart the daemon, just exit.
      // (We let ourselves fall, knowing that systemd will catch us.) ;)
      process.exit()
    } else {
      // We’re running as a regular process. Just restart the server, not the whole process.
      if (this.restartingRegularProcess) {
        this.log('   🙈    ❨site.js❩ Server restart requested while one is already in process. Ignoring…')
        return
      }

      this.restartingRegularProcess = true

      // Do some housekeeping.
      Graceful.off('SIGINT', this.goodbye)
      Graceful.off('SIGTERM', this.goodbye)

      if (this.hugoServerProcesses) {
        this.log('   🚮    ❨site.js❩ Killing Hugo server processes.')
        this.hugoServerProcesses.forEach(hugoServerProcess => hugoServerProcess.kill())
      }

      // Wait until housekeeping is done cleaning up after the server is destroyed before
      // restarting the server.
      this.eventEmitter.on('housekeepingIsDone', async () => {
        // Restart the server.
        this.eventEmitter.removeAllListeners()
        this.log('\n   🐁    ❨site.js❩ Restarting server…\n')
        const {commandPath, args} = cli.initialise(process.argv.slice(2))
        const newSite = new Site(this.options)
        await newSite.serve(args)
        this.log('\n   🐁    ❨site.js❩ Server restarted.\n')
        this.restartingRegularProcess = false
        delete this
      })

      // Destroy the current server (so we do not get a port conflict on restart before
      // we’ve had a chance to terminate our own process).
      this.server.destroy(() => {
        this.log('\n   🐁    ❨site.js❩ Server destroyed.\n')
        this.server.removeAllListeners()
      })
    }
  }

  // Returns a pretty human-readable string describing the file watcher change reflected in the event.
  prettyFileWatcherEvent (event) {
    return ({
      'add': 'file added',
      'addDir': 'directory added',
      'change': 'file changed',
      'unlink': 'file deleted',
      'unlinkDir': 'directory deleted'
    }[event])
  }

  // Creates a file watcher to restart the server if a dynamic or wildcard route changes.
  // (Changes to static files do not cause a server restart and are handled by the instant module
  // with live reload.)
  //
  // Note: Chokidar appears to have an issue where changes are no longer picked up if
  // ===== a created folder is then removed. This should not be a big problem in actual
  //       usage, but let’s keep an eye on this. (Note that if you listen for the 'raw'
  //       event, it gets triggered with a 'rename' when a removed/recreated folder
  //       is affected.) See: https://github.com/paulmillr/chokidar/issues/404#issuecomment-666669336
  createFileWatcher () {

    // Workaround for #227: https://source.small-tech.org/site.js/app/-/issues/227
    //
    // When the app is wrapped with Nexe, if the path to serve is the current path, Chokidar doesn’t pick up
    // changes (e.g., to ./**/*). However, it does if a relative path is specified. So, as a workaround, we target
    // ../<name of current folder>/**/* instead.
    // (This also means we can look for changes to /.dynamic and /.wildcard instead of just .dynamic and .wildcard
    // and this gives us a little bit more safety in case those terms are found as part of a file name somewhere.)
    const relativePath = this.pathToServe === '.' ? (() => {
      const pathFragments = path.resolve('.').split(path.sep)
      const currentDirectoryName = pathFragments[pathFragments.length - 1]
      return `../${currentDirectoryName}`
    })() : this.pathToServe

    const fileWatchPath = `${relativePath.replace(/\\/g, '/')}/**/*`

    this.app.__fileWatcher = chokidar.watch(fileWatchPath, {
      persistent: true,
      ignoreInitial: true
    })

    this.app.__fileWatcher.on ('all', async (event, file) => {
      if (file.includes('/.dynamic')) {
        //
        // Dynamic route change.
        //
        this.log(`   🐁    ❨site.js❩ Dynamic route change: ${clr(`${this.prettyFileWatcherEvent(event)}`, 'green')} (${clr(file, 'cyan')}).`)
        this.log('\n   🐁    ❨site.js❩ Requesting restart…\n')
        await this.restartServer()
      } else if (file.includes('/.wildcard')) {
        //
        // Wildcard route change.
        //
        this.log(`   🐁    ❨site.js❩ Wildcard route change: ${clr(`${this.prettyFileWatcherEvent(event)}`, 'green')} (${clr(file, 'cyan')}).`)
        this.log('\n   🐁    ❨site.js❩ Requesting restart…\n')
        await this.restartServer()
      }
    })

    this.log('   🐁    ❨site.js❩ Watching for changes to dynamic and wildcard routes.')
  }


  // Add wildcard routes.
  //
  // Wildcard routes are static routes where any path under https://your.site/x will route to .wildcard/x/index.html
  // if that file exists. So, for example, https://your.site/x/y, https://your.site/x/y/z, etc., will all route to the
  // same static file. Use this if you want to allow path-style arguments in your URLs but carry out client-side
  // processing. This saves you from having to create .dynamic routes for that use case.
  appAddWildcardRoutes () {
    const wildcardRoutesDirectory = path.join(this.pathToServe, '.wildcard')

    const wildcards = {}

    if (fs.existsSync(wildcardRoutesDirectory)) {

      fs.readdirSync(wildcardRoutesDirectory, {withFileTypes: true}).forEach(file => {
        let wildcard = file.name

        let wildcardFilePath
        let wildcardFilePathPretty
        if (file.isDirectory(wildcard)) {
          wildcardFilePath = path.join(wildcardRoutesDirectory, wildcard, 'index.html')
          wildcardFilePathPretty = `${wildcard}/index.html`
        } else {
          if (!wildcard.endsWith('.html')) {
            this.log(`   ❗    ❨site.js❩ Non-HTML file (${wildcard}) found in wildcards directory, ignoring.`)
            return // from forEach.
          } else {
            wildcardFilePath = path.join(wildcardRoutesDirectory, wildcard)
            wildcardFilePathPretty = wildcard
            wildcard = wildcard.replace('.html', '')
          }
        }

        if (fs.existsSync(wildcardFilePath)) {
          this.log(`   🃏    ❨site.js❩ Serving wildcard route: ${clr(`https://${this.prettyLocation()}/${wildcard}/**/*`, 'green')} → ${clr(`/.wildcard/${wildcardFilePathPretty}`, 'cyan')}`)

          // Read the HTML content and inject some javascript to make it easy to access the route
          // name and the arguments from window.route and and window.arguments.
          wildcards[wildcard] = fs.readFileSync(wildcardFilePath, 'utf-8').replace('<body>', `
            <body>
            <script>
              // Site.js: add window.routeName and window.arguments objects to wildcard route.
              __site_js__pathFragments =  document.location.pathname.split('/')
              window.route = __site_js__pathFragments[1]
              window.arguments = __site_js__pathFragments.slice(2).filter(value => value !== '')
              delete __site_js__pathFragments
            </script>
          `)

          this.app.use(`/${wildcard}`, (() => {
            // Capture the current wildcard
            const __wildcard = wildcard
            return (request, response, next) => {
              const pathFragments = request.path.split('/')
              if (pathFragments.length >= 2 && pathFragments[1] !== '') {
                // OK, we have a sub-path, so serve the wildcard.
                response
                  .type('html')
                  .end(wildcards[__wildcard])
              } else {
                // No sub-path, ignore this request.
                next()
              }
            }
          })())
        } else {
          // We found a directory inside of the .wildcard directory but it doesn’t have an index.html
          // file inside it with the content to serve. Warn the person.
          this.log(`   ❗    ❨site.js❩ Wilcard directory found at /.wildcard/${wildcard} but there is no index.html inside it. Ignoring…`)
        }
      })
    }
  }

  // Add dynamic routes, if any, if a <pathToServe>/.dynamic/ folder exists.
  // If there are errors in any of your dynamic routes, you will get 500 (server) errors.
  //
  // Each of the routing conventions are mutually exclusive and applied according to the following precedence rules:
  //
  // 1. Advanced _routes.js_-based advanced routing.
  //
  // 2. Separate folders for _.https_ and _.wss_ routes routing (the _.http_ folder itself will apply
  // precedence rules 3 and 4 internally).
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
            this.log(`   🐁    ❨site.js❩ Adding HTTPS GET route: ${route.path}`)

            // Ensure we are loading a fresh copy in case it has changed.
            decache(route.callback)
            try {
              this.app.get(route.path, require(route.callback))
            } catch (error) {
              if (error.message.includes('requires a callback function but got a [object Object]')) {
                console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could not find callback in route ${route.path}\n\n         ❨site.js❩ ${clr('Hint:', 'green')} Make sure your DotJS routes include a ${clr('module.exports = (request, response) => {}', 'cyan')} declaration.\n`)
              } else {
                console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} ${error}`)
              }
              process.exit()
            }
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
          this.log('   🐁    ❨site.js❩ Found .get/.post folders. Will load dynamic routes from there.')
          if (httpsGetRoutesDirectoryExists) {
            loadHttpsGetRoutesFrom(httpsGetRoutesDirectory)
          }
          if (httpsPostRoutesDirectoryExists) {
            // Load HTTPS POST routes.

            addBodyParser()

            const httpsPostRoutes = getRoutes(httpsPostRoutesDirectory)
            httpsPostRoutes.forEach(route => {
              this.log(`   🐁    ❨site.js❩ Adding HTTPS POST route: ${route.path}`)
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
        this.log('   🐁    ❨site.js❩ Found routes.js file, will load dynamic routes from there.')
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
        this.log('   🐁    ❨site.js❩ Found .https/.wss folders. Will load dynamic routes from there.')
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


  // Check if we should implement an archival cascade.
  //
  // As of 12.11.0, the preferred method of setting up an archival
  // cascade is to include the archives in the root directory of your
  // site while conforming to the following naming convention:
  //
  // .archive-1, .archive-2, etc.
  //
  // The routes in the archives will be served in the order indicated
  // by their index.
  //
  // To illustrate: In the above example, if we get a 404, we will
  // try to find the path in .archive-2 and then in .archive-1. The idea
  // is that .archive-\d+ are static archives of older versions of
  // the site and they are being served in order to maintain an
  // evergreen web where we try not to break existing links. If the
  // current site has a path, it will override .archive-2 and .archive-1.
  // If .archive-2 has a path, it will override .archive-1 and so
  // on. In terms of latest version to oldest version, the order is
  // the current site, site-archive-2, site-archive-1.
  //
  // Legacy usage (pre Site.js version 12.11.0) [Deprecated.]
  //
  // The archives would be specified according to the following folder structure:
  //
  // |-site
  // |- site-archive-2
  // |- site-archive-1
  //
  // The archive cascade was automatically created by naming and location
  // convention. If the folder that is being served is called
  // my-lovely-site, then the archive folders we would look for are
  // my-lovely-site-archive-1, etc.
  //
  // Note: this legacy method is still supported by deprecated. Please migrate
  // ===== your sites to use the new method as this method will be removed
  //       in a future release.
  appAddArchivalCascade () {
    let archivalCascade = []
    const absolutePathToServe = this.absolutePathToServe

    // New method. Check for folders called .archive-\d+ in the folder being
    // served. This is a simpler method in general and, practically, easier
    // to deploy and projects feel better encapsulated.

    const fileNames = fs.readdirSync(absolutePathToServe)

    // Filter directories that match the naming convention.
    archivalCascade = fileNames.filter(fileName => {
      const matchesNamingConvention = fileName.match(/^.archive-\d+$/)
      if (matchesNamingConvention) {
        const fileStats = fs.statSync(path.join(absolutePathToServe, fileName))
        return fileStats.isDirectory()
      } else {
        return false
      }
    })

    if (archivalCascade.length === 0) {
      //
      // No archives found; try the legacy method.
      //

      // (Windows uses forward slashes in paths so write the RegExp accordingly for that platform.)
      const pathName = process.platform === 'win32' ? absolutePathToServe.match(/.*\\(.*?)$/)[1] : absolutePathToServe.match(/.*\/(.*?)$/)[1]

      if (pathName !== '') {
        let archiveLevel = 0
        do {
          archiveLevel++
          const archiveDirectory = path.resolve(absolutePathToServe, '..', `${pathName}-archive-${archiveLevel}`)
          if (fs.existsSync(archiveDirectory)) {
            // Archive exists, add it to the archive cascade.
            archivalCascade.push(archiveDirectory)
          } else {
            // Archive does not exist.
            break
          }
        } while (true)

        // We will implement the cascade in reverse (from highest archive number to the
        // lowest, with latter versions overriding earlier ones), so reverse the list.
        archivalCascade.reverse()
      }
    }

    // Serve the archive cascade (if there is one).
    // Note: for the archive cascade, we use express.static instead of instant as, by the
    // ===== nature of it being an archive, live reload should not be a requirement.
    let archiveNumber = 0
    archivalCascade.forEach(archivePath => {
      archiveNumber++
      this.log(`   🌱    ❨site.js❩ Evergreen web: serving archive #${archiveNumber}`)
      this.app.use(express.static(archivePath.startsWith('/') ? archivePath : (process.platform === 'win32' ? archivePath : path.join(absolutePathToServe, archivePath))))
    })
  }
}


module.exports = Site
