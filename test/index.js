const test = require('tape')

const webServer = require('../index.js')
const https = require('https')

const indexHTML = "<!DOCTYPE html><html lang='en'><head><title>Test</title><body><h1>Test</h1></body></html>"


async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      if (statusCode !== 200 && statusCode !== 404) {
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
  t.plan(5)
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

    let response404
    try {
      response404 = await secureGet('https://localhost/this-page-does-not-exist')
    } catch (error) {
      process.exit(1)
    }

    const custom404PageSourceDeflated = '<!doctypehtml><htmllang="en"><head><basehref="/404/"><metacharset="utf-8"><metaname="viewport"content="width=device-width,initial-scale=1.0"><title>Hmm…Ican’tseemtofindthatpage.</title><style>html{font-family:sans-serif;background-color:#eae7e1}body{display:grid;align-items:center;justify-content:center;height:100vh;vertical-align:top;margin:0;}main{padding-left:2vw;padding-right:2vw;}p{text-align:center;}</style></head><body><main><h1>Hmm…</h1><!--Note:AllyourURLsincustomerrorfilesmustbe--><imgsrc="hmm-monster.svg"alt="Greenmonster,thinking."><p><strong>Sorry,Ican’tfind</strong>/this-page-does-not-exist</p></main></body></html>'

    t.equal(response404.statusCode, 404, 'response is 404')
    t.equal(response404.body.replace(/\s/g, ''), custom404PageSourceDeflated)

    t.end()

    server.close()
  }})
})
