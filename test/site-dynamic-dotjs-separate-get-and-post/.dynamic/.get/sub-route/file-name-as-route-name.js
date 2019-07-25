module.exports = (request, response) => {
  response.type('text').end('GET /sub-route/file-name-as-route-name')
}
