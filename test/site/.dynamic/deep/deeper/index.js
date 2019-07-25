module.exports = (request, response) => {
  response.type('html').status(200).end('<h1>Deeper index</h1>')
}
