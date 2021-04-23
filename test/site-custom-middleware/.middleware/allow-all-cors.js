////////////////////////////////////////////////////////////////////////////////
//
// Middleware: Allow all Cross Origin Requests (CORS).
//
////////////////////////////////////////////////////////////////////////////////

module.exports = (request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
}
