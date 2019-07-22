module.exports = (request, response) => {
  response.type('html').status(200).end('<h1>A deep route</h1>')
}
