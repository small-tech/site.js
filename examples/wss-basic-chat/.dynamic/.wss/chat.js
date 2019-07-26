// Basic chat.
//
// Note: in order to have access to `this`, you must
// ===== define your route using the function keyword
//       – you cannot use an arrow function.
//
//       You can, however, use arrow functions within
//       any inner functions inside of your route
//       (like the event handler in this example).
//
module.exports = function (webSocket, request) {
  webSocket.on('message', message => {
    this.getWss('/chat').clients.forEach(client => {
      client.send(message)
    })
  })
}
