const https = require('https')
const fs = require('fs')
const express = require('express')
const morgan = require('morgan')
const path = require('path')
const os = require('os')

const arguments = process.argv

if (arguments.length > 3) {
  console.log('Usage: https-server [folder-to-serve]')
  process.exit()
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments.length === 3) {
  pathToServe = arguments[2]
}

if (!fs.existsSync(pathToServe)) {
  console.log(`\n 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// TODO: Require and run node-cert to ensure that certificates exist.

const nodecertDirectory = path.join(os.homedir(), '.nodecert')

if (!fs.existsSync(nodecertDirectory)) {
  console.log('\nError: requires nodecert.\n\nInstall: npm i -g nodecert\nRun    : nodecert\n\nMore information: https://source.ind.ie/hypha/tools/nodecert\n')
  process.exit(1)
}

const app = express()

app.use(morgan('tiny'))
app.use(express.static('dist'))

try {
  const server = https.createServer({
    key: fs.readFileSync(path.join(nodecertDirectory, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(nodecertDirectory, 'localhost.pem'))
  }, app).listen(443, () => {
    console.log(`\n 🎉 Serving ${pathToServe} on https://localhost\n`)
  })
} catch (error) {
  console.log('\nError: could not start server', error)
  process.exit(1)
}
