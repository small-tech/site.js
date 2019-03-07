#!/usr/bin/env node
const fs = require('fs')
var ansi = require('ansi-escape-sequences')
const httpsServer = require('../index.js')

const arguments = require('minimist')(process.argv.slice(2))

if (arguments._.length > 1 || arguments.help === true) {

  const usageFolderToServe = clr('folder-to-serve', 'green')
  const usagePortOption = `${clr('--port', 'yellow')} ${clr('N', 'cyan')}`
  const usageGlobalOption = `${clr('--global', 'yellow')} ${clr('you@your.site', 'cyan')}`

  const usage = `
  ${clr('Usage:', 'underline')}

  ${clr('https-server', 'bold')} [${usageFolderToServe}] [${usagePortOption}] [${usageGlobalOption}]

  • ${usageFolderToServe}\t\tPath to the folder to serve (optional; defaults to current folder).
  • ${usagePortOption}\t\t\tThe port to start the server on (optional; defaults to 443).
  • ${usageGlobalOption}\tUse globally-trusted certificates. The email address is required by Let’s Encrypt.
  `.replace(/\n$/, '').replace(/^\n/, '')

  console.log(usage)
  process.exit()
}

// If no path is passed, serve the current folder.
// If there is a path, serve that.
let pathToServe = '.'
if (arguments._.length === 1) {
  pathToServe = arguments._[0]
}

// If a port is specified, use it. Otherwise use the default port (443).
let port = 443
if (arguments.port !== undefined) {
  port = parseInt(arguments.port)
}

// If an email is passed, use it.
let email = undefined
if (arguments.email !== undefined) {
  email = arguments.email
}

if (!fs.existsSync(pathToServe)) {
  console.log(` 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// Start the server.
httpsServer.serve(pathToServe, port, email)

// Helpers.

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
