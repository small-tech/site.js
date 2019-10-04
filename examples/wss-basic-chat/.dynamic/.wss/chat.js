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
module.exports = function (currentClient, request) {
  // A new client connection has been made.

  // Persist the connection path on the client so we can check for it later
  // to ensure that we broadcast messages only to clients on the same path.
  // This is how you would implement rooms in a chat app.
  currentClient.room = request.url.replace('/.websocket', '')

  // Handle messages received from this client.
  currentClient.on('message', message => {
    let count = 0;
    this.getWss().clients.forEach((client) => {
      // Ensure that messages are only sent to clients connected to this route (/chat).
      const notSendingToSelf = client !== currentClient
      const theRoomIsCorrect = client.room === '/chat'
      const theSocketIsOpen = currentClient.readyState === 1 /* WebSocket.OPEN */

      if (notSendingToSelf && theRoomIsCorrect && theSocketIsOpen) {
        client.send(message)
        count++
      }
    })
    console.log(`/chat message broadcast to ${count} client${count === 1 ? '' : 's'}.`)
  })
}
