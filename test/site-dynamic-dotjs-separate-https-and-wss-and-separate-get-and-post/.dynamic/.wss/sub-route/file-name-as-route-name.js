module.exports = (webSocket, request) => {
  webSocket.on('message', (data) => {
    webSocket.send(`/sub-route/file-name-as-route-name ${data}`)
  })
}
