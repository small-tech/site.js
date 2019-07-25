module.exports = function (request, response) {
  response.type('html').end(`
  <h1>Thank you for your message!</h1>
  <p>“${request.body.message}”</p>
  `)
}
