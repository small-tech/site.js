module.exports = (request, response) => {
  response.type('html').status(200).end('<h1>deep/deeper.js (masked by deep/deeper/index.js so you should never see this)</h1>')
}
