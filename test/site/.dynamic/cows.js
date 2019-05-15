const getCows = require('cows')

const cows = getCows()

function paveTheCowPaths(request, response, next) {
  const randomCowIndex = Math.round(Math.random()*cows.length)-1
  const randomCow = cows[randomCowIndex]

  response.end(`<pre>${randomCow}</pre>`)
}

module.exports = paveTheCowPaths
