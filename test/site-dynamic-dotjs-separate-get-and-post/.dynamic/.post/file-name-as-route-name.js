module.exports = (request, response) => {
  response.type('text').end('POST /file-name-as-route-name')
}
