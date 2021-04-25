module.exports = (request, response) => {
  response.status(500).end('This route should not load as there is a routes.js file.')
}
