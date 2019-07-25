module.exports = (webSocket, request) => {
  webSocket.on('message', (data) => {
    webSocket.send(`/file-name-as-route-name ${data}`)
  })
}
