module.exports = (request, response) => {
  response.type('text').end(`The rabbit’s name is ${request.params.name}.`)
}
