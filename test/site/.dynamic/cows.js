const getCows = require('cows')

const cows = getCows()

function paveTheCowPaths(request, response, next) {
  const randomCowIndex = Math.round(Math.random()*cows.length)-1
  const randomCow = cows[randomCowIndex]

  response.html(`
    <!doctype html>
    <html lang="en" style="font-family: sans-serif; background-color: #eae7e1">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cows!</title>
      </head>
      <body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;">
        <main>
          <pre style="font-size: 24px;">${randomCow}</pre>
        </main>
      </body>
    </html>
  `)
}

module.exports = paveTheCowPaths
