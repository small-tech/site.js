const test = require('tape')

const webServer = require('../index.js')
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


test('createServer method', t => {
  t.plan(2)
  const server = webServer.createServer()
  t.ok(server instanceof https.Server, 'is https.Server')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on returned https.Server')
    t.end()
    server.close()
  })
})


test('serve method', t => {
  t.plan(3)
  const server = webServer.serve({path: 'test/site', callback: async () => {

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

    // let notFoundResponse
    // try {
    //   response404 = await secureGet('https://localhost/this-page-does-not-exist')
    // } catch (error) {
    //   console.log(error)
    //   process.exit(1)
    // }

    // t.equal(response.statusCode, 404, 'response is 404')
    // console.log(response.body)

    t.end()

    server.close()
  }})
})
