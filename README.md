# https-server

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).

## Design goals

  * ✔ Command-line app
  * ✔ Easy integration with Express, etc.
  * To-do: Seamless switch to using ACME/Let’s Encrypt in production

## Installation

```sh
npm i -g @ind.ie/https-server
```

## Usage

### Commandline

```sh
https-server [folder-to-serve] [port]
```

Both arguments are optional. Currently, if you want to specify the port manually, you must also specify the folder-to-serve.

  * `[folder-to-serve]` defaults to `.` (the current directory)
  * `[port]` defaults to 443 (automatically privileges Node.js to bind to it on Linux. This is not an issue on macOS & Windows.)

If you do not already have TLS certificates, they will be created for you automatically using [nodecert](https://source.ind.ie/hypha/tools/nodecert).

All dependencies will be installed automatically for you if they do not exist if you have apt, pacman, or yum (untested) on Linux or if you have [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (untested) on macOS.

### API

http-server provides a `createServer` method that behaves like the built-in _https_ module’s createServer function so anywhere you use `https.createServer`, you can simply replace it with `httpsServer.createServer`.

### createServer([options], [requestListener])

  * options: [(Object)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Accepts options from [tls.createServer()](https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener), [tls.createSecureContext()](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) and [http.createServer()](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener). Populates the `cert` and `key` properties from the automatically-created [nodecert](https://source.ind.ie/hypha/tools/nodecert/) certificates and will overwrite them if they exist in the options object you pass in.

  * requestListener: [(Function)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) A listener to be added to the 'request' event.

  * Returns: [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with locally-trusted certificates.

#### Example

```js
const httpsServer = require('https-server')
const express = require('express')

const app = express()
app.use(express.static('.'))

const options = {} // (optional) customise your server
const server = httpsServer.createServer(options, app).listen(443, () => {
  console.log(` 🎉 Serving on https://localhost\n`)
})
```

### serve([pathToServe], [port])

  * pathToServe: [(string)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/string) path to serve using [Express](http://expressjs.com/).static.

  * port: [(number)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) the port to serve on. Defaults to 443. (On Linux, privileges to bind to the port are automatically obtained for you.)

#### Example

```js
const httpsServer = require('https-server')

// Serve the current directory over https://localhost
const server = httpsServer.serve()
```

## Help wanted

I can use your help to test https-server on other the following platforms:

  * Windows 64-bit (should work without requiring any dependencies)
  * Linux with yum
  * macOS with MacPorts

Please [let me know how/if it works](https://github.com/indie-mirror/https-server/issues). Thank you!

## Thanks

  * [thagoat](https://github.com/thagoat) for confirming that [installation works on Arch Linux with Pacman](https://github.com/indie-mirror/https-server/issues/1).
