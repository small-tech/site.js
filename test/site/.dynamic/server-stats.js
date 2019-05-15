const os = require('os')

function serverStats (request, response, next) {

  const loadAverages = `<p> ${os.loadavg().reduce((a, c, i) => `${a}\n<li><strong>CPU ${i+1}:</strong> ${c}</li>`, '<ul>') + '</ul>'}</p>`

  const freeMemory = `<p>${os.freemem()} bytes</p>`

  const page = `<html><head><title>Server statistics</title><style>body {font-family: sans-serif;}</style></head><body><h1>Server statistics</h1><h2>Load averages</h2>${loadAverages}<h2>Free memory</h2>${freeMemory}</body></html>`

  response.end(page)
}

module.exports = serverStats
