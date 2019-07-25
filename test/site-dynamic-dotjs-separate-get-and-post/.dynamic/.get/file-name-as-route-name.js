module.exports = (request, response) => {
  response.type('text').end('GET /file-name-as-route-name')
}
