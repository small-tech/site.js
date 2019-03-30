const test = require('tape')

const webServer = require('../index.js')
const https = require('https')

const fs = require('fs')
const path = require('path')

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


test('serve method default 404', t => {
    //
    // Test default 404 response of the serve method
    //
    // We rename the /404/ folder so that the custom 404 message is not used
    // and then we rename it back once we’re done.
    //

    t.plan(2)

    const custom404Folder = path.join(__dirname, 'site', '404')
    const backup404Folder = path.join(__dirname, 'site', 'backup-404')

    fs.renameSync(custom404Folder, backup404Folder)

    const server = webServer.serve({path: 'test/site', callback: async () => {

      // We no longer need to hide the 404 folder. Rename it before
      // more things can go wrong so it doesn’t stay renamed.
      fs.renameSync(backup404Folder, custom404Folder)

      let responseDefault404
      try {
        responseDefault404 = await secureGet('https://localhost/this-page-does-not-exist')
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      const expectedDefault404ResponseBodyDeflated = '<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">/this-page-does-not-exist</span></p></main></body></html>'.replace(/\s/g, '')

      t.equal(responseDefault404.statusCode, 404, 'response status code is 404')
      t.equal(responseDefault404.body.replace(/\s/g, ''), expectedDefault404ResponseBodyDeflated, 'default 404 response body')

      t.end()

      server.close()
    }
  })
})


test('serve method', t => {
  t.plan(5)
  const server = webServer.serve({path: 'test/site', callback: async () => {

    t.ok(server instanceof https.Server, 'is https.Server')

    //
    // Test a valid (200) response.
    //
    let response
    try {
      response = await secureGet('https://localhost/index.html')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.equal(response.statusCode, 200, 'request succeeds')
    t.equal(response.body, indexHTML, 'index loads')

    //
    // Test custom 404 page.
    //
    let responseCustom404
    try {
      responseCustom404 = await secureGet('https://localhost/this-page-does-not-exist')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    // Load the custom 404 file and carry out the transformations that the 404 route would perform. Then strip
    // it of whitespace and compare to the response we got, also stripped of whitespace.
    const expectedCustom404ResponseBodyDeflated = fs.readFileSync(path.join(__dirname, 'site', '404', 'index.html'), 'utf-8').replace('THE_PATH', '/this-page-does-not-exist').replace('<head>', '<head>\n\t<base href="/404/">').replace(/\s/g, '')

    t.equal(responseCustom404.statusCode, 404, 'response status code is 404')
    t.equal(responseCustom404.body.replace(/\s/g, ''), expectedCustom404ResponseBodyDeflated, 'custom 404 response body')

    t.end()

    server.close()
  }})
})
