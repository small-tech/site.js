const test = require('tape')

const webServer = require('../index.js')
const https = require('https')

const fs = require('fs')
const path = require('path')


async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const statusCode = response.statusCode
      const location = response.headers.location

      // Reject if it’s not one of the status codes we are testing.
      if (statusCode !== 200 && statusCode !== 404 && statusCode !== 500 && statusCode !== 302) {
        reject({statusCode})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({statusCode, location, body})
      })
    })
  })
}


test('[Web Server] createServer method', t => {
  t.plan(2)
  const server = webServer.createServer()
  t.ok(server instanceof https.Server, 'is https.Server')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on returned https.Server')
    t.end()
    server.close()
  })
})

test('[Web Server] archival cascade', t => {
  t.plan(8)

  const archive1 = path.join(__dirname, 'site-archive-1')
  const archive2 = path.join(__dirname, 'site-archive-2')
  fs.mkdirSync(archive1)
  fs.mkdirSync(archive2)

  // Older archive
  const archive1Index = path.join(archive1, 'index.html')
  const archive1Unique = path.join(archive1, 'unique-1.html')
  const archive1Override = path.join(archive1, 'override.html')
  const archive1IndexContent = 'Archive 1 index – this file should be overriden by site'
  const archive1UniqueContent = 'Archive 1 unique – this file should be served'
  const archive1OverrideContent = 'Archive 1 – this file should be overriden by Archive 2’s version'
  fs.writeFileSync(archive1Index, archive1IndexContent, 'utf-8')
  fs.writeFileSync(archive1Unique, archive1UniqueContent, 'utf-8')
  fs.writeFileSync(archive1Override, archive1OverrideContent, 'utf-8')

  // Newer archive
  const archive2Index = path.join(archive2, 'index.html')
  const archive2Unique = path.join(archive2, 'unique-2.html')
  const archive2Override = path.join(archive2, 'override.html')
  const archive2IndexContent = 'Archive 2 index – this file should be overriden by site'
  const archive2UniqueContent = 'Archive 2 unique – this file should be served'
  const archive2OverrideContent = 'Archive 2 – this file should be served and override Archive 1’s version'
  fs.writeFileSync(archive2Index, archive2IndexContent, 'utf-8')
  fs.writeFileSync(archive2Unique, archive2UniqueContent, 'utf-8')
  fs.writeFileSync(archive2Override, archive2OverrideContent, 'utf-8')

  const indexURL = `https://localhost/index.html`
  const unique1URL = `https://localhost/unique-1.html`
  const unique2URL = `https://localhost/unique-2.html`
  const overrideURL = `https://localhost/override.html`

  const server = webServer.serve({
    path: 'test/site',
    callback: async () => {
      let responseIndex, responseUnique1, responseUnique2, responseOverride
      try {
        responseIndex = await secureGet(indexURL)
        responseUnique1 = await secureGet(unique1URL)
        responseUnique2 = await secureGet(unique2URL)
        responseOverride = await secureGet(overrideURL)
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      t.equal(responseIndex.statusCode, 200, 'requestIndex succeeds')
      t.equal(responseUnique1.statusCode, 200, 'requestUnique1 succeeds')
      t.equal(responseUnique2.statusCode, 200, 'requestUnique2 succeeds')
      t.equal(responseOverride.statusCode, 200, 'requestOverride succeeds')

      t.equal(responseIndex.body.replace(/\s/g, ''), fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf-8').replace(/\s/g, ''), 'site index overrides archive indices')
      t.equal(responseUnique1.body, archive1UniqueContent, 'archive 1 unique content loads')
      t.equal(responseUnique2.body, archive2UniqueContent, 'archive 2 unique content loads')
      t.equal(responseOverride.body, archive2OverrideContent, 'archive 2 content overrides archive 1 content')

      server.close()
      t.end()

      // Clean up
      fs.unlinkSync(archive1Index)
      fs.unlinkSync(archive1Unique)
      fs.unlinkSync(archive1Override)
      fs.unlinkSync(archive2Index)
      fs.unlinkSync(archive2Unique)
      fs.unlinkSync(archive2Override)
      fs.rmdirSync(archive1)
      fs.rmdirSync(archive2)
    }
  })
})


test('[Web Server] 4042302', t => {
  // See https://4042302.org/get-started/
  t.plan(2)

  const _4042302FilePath = path.join(__dirname, 'site', '4042302')
  fs.writeFileSync(_4042302FilePath, 'https://my-previous.site', 'utf-8')

  const server = webServer.serve({path: 'test/site', callback: async () => {
    let response
    try {
      response = await secureGet('https://localhost/this-page-exists-on-my-previous-site')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.equal(response.statusCode, 302, '302 status is returned')
    t.equal(response.location, 'https://my-previous.site/this-page-exists-on-my-previous-site')

    fs.unlinkSync(_4042302FilePath)
    server.close()
    t.end()
  }})
})


test('[Web Server] serve method default 404 and 500 responses', t => {
    //
    // Test the default 404 and 500 responses of the serve method.
    //
    // We rename the folders of the custom messages so that they are not used
    // and we rename them back once we’re done.
    //

    t.plan(4)

    const custom404Folder = path.join(__dirname, 'site', '404')
    const backup404Folder = path.join(__dirname, 'site', 'backup-404')

    const custom500Folder = path.join(__dirname, 'site', '500')
    const backup500Folder = path.join(__dirname, 'site', 'backup-500')

    fs.renameSync(custom404Folder, backup404Folder)
    fs.renameSync(custom500Folder, backup500Folder)

    const server = webServer.serve({path: 'test/site', callback: async () => {

      // The server is initialised with the default messages. We can now
      // rename the folders back.
      fs.renameSync(backup404Folder, custom404Folder)
      fs.renameSync(backup500Folder, custom500Folder)

      //
      // Test default 404 error.
      //
      let responseDefault404
      try {
        responseDefault404 = await secureGet('https://localhost/this-page-does-not-exist')
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      const expectedDefault404ResponseBodyDeflated = '<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 404: Not found</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">4🤭4</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Could not find</span> <span style="color: grey;">/this-page-does-not-exist</span></p></main></body></html>'.replace(/\s/g, '')

      t.equal(responseDefault404.statusCode, 404, 'response status code is 404')
      t.equal(responseDefault404.body.replace(/\s/g, ''), expectedDefault404ResponseBodyDeflated, 'default 404 response body is as expected')

      //
      // Test default 500 error.
      //

      let responseDefault500
      try {
        responseDefault500 = await secureGet('https://localhost/test-500-error')
      } catch (error) {
        console.log(error)
        process.exit(1)
      }

      const expectedDefault500ResponseBodyDeflated = '<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">Bad things have happened.</span></p></main></body></html>'.replace(/\s/g, '')

      t.equal(responseDefault500.statusCode, 500, 'response status code is 500')
      t.equal(responseDefault500.body.replace(/\s/g, ''), expectedDefault500ResponseBodyDeflated, 'default 500 response body is as expected')

      t.end()

      server.close()
    }
  })
})


test('[Web Server] serve method', t => {
  t.plan(7)
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
    t.equal(response.body.replace(/\s/g, ''), fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf-8').replace(/\s/g, ''), 'index loads')

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
    t.equal(responseCustom404.body.replace(/\s/g, ''), expectedCustom404ResponseBodyDeflated, 'custom 404 response body is as expected')

    //
    // Test custom 500 page.
    //
    let responseCustom500
    try {
      responseCustom500 = await secureGet('https://localhost/test-500-error')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    // Load the custom 500 file and carry out the transformations that the 500 route would perform. Then strip
    // it of whitespace and compare to the response we got, also stripped of whitespace.
    const expectedCustom500ResponseBodyDeflated = fs.readFileSync(path.join(__dirname, 'site', '500', 'index.html'), 'utf-8').replace('THE_ERROR', 'Bad things have happened.').replace('<head>', '<head>\n\t<base href="/500/">').replace(/\s/g, '')

    t.equal(responseCustom500.statusCode, 500, 'response status code is 500')
    t.equal(responseCustom500.body.replace(/\s/g, ''), expectedCustom500ResponseBodyDeflated, 'custom 500 response body is as expected')

    t.end()

    server.close()
  }})
})
