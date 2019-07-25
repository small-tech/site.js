module.exports = (webSocket, request) => {
  webSocket.on('message', (data) => {
    webSocket.send(`/ ${data}`)
  })
}
