////////////////////////////////////////////////////////////////////////////////
//
// Site.js
//
// Unit tests: Site.
//
// Copyright ⓒ 2019 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
////////////////////////////////////////////////////////////////////////////////

const test = require('tape')

const Site = require('../index.js')
const http = require('http')
const https = require('https')

const fs = require('fs')
const path = require('path')

const queryString = require('querystring')

const WebSocket = require('ws')

function default404ResponseBodyDeflatedForRoute (route) {
  return `<!doctypehtml><htmllang="en"style="font-family:sans-serif;background-color:#eae7e1"><head><metacharset="utf-8"><metaname="viewport"content="width=device-width,initial-scale=1.0"><title>Error404:Notfound</title></head><bodystyle="display:grid;align-items:center;justify-content:center;height:100vh;vertical-align:top;margin:0;"><main><h1style="font-size:16vw;color:black;text-align:center;line-height:0.25">4🤭4</h1><pstyle="font-size:4vw;text-align:center;padding-left:2vw;padding-right:2vw;"><span>Couldnotfind</span><spanstyle="color:grey;">${route}</span></p></main><scriptsrc="/instant/client/bundle.js"></script></body></html>`.replace(/\s/g, '')
}

const DEFAULT_500_RESPONSE_BODY_DEFLATED = '<!doctype html><html lang="en" style="font-family: sans-serif; background-color: #eae7e1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error 500: Internal Server Error</title></head><body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;"><main><h1 style="font-size: 16vw; color: black; text-align:center; line-height: 0.25">5🔥😱</h1><p style="font-size: 4vw; text-align: center; padding-left: 2vw; padding-right: 2vw;"><span>Internal Server Error</span><br><br><span style="color: grey;">Bad things have happened.</span></p></main></body></html>'.replace(/\s/g, '')

function localhost(path) {
  return `https://localhost${path}`
}

async function insecureGet (url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
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


async function securePost (hostname, path, data = {}, isJSON = false) {
  return new Promise((resolve, reject) => {

    const encodedData = isJSON ? JSON.stringify(data) : queryString.stringify(data)

    const options = {
      hostname,
      path,
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': isJSON ? 'application/json' : 'application/x-www-form-urlencoded',
        'Content-Length': encodedData.length
      }
    }

    const request = https.request(options, response => {
      const statusCode = response.statusCode
      let body = ''
      response.on('data', (data) => {
        // Note: we should really be parsing querystring data here but our test routes
        // ===== return plain text at the moment. TODO: Update.
        decodedData = isJSON ? JSON.parse(data) : data.toString('utf-8') // queryString.parse(data)
        resolve({statusCode, data: decodedData})
      })
    })

    request.on('error', () => reject(error))

    request.write(encodedData)
    request.end()
  })
}


test('[site.js] constructor', t => {
  t.plan(2)
  const server = new Site().server
  t.ok(server instanceof https.Server, 'is https.Server')

  server.listen(443, () => {
    t.equal(server.address().port, 443, 'the requested port is set on returned https.Server')
    t.end()
    server.close()
  })
})


