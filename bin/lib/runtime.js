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

module.exports = {
  isNode: process.argv0 === 'node',
  isBinary: process.argv0 === 'site'
}
