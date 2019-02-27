#!/usr/bin/env node
const fs = require('fs')

const httpsServer = require('../index.js')

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
// If a port is specified, use that instead.
if (arguments.length === 4) {
  port = parseInt(arguments[3])
}

if (!fs.existsSync(pathToServe)) {
  console.log(`\n 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

httpsServer.serve(pathToServe, port)