test('[site.js] Simple dotJS filesystem-based route loading', t => {

  t.plan(3)

  const site = new Site({path: 'test/site-dynamic-dotjs-simple'})

  // Ensure the route is loaded as we expect.
  const routerStack = site.app._router.stack
  t.strictEquals(routerStack[7].route.path, '/simple')

  // Hit the route to ensure we get the response we expect.
  const server = site.serve(async () => {
    let response
    try {
      response = await secureGet('https://localhost/simple')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.strictEquals(response.statusCode, 200, 'request succeeds')
    t.strictEquals(response.body, 'simple', 'route loads')

    server.close()
    t.end()
  })
})


// Runs the tests for routes within separate .get and .https folders.
function runDotJsSeparateGetAndPostTests (t, site, callback) {

  // 32 tests.

  const routerStack = site.app._router.stack

  const getFileNameAsRouteNameRoute = routerStack[7].route
  t.true(getFileNameAsRouteNameRoute.methods.get, 'request method should be GET')
  t.strictEquals(getFileNameAsRouteNameRoute.path, '/file-name-as-route-name', 'path should be correct')

  const getIndexRoute = routerStack[8].route
  t.true(getIndexRoute.methods.get, 'request method should be GET')
  t.strictEquals(getIndexRoute.path, '/', 'path should be correct')

  const getSubRouteFileNameAsRouteNameRoute = routerStack[9].route
  t.true(getSubRouteFileNameAsRouteNameRoute.methods.get, 'request method should be GET')
  t.strictEquals(getSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name', 'path should be correct')

  const getSubRouteIndexRoute = routerStack[10].route
  t.true(getSubRouteIndexRoute.methods.get, 'request method should be GET')
  t.strictEquals(getSubRouteIndexRoute.path, '/sub-route', 'path should be correct')

  // Next two routes are the body parser and JSON parser, so we skip those.

  const postFileNameAsRouteNameRoute = routerStack[13].route
  t.true(postFileNameAsRouteNameRoute.methods.post, 'request method should be POST')
  t.strictEquals(postFileNameAsRouteNameRoute.path, '/file-name-as-route-name', 'path should be correct')

  const postIndexRoute = routerStack[14].route
  t.true(postIndexRoute.methods.post, 'request method should be POST')
  t.strictEquals(postIndexRoute.path, '/', 'path should be correct')

  const postSubRouteFileNameAsRouteNameRoute = routerStack[15].route
  t.true(postSubRouteFileNameAsRouteNameRoute.methods.post, 'request method should be POST')
  t.strictEquals(postSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name', 'path should be correct')

  const postSubRouteIndexRoute = routerStack[16].route
  t.true(postSubRouteIndexRoute.methods.post, 'request method should be POST')
  t.strictEquals(postSubRouteIndexRoute.path, '/sub-route', 'path should be correct')

  // Hit the routes to ensure we get the responses we expect.
  const server = site.serve(async () => {

    // So we can access them outside of the try block (scope).
    let getFileNameAsRouteNameRouteResponse, getIndexRouteResponse, getSubRouteFileNameAsRouteNameRouteResponse, getSubRouteIndexRouteResponse, postFileNameAsRouteNameRouteResponse, postIndexRouteResponse,postSubRouteFileNameAsRouteNameRouteResponse, postSubRouteIndexRouteResponse;

    try {
      getFileNameAsRouteNameRouteResponse = await secureGet(localhost(getFileNameAsRouteNameRoute.path))
      getIndexRouteResponse = await secureGet(localhost(getIndexRoute.path))
      getSubRouteFileNameAsRouteNameRouteResponse = await secureGet(localhost(getSubRouteFileNameAsRouteNameRoute.path))
      getSubRouteIndexRouteResponse = await secureGet(localhost(getSubRouteIndexRoute.path))

      postFileNameAsRouteNameRouteResponse = await securePost('localhost', postFileNameAsRouteNameRoute.path)
      postIndexRouteResponse = await securePost('localhost', postIndexRoute.path)
      postSubRouteFileNameAsRouteNameRouteResponse = await securePost('localhost', postSubRouteFileNameAsRouteNameRoute.path)
      postSubRouteIndexRouteResponse = await securePost('localhost', postSubRouteIndexRoute.path)
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.strictEquals(getFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(getIndexRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(getSubRouteFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(getSubRouteIndexRouteResponse.statusCode, 200, 'request succeeds')

    t.strictEquals(postFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(postIndexRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(postSubRouteFileNameAsRouteNameRouteResponse.statusCode, 200, 'request succeeds')
    t.strictEquals(postSubRouteIndexRouteResponse.statusCode, 200, 'request succeeds')

    t.strictEquals(getFileNameAsRouteNameRouteResponse.body, 'GET /file-name-as-route-name', 'route loads')
    t.strictEquals(getIndexRouteResponse.body, 'GET /', 'route loads')
    t.strictEquals(getSubRouteFileNameAsRouteNameRouteResponse.body, 'GET /sub-route/file-name-as-route-name', 'route loads')
    t.strictEquals(getSubRouteIndexRouteResponse.body, 'GET /sub-route', 'route loads')

    t.strictEquals(postFileNameAsRouteNameRouteResponse.data, 'POST /file-name-as-route-name', 'route loads')

    t.strictEquals(postIndexRouteResponse.data, 'POST /', 'route loads')
    t.strictEquals(postSubRouteFileNameAsRouteNameRouteResponse.data, 'POST /sub-route/file-name-as-route-name', 'route loads')
    t.strictEquals(postSubRouteIndexRouteResponse.data, 'POST /sub-route', 'route loads')

    server.close()

    callback.apply(this, [])
  })
}


test('[site.js] Separate .get and .post folders with dotJS filesystem-based route loading', t => {

  t.plan(32)

  const site = new Site({path: 'test/site-dynamic-dotjs-separate-get-and-post'})
  runDotJsSeparateGetAndPostTests(t, site, () => {
    t.end()
  })

})


test('[site.js] Separate .https and .wss folders with separate .get and .post folders in the .https folder with dotJS filesystem-based route loading', t => {

  t.plan(44)

  const site = new Site({path: 'test/site-dynamic-dotjs-separate-https-and-wss-and-separate-get-and-post'})

  runDotJsSeparateGetAndPostTests(t, site , () => {

    // Run the WSS tests.
    const routerStack = site.app._router.stack

    // Indices up to 16 have been covered by runDotJsSeparateGetAndPostTests() above.
    // Index 17 is that static router.
    // The WSS routes start at index 18.

    const webSocketFileNameAsRouteNameRoute = routerStack[18].route
    t.true(webSocketFileNameAsRouteNameRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
    t.strictEquals(webSocketFileNameAsRouteNameRoute.path, '/file-name-as-route-name/.websocket', 'path should be correct')

    const webSocketIndexRoute = routerStack[19].route
    t.true(webSocketIndexRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
    t.strictEquals(webSocketIndexRoute.path, '/.websocket', 'path should be correct')

    const webSocketSubRouteFileNameAsRouteNameRoute = routerStack[20].route
    t.true(webSocketSubRouteFileNameAsRouteNameRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
    t.strictEquals(webSocketSubRouteFileNameAsRouteNameRoute.path, '/sub-route/file-name-as-route-name/.websocket', 'path should be correct')

    const webSocketSubRouteIndexRoute = routerStack[21].route
    t.true(webSocketSubRouteIndexRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
    t.strictEquals(webSocketSubRouteIndexRoute.path, '/sub-route/.websocket', 'path should be correct')

    // Actually test the WebSocket (WSS) routes by connecting to them.
    const server = site.serve(async () => {

      const testWebSocketPath = (path) => {

        return new Promise((resolve, reject) => {

          const webSocketUrl = `wss://localhost${path}`
          const ws = new WebSocket(webSocketUrl, { rejectUnauthorized: false })

          ws.on('open', () => { ws.send('test') })

          ws.on('message', (data) => {
            ws.close()
            t.strictEquals(data, `${path} test`, 'the correct message is echoed back')
            resolve()
          })

          ws.on('error', (error) => {
            reject(error)
          })
        })
      }

      await testWebSocketPath('/file-name-as-route-name')
      await testWebSocketPath('/')
      await testWebSocketPath('/sub-route/file-name-as-route-name')
      await testWebSocketPath('/sub-route')

      server.close()
      t.end()
    })
  })
})


test('[site.js] dynamic route loading from routes.js file', t => {

  t.plan(7)

  const site = new Site({path: 'test/site-dynamic-routes-js'})
  const routerStack = site.app._router.stack

  const getRouteWithParameter = routerStack[10].route
  t.true(getRouteWithParameter.methods.get, 'request method should be GET')
  t.strictEquals(getRouteWithParameter.path, '/hello/:thing', 'path should be correct and contain parameter')

  const wssRoute = routerStack[11].route
  t.true(wssRoute.methods.get, 'request method should be GET (prior to WebSocket upgrade)')
  t.strictEquals(wssRoute.path, '/echo/.websocket', 'path should be correct and contain parameter')

  // Actually connect to the routes and test the responses.
  const server = site.serve(async () => {

    // Test the GET route with the parameter.
    let response
    try {
      response = await secureGet('https://localhost/hello/world')
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.strictEquals(response.statusCode, 200, 'request succeeds')
    t.strictEquals(response.body, 'Hello, world!', 'route loads with correct message')

    // Test the WSS route.
    const ws = new WebSocket('wss://localhost/echo', { rejectUnauthorized: false })

    ws.on('open', () => { ws.send('test') })

    ws.on('message', (data) => {
      ws.close()
      t.strictEquals(data, 'test', 'the correct message is echoed back')

      server.close()
      t.end()
    })
  })
})


test('[site.js] archival cascade', t => {
  t.plan(8)

  const archivalCascadeRoot = path.join(__dirname, 'archival-cascade')

  const mainSiteIndexPath = path.join(archivalCascadeRoot, 'site', 'index.html')
  const mainSiteIndexContent = fs.readFileSync(mainSiteIndexPath, 'utf-8')

  const archive1 = path.join(archivalCascadeRoot, 'site-archive-1')
  const archive2 = path.join(archivalCascadeRoot, 'site-archive-2')

  // Older archive
  const archive1Index = path.join(archive1, 'index.html')
  const archive1Unique = path.join(archive1, 'unique-1.html')
  const archive1Override = path.join(archive1, 'override.html')
  const archive1IndexContent = fs.readFileSync(archive1Index, 'utf-8')
  const archive1UniqueContent = fs.readFileSync(archive1Unique, 'utf-8')
  const archive1OverrideContent = fs.readFileSync(archive1Override, 'utf-8')

  // Newer archive
  const archive2Index = path.join(archive2, 'index.html')
  const archive2Unique = path.join(archive2, 'unique-2.html')
  const archive2Override = path.join(archive2, 'override.html')
  const archive2IndexContent = fs.readFileSync(archive2Index, 'utf-8')
  const archive2UniqueContent = fs.readFileSync(archive2Unique, 'utf-8')
  const archive2OverrideContent = fs.readFileSync(archive2Override, 'utf-8')

  const indexURL = `https://localhost/index.html`
  const unique1URL = `https://localhost/unique-1.html`
  const unique2URL = `https://localhost/unique-2.html`
  const overrideURL = `https://localhost/override.html`

  const server = new Site({path: 'test/archival-cascade/site'}).serve(async () => {
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

    t.equal(responseIndex.body, mainSiteIndexContent, 'site index overrides archive indices')
    t.equal(responseUnique1.body, archive1UniqueContent, 'archive 1 unique content loads')
    t.equal(responseUnique2.body, archive2UniqueContent, 'archive 2 unique content loads')
    t.equal(responseOverride.body, archive2OverrideContent, 'archive 2 content overrides archive 1 content')

    server.close()
    t.end()
  })
})


test('[site.js] 4042302', t => {
  // See https://4042302.org/get-started/
  t.plan(2)

  const _4042302FilePath = path.join(__dirname, 'site', '4042302')
  fs.writeFileSync(_4042302FilePath, 'https://my-previous.site', 'utf-8')

  const server = new Site({path: 'test/site'}).serve(async () => {
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
  })
})


test('[site.js] serve method default 404 and 500 responses', t => {
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

  const server = new Site({path: 'test/site'}).serve(async () => {

    // The server is initialised with the default messages. We can now
    // rename the folders back.
    fs.renameSync(backup404Folder, custom404Folder)
    fs.renameSync(backup500Folder, custom500Folder)

    //
    // Test default 404 error.
    //
    const missingRoute = '/this-page-does-not-exist'
    let responseDefault404
    try {
      responseDefault404 = await secureGet(`https://localhost${missingRoute}`)
    } catch (error) {
      console.log(error)
      process.exit(1)
    }

    t.equal(responseDefault404.statusCode, 404, 'response status code is 404')
    t.equal(responseDefault404.body.replace(/\s/g, ''), default404ResponseBodyDeflatedForRoute(missingRoute), 'default 404 response body is as expected')

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

    t.equal(responseDefault500.statusCode, 500, 'response status code is 500')
    t.equal(responseDefault500.body.replace(/\s/g, ''), DEFAULT_500_RESPONSE_BODY_DEFLATED, 'default 500 response body is as expected')

    t.end()

    server.close()
  })
})


test('[site.js] serve method', t => {
  t.plan(7)
  const server = new Site({path: 'test/site'}).serve(async () => {

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
    t.equal(response.body.replace(/\s/g, ''), fs.readFileSync(path.join(__dirname, 'site', 'index.html'), 'utf-8').replace(/\s/g, '').replace('</main></body>', '</main><scriptsrc="/instant/client/bundle.js"></script></body>'), 'index loads')

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
    const expectedCustom404ResponseBodyDeflated = fs.readFileSync(path.join(__dirname, 'site', '404', 'index.html'), 'utf-8').replace('THE_PATH', '/this-page-does-not-exist').replace('<head>', '<head>\n\t<base href="/404/">').replace(/\s/g, '').replace('</main></body>', '</main><scriptsrc="/instant/client/bundle.js"></script></body>')

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
  })

  test('[site.js] serve method (proxy server)', t => {
    t.plan(15)

    const sourceServer = http.createServer((request, response) => {
      if (request.url === '/exists/') {
        response.writeHead(200)
        response.end('exists')
      } else {
        response.writeHead(404)
        response.end('does-not-exist')
      }
    })
    sourceServer.listen(4242, async () => {
      t.ok(true, 'proxy source server is successfully created')

      // Sanity check: test that source server is behaving correctly.
      const response = await insecureGet('http://localhost:4242/exists/')
      t.strictEquals(response.statusCode, 200, 'proxy source server: response code is correct')
      t.strictEquals(response.body, 'exists', 'proxy source server: response body is correct')

      // Create a regular Site.js proxy server (without fallthrough)
      const basicProxyServer = new Site({proxyPort: 4242}).serve(async () => {
        const basicProxyResponse = await secureGet('https://localhost/exists/')
        t.strictEquals(basicProxyResponse.statusCode, 200, 'basic proxy server: proxied response code is correct')
        t.strictEquals(basicProxyResponse.body, 'exists', 'basic proxy server: proxied response body is correct')

        const basic404ProxyResponse = await secureGet('https://localhost/does-not-exist/')
        t.strictEquals(basic404ProxyResponse.statusCode, 404, 'basic 404 proxy response code is 404 as expected')
        t.strictEquals(basic404ProxyResponse.body, 'does-not-exist', 'basic 404 proxy response body is correct')

        basicProxyServer.close()

        const proxyServerWithFallthrough = new Site({proxyPort: 4242, path: 'test/proxy-extensions', proxyFallthrough: true}).serve(async () => {

          const basicProxyResponse = await secureGet('https://localhost/exists/')
          t.strictEquals(basicProxyResponse.statusCode, 200, 'proxy server with fallthrough (exists at source): proxied response code is correct')
          t.strictEquals(basicProxyResponse.body, 'exists', 'proxy server with fallthrough (exists at source): proxied response body is correct')

          // Ask for a static route that we know for certain does not exist on the source server
          // but we know exists in our Site.js server extension.
          const staticFallthroughResponse = await secureGet('https://localhost/does-not-exist/')
          t.strictEquals(staticFallthroughResponse.statusCode, 200, 'proxy server with fallthrough (does not exist at source): static route fallthrough response code is correct')
          t.strictEquals(staticFallthroughResponse.body, 'actually, it exists, because 404 fallthrough works', 'proxy server with fallthrough (does not exist at source): static route fallthrough response body is correct')

          // TODO: Write test to see how 301 redirects are handled during a fall-through. (maybe)

          // Ask for a dynamic route that we know for certain does not exist on the source server
          // but we know exists in our Site.js server extension.
          const dynamicFallthroughResponse = await secureGet('https://localhost/dynamic-fallthrough/')
          t.strictEquals(dynamicFallthroughResponse.statusCode, 200, 'proxy server with fallthrough (does not exist at source): dynamic route fallthrough response code is correct')
          t.strictEquals(dynamicFallthroughResponse.body, 'fallthrough to dynamic route', 'proxy server with fallthrough (does not exist at source): dynamic route fallthrough response body is correct')

          // TODO: Narrow down why dynamic route fallthrough is not working on Small Tech web site and write a test to cover that. Could a 301 redirect be causing this? Or…

          // TODO: Write a test to cover dynamic route fallthrough with routes.js, as well as separate .get and .set routes.

          // TODO: Write test for route that is 404 both at route and at Site.js document root.

          const routeThatDoesNotExistOnEitherServer = '/does-not-exist-on-either-server'
          const doesNotExistOnEitherServerResponse = await secureGet(`https://localhost${routeThatDoesNotExistOnEitherServer}`)

          t.strictEquals(doesNotExistOnEitherServerResponse.statusCode, 404, 'route that does not exist on either server returns status code 404')
          t.strictEquals(doesNotExistOnEitherServerResponse.body.replace(/\s/g, ''), default404ResponseBodyDeflatedForRoute(routeThatDoesNotExistOnEitherServer), 'the server response body is the default Site.js 404 message')

          // TODO: Test web socket server proxying and fallthrough.

          // TODO: Test livereload (our implementation) and fallthrough.

          // Close the source server and signal the end of the proxy tests.
          proxyServerWithFallthrough.close()
          sourceServer.close()
          t.end()
        })
      })
    })
  })

})
