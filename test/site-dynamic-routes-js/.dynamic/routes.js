// Very basic routes.js file. We do not need to unit test Express or Express-ws but to ensure correct route loading
// behaviour given the various rules.

module.exports = app => {

  // GET route with parameter.
  app.get('/hello/:thing', (request, response) => {
    response
      .type('text')
      .end(`Hello, ${request.params.thing}!`)
  })

  // Simple echo WebSocket (WSS) route.
  app.ws('/echo', (webSocket, request) => {
    webSocket.on('message', (data) => {
      webSocket.send(data)
    })
  })

}
