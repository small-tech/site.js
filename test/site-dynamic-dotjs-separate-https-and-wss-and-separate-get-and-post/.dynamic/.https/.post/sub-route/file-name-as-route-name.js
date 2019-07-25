module.exports = (request, response) => {
  response.type('text').end('POST /sub-route/file-name-as-route-name')
}
