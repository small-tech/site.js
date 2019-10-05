////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Basic WebSocket Chat.
//
// Note: in order to have access to `this`, you must define your route using the function keyword.
// ===== You cannot use an arrow function. You can, however, use arrow functions within any inner
//       functions inside of your route (like the event handler in this example).
//
////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = function (client, request) {
  client.room = this.setRoom(request)

  client.on('message', message => {
    this.broadcast(client, message)
  })
}
