# HTTPS Server

HTTPS Server is a secure [Small Tech](https://ar.al/2019/03/04/small-technology/) personal web server for seamless development and live use.

HTTP Server uses [nodecert](https://source.ind.ie/hypha/tools/nodecert) for seamless locally-trusted TLS certificate provisioning and use during development and [ACME TLS](https://source.ind.ie/hypha/tools/acme-tls) for seamless globally-trusted [Let’s Encrypt](https://letsencrypt.org/) TLS certificate provisioning and use on live environments.


## Install

```sh
npm i -g @ind.ie/https-server
```


## Use

### Command-line

```sh
https-server [folder-to-serve] [--port N] [--global] [--version]
```

All command-line arguments are optional. By default, an HTTPS server with locally-trusted certificates will be created for you to serve the current folder over port 443.

If you do not already have TLS certificates, they will be created for you automatically using [nodecert](https://source.ind.ie/hypha/tools/nodecert).

All dependencies are installed automatically for you if they do not exist if you have apt, pacman, or yum (untested) on Linux or if you have [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (untested) on macOS.

If you specify the `--global` flag, globally-trusted Let’s Encrypt TLS certificates are automatically provisioned for you using ACME-TLS the first time you hit your hostname. The hostname for the certificates is automatically set from the hostname of your system (and the _www._ subdomain is also automatically provisioned).

### API

HTTPS Server’s `createServer` method behaves like the built-in _https_ module’s `createServer` function. Anywhere you use `https.createServer`, you can simply replace it with `httpsServer.createServer`.


#### createServer([options], [requestListener])

  - __options__ _(object)___:__ see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener). Populates the `cert` and `key` properties from the automatically-created [nodecert](https://source.ind.ie/hypha/tools/nodecert/) or Let’s Encrypt certificates and will overwrite them if they exist in the options object you pass in. If your options has `options.global = true` set, globally-trusted TLS certificates are obtained from Let’s Encrypt using ACME TLS.

  - __requestListener__ _(function)___:__ see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener). If you don’t pass a request listener, HTTPS Server will use its default one.

    __Returns:__ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with either locally-trusted certificates via nodecert or globally-trusted ones from Let’s Encrypt.

##### Example

```js
const httpsServer = require('https-server')
const express = require('express')

const app = express()
app.use(express.static('.'))

const options = {} // to use globally-trusted certificates instead, set this to {global: true}
const server = httpsServer.createServer(options, app).listen(443, () => {
  console.log(` 🎉 Serving on https://localhost\n`)
})
```

#### serve([options])

Options is an optional parameter object that may contain the following properties, all optional:

  - __path__ _(string)___:__ the directory to serve using [Express](http://expressjs.com/).static.

  - __callback__ _(function)___:__ a function to be called when the server is ready. If you do not specify a callback, you can specify the port as the second argument.

  - __port__ _(number)___:__ the port to serve on. Defaults to 443. (On Linux, privileges to bind to the port are automatically obtained for you.)

  - __global__ _(boolean)___:__ if true, globally-trusted Let’s Encrypt certificates will be provisioned (if necesary) and used via ACME TLS. If false (default), locally-trusted certificates will be provisioned (if necesary) and used using nodecert.

    __Returns:__ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with either locally or globally-trusted certificates.


##### Example

Using locally-trusted TLS certificates:

```js
const httpsServer = require('https-server')

// Serve the current directory over https://localhost
const server = httpsServer.serve()
```

Using globally-trusted TLS certificates:

```js
const httpsServer = require('https-server')

// Serve the current directory over https://localhost
const server = httpsServer.serve({global: true})
```

## Help wanted

I can use your help to test HTTPS Server on the following platform/package manager combinations:

  - Linux with yum
  - macOS with MacPorts

Please [let me know how/if it works](https://github.com/indie-mirror/https-server/issues). Thank you!


## Thanks

  * [thagoat](https://github.com/thagoat) for confirming that [installation works on Arch Linux with Pacman](https://github.com/indie-mirror/https-server/issues/1).

  * [Tim Knip](https://github.com/timknip) for confirming that [the module works with 64-bit Windows](https://github.com/indie-mirror/https-server/issues/2) with the following behaviour: “Install pops up a windows dialog to allow adding the cert.”

  * [Run Rabbit Run](https://hackers.town/@nobody) for [the following information](https://hackers.town/@nobody/101670447262172957) on 64-bit Windows: “Win64: works with the windows cert install popup on server launch. Chrome and ie are ok with the site then. FF 65 still throws the cert warning even after restarting.”
