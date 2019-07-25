module.exports = (request, response) => {
  response.type('text').end('POST /sub-route')
}
