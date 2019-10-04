// Basic echo.
module.exports = (client, request) => {
  client.on('message', (data) => {
    client.send(data)
  })
}
