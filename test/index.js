const test = require('tape')

const httpsServer = require('../index.js')
const https = require('https')

const indexHTML = "<!DOCTYPE html><html lang='en'><head><title>Test</title><body><h1>Test</h1></body></html>"


async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      if (statusCode !== 200) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, body})
      })
    })
  })
}


test('create https server', t => {
  t.plan(2)
  const server = httpsServer.createServer()
  t.ok(server instanceof https.Server, 'is https.Server')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on https.Server')
    t.end()
    server.close()
  })
})


test('create http2 server', t => {
  t.plan(2)
  const server = httpsServer.createSecureServer({isHTTP2: true})
  // http2 does not export the Http2SecureServer class so we cannot use instanceof to test here.
  t.equal(server.constructor.name, 'Http2SecureServer', 'is Http2SecureServer')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on Http2SecureServer')
    t.end()
    server.close()
  })
})


test('static serve https', t => {
  t.plan(3)
  const server = httpsServer.serve('test/site', async () => {

    t.ok(server instanceof https.Server, 'is https.Server')

    let response
    try {
      response = await secureGet('https://localhost/index.html')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.equal(response.statusCode, 200, 'request succeeds')
    t.equal(response.body, indexHTML, 'index loads')
    t.end()

    server.close()
  })
})


test('static serve HTTP2', t => {
  t.plan(3)
  const server = httpsServer.serve('test/site', async () => {

    t.equal(server.constructor.name, 'Http2SecureServer', 'is Http2SecureServer')

    let response
    try {
      response = await secureGet('https://localhost/index.html')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.equal(response.statusCode, 200, 'request succeeds')
    t.equal(response.body, indexHTML, 'index loads')
    t.end()

    server.close()
  }, {
    isHTTP2: true
  })
})
