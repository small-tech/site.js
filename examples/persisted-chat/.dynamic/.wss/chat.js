////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Basic chat app with Site.js (server).
//
// For a step-by-step tutorial of how to build this example, see:
// https://ar.al/2019/10/10/build-a-simple-chat-app-with-site.js
//
// Copyright ⓒ 2019 Aral Balkan.
// Released under GNU AGPL version 3.0 or later.
//
////////////////////////////////////////////////////////////////////////////////////////////////////

// Clear the chat log (delete the messages table) every hour in this demo.
if (!globalThis.clearChatIntervalId) {
  console.log(`   💬    ❨Chat example❩ Demo housekeeping: set up timer to clear chat log every hour.`)
  globalThis.clearChatIntervalId = setInterval(async () => {
    await db.messages.delete()
    console.log(`   💬    ❨Chat example❩ Demo housekeeping: chat log cleared.`)
  }, 60 /* mins */ * 60 /* seconds */ * 1000 /* milliseconds */)
}


module.exports = function (client, request) {
  // Ensure the messages table exists.
  if (!db.messages) {
    db.messages = []
  }

  // New client connection: persist client’s “room”
  // based on request path.
  client.room = this.setRoom(request)

  // Send any existing messages to clients when they first join.
  client.send(JSON.stringify(db.messages))

  // Log the connection.
  console.log(`   💬    ❨Chat example❩ New client connected to ${client.room}`)

  client.on('message', message => {
    // New message received.
    const theMessage = JSON.parse(message)

    // Perform basic validation.
    if (!isValidMessage(theMessage)) {
      console.log(`   💬    ❨Chat example❩ Message is invalid; not broadcasting.`)
      return
    }

    // Ensure the messages table exists.
    // (We do this again here as the messages table is periodically cleared in this demo.)
    if (!db.messages) {
      db.messages = []
    }

    // Persist the message.
    db.messages.push(theMessage)

    // Broadcast it to all other clients in the same room.
    const numberOfRecipients = this.broadcast(client, message)

    // Log the number of recipients message was sent to
    // and make sure we pluralise the log message properly.
    console.log(`   💬    ❨Chat example❩ ${client.room} message broadcast to `
      + `${numberOfRecipients} recipient`
      + `${numberOfRecipients === 1 ? '' : 's'}`)
  })
}

// Is the passed object a valid string?
function isValidString(s) {
  return Boolean(s)                // Isn’t null, undefined, '', or 0
    && typeof s === 'string'       // and is the correct type
    && s.replace(/\s/g, '') !== '' // and is not just whitespace.
}

// Is the passed message object valid?
function isValidMessage(m) {
  return isValidString(m.nickname) && isValidString(m.text)
}
