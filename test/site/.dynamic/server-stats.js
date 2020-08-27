const os = require('os')

function serverStats (request, response, next) {
  const loadAverages = `<p>${os.loadavg().reduce((a, c, i) => `${a}\n<li><strong>CPU ${i+1}:</strong> ${c}</li>`, '<ul>') + '</ul>'}</p>`
  const freeMemory = `<p>${os.freemem()} bytes</p>`

  const page = `
    <!doctype html>
    <html lang="en" style="font-family: sans-serif; background-color: #eae7e1">
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server statistics</title>
      </head>
      <body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;">
        <main style="font-size: 1.5rem;">
          <h1>Server statistics</h1>
          <h2>Load averages</h2>
          ${loadAverages}
          <h2>Free memory</h2>
          ${freeMemory}
        </main>
      </body>
    </html>
  `

  response.html(page)
}

module.exports = serverStats
