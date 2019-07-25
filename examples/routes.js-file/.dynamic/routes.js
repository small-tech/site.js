////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Example of advanced routing.
//
// If a routes.js file exists, then all HTTPS and WebSocket (WSS) routes will be loaded from it and it alone.
//
// Site.js. Copyright ⓒ 2019 Aral Balkan, Small Technology Foundation.
// Licensed under AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = app => {

  //
  // A basic example of complex routing using a parameter. (This isn’t possible with dotJS routing.)
  //
  // For more examples, including the use of regular expressions in routes, please refer to
  // the Express Routing section of the ExpressJS documentation at
  // https://expressjs.com/en/guide/routing.html
  //

  app.get('/hello/:thing', (request, response) => {
    response
      .type('html')
      .end(`
        <h1>Hello, ${request.params.thing}!</h1>
      `)
  })

  //
  // Two very simple routes (one to display a form and the
  // other to handle the POST action on it).
  //
  // For the dotJS version of this example, see the
  // example in the examples/get-and-post-routes folder.
  //

  app.get('/form', (request, response) => {
    response.type('html').end(`
    <h1>Dynamic from .get/</h1>
    <form method='POST' action='https://localhost/form'>
      <input type="text" name='message' value='Hello!'>
      <button>Post!</button>
    </form>
    `)
  })

  app.post('/form', (request, response) => {
    response.type('html').end(`
    <h1>Thank you for your message!</h1>
    <p>“${request.body.message}”</p>
    `)
  })

  //
  // A sample WebSocket (WSS) route (basic echo server).
  //
  // For the dotJS version of this example, see the
  // example in the examples/get-and-post-routes folder.
  //

  // Basic echo.
  app.ws('/echo', (webSocket, request) => {
    webSocket.on('message', (data) => {
      webSocket.send(data)
    })
  })

}
