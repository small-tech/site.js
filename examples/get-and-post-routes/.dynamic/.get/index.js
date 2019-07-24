module.exports = function (request, response) {
  response.type('html').end(`
  <h1>Dynamic from .get/</h1>
  <form method='POST' action='https://localhost'>
    <input type="text" name='message' value='Hello!'>
    <button>Post!</button>
  </form>
  `)
}
