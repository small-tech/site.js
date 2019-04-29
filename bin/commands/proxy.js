//////////////////////////////////////////////////////////////////////
//
// Command: proxy
//
// Proxy HTTP → HTTPS and WS → WSS.
//
//////////////////////////////////////////////////////////////////////

const httpProxyMiddleware = require('http-proxy-middleware')
const express = require('express')
const webServer = require('../../index')

function proxy (pathToServe, port) {

  const app = express()

  console.log(webServer.version())

  webServer.ensureWeCanBindToPort(port)

  const server = webServer.createServer({}, app).listen(port, () => {
    console.log(`\n 🚚 [Indie Web Server] Proxying: HTTPS/WSS on localhost:${port} ←→ HTTP/WS on ${pathToServe.replace('http://', '')}\n`)

    function prettyLog (message) {
      console.log(` 🔁 ${message}`)
    }

    const logProvider = function(provider) {
      return { log: prettyLog, debug: prettyLog, info: prettyLog, warn: prettyLog, error: prettyLog }
    }

    const webSocketProxy = httpProxyMiddleware(pathToServe.replace('http://', 'ws://'), {
      ws: true,
      changeOrigin:false,
      logProvider,
      logLevel: 'info'
    })

    const httpsProxy = httpProxyMiddleware({
      target: pathToServe,
      changeOrigin: true,
      logProvider,
      logLevel: 'info',

      //
      // Special handling of LiveReload implementation bug in Hugo
      // (https://github.com/gohugoio/hugo/issues/2205#issuecomment-484443057)
      // to work around the port being hardcoded to the Hugo server
      // port (instead of the port that the page is being served from).
      //
      // This enables you to use Indie Web Server as a reverse proxy
      // for Hugo during development time and test your site from https://localhost
      //
      // All other content is left as-is.
      //
      onProxyRes: (proxyResponse, request, response) => {
        const _write = response.write

        // As we’re going to change it.
        delete proxyResponse.headers['content-length']

        response.write = function (data) {
          let output = data.toString('utf-8')
          if (output.match(/livereload.js\?port=1313/) !== null) {
            console.log(' 📝 [Indie Web Server] Rewriting Hugo LiveReload URL to use WebSocket proxy.')
            output = output.replace('livereload.js?port=1313', `livereload.js?port=${port}`)
            _write.call(response, output)
          } else {
            _write.call(response, data)
          }
        }
      }
    })

    app.use(httpsProxy)
    app.use(webSocketProxy)

    // As we’re using a custom server, manually listen for the http upgrade event
    // and upgrade the web socket proxy also.
    // (See https://github.com/chimurai/http-proxy-middleware#external-websocket-upgrade)
    server.on('upgrade', webSocketProxy.upgrade)
  })
}

module.exports = proxy
