const https = require('https')
const fs = require('fs')
const express = require('express')
const morgan = require('morgan')
const path = require('path')
const os = require('os')

const arguments = process.argv

if (arguments.length > 4) {
  console.log('Usage: https-server [folder-to-serve (default=.)] [port (default=443)]')
  process.exit()
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments.length >= 3) {
  pathToServe = arguments[2]
}

let port = 443
// If a port is given, use that.
if (arguments.length === 4) {
  port = parseInt(arguments[3])
}

if (!fs.existsSync(pathToServe)) {
  console.log(`\n 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// Leave a space between the command prompt and any output from us.
// (Because whitespace rocks.)
console.log('')

// Requiring nodecert ensures that locally-trusted TLS certificates exist.
require('@ind.ie/nodecert')

const nodecertDirectory = path.join(os.homedir(), '.nodecert')

if (!fs.existsSync(nodecertDirectory)) {
  console.log('\nError: requires nodecert.\n\nInstall: npm i -g nodecert\nRun    : nodecert\n\nMore information: https://source.ind.ie/hypha/tools/nodecert\n')
  process.exit(1)
}

const app = express()

app.use(morgan('tiny'))
app.use(express.static(pathToServe))

try {
  const server = https.createServer({
    key: fs.readFileSync(path.join(nodecertDirectory, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(nodecertDirectory, 'localhost.pem'))
  }, app).listen(port, () => {
    const serverPort = server.address().port
    let portSuffix = ''
    if (serverPort !== 443) {
      portSuffix = `:${serverPort}`
    }
    console.log(`\n 🎉 Serving ${pathToServe} on https://localhost${portSuffix}\n`)
  })
} catch (error) {
  console.log('\nError: could not start server', error)
  process.exit(1)
}
