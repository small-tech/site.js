#!/usr/bin/env node
const fs = require('fs')
var ansi = require('ansi-escape-sequences')
const httpsServer = require('../index.js')

const arguments = require('minimist')(process.argv.slice(2))

if (arguments._.length > 1 || arguments.help === true) {

  const usageFolderToServe = clr('folder-to-serve', 'green')
  const usagePortOption = `${clr('--port', 'yellow')} ${clr('N', 'cyan')}`

  // For when Express static gets HTTP2 support:
  // ===================================================================================
  // const usageHttp2Option = clr('--http2', 'yellow')
  //     • ${usageHttp2Option}\t\t${clr('flag', 'italic')}\tRequests an HTTP2 server (optional; defaults to HTTP1).
  // ===================================================================================

  const usage = `
  ${clr('Usage:', 'underline')}

  ${clr('https-server', 'bold')} [${usageFolderToServe}] [${usagePortOption}]

  • ${usageFolderToServe}\t${clr('string', 'italic')}\tPath to the folder to serve (optional; defaults to current folder).
  • ${usagePortOption}\t\t${clr('number', 'italic')}\tThe port to start the server on (optional; defaults to 443).
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

if (!fs.existsSync(pathToServe)) {
  console.log(` 🤔 Error: could not find path ${pathToServe}\n`)
  process.exit(1)
}

// For when Express static gets HTTP2 support:
// const http2 = (arguments.http2 === true)
console.log(pathToServe)

// Start the server.
httpsServer.serve(pathToServe, port)

// Helpers.

// Format ansi strings.
// Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
