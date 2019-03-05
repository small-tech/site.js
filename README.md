# https-server

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).


## Installation

```sh
npm i -g @ind.ie/https-server
```


## Usage


### Commandline

```sh
https-server [folder-to-serve] [--port N]
```

All arguments are optional. By default, a secure HTTPS server will be created to serve the current folder over port 443.

If you do not already have TLS certificates, they will be created for you automatically using [nodecert](https://source.ind.ie/hypha/tools/nodecert).

All dependencies will be installed automatically for you if they do not exist if you have apt, pacman, or yum (untested) on Linux or if you have [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (untested) on macOS.


### API

__https-server__ provides a `createServer` method that behaves like the built-in _https_ module’s `createServer` function so anywhere you use `https.createServer`, you can simply replace it with `httpsServer.createServer`.


#### createServer([options], [requestListener])

  - __options__ _(object)___:__ see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener). Populates the `cert` and `key` properties from the automatically-created [nodecert](https://source.ind.ie/hypha/tools/nodecert/) certificates and will overwrite them if they exist in the options object you pass in.

  - __requestListener__ _(function)___:__ see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener).

  - ___Returns:___ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with locally-trusted certificates.

##### Example

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

#### serve([pathToServe], [callback], [port])

  - __pathToServe__ _(string)___:__ the directory to serve using [Express](http://expressjs.com/).static.

  - __callback__ _(function)___:__ a function to be called when the server is ready. If you do not specify a callback, you can specify the port as the second argument.

  - __port__ _(number)___:__ the port to serve on. Defaults to 443. (On Linux, privileges to bind to the port are automatically obtained for you.)

  - ___Returns:___ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with locally-trusted certificates.


##### Example

```js
const httpsServer = require('https-server')

// Serve the current directory over https://localhost
const server = httpsServer.serve()
```

## Help wanted

I can use your help to test https-server on other the following platforms:

  - Windows 64-bit (should work without requiring any dependencies)
  - Linux with yum
  - macOS with MacPorts

Please [let me know how/if it works](https://github.com/indie-mirror/https-server/issues). Thank you!

## TODO

  - Command-line app. ✔
  - Easy integration with Express, etc. ✔
  - To-do: Seamless switch to using ACME/Let’s Encrypt in production.

## Thanks

  * [thagoat](https://github.com/thagoat) for confirming that [installation works on Arch Linux with Pacman](https://github.com/indie-mirror/https-server/issues/1).
