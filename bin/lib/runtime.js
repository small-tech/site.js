////////////////////////////////////////////////////////////////////////////////
//
// When run as a regular Node script, the source directory is our parent
// directory (site.js resides in the <sourceDirectory>/bin directory).
//
// For more information, please see the following issues in the Nexe repo:
//
// https://github.com/nexe/nexe/issues/605
// https://github.com/nexe/nexe/issues/607
//
////////////////////////////////////////////////////////////////////////////////

const argv0 = process.argv0

module.exports = {
  isNode: argv0.endsWith('node') || argv0.endsWith('node.exe'),
  isBinary: argv0.endsWith('site') || argv0.endsWith('site.exe')
}
