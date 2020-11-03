//////////////////////////////////////////////////////////////////////
//
// Util
//
// General utilities.
//
//////////////////////////////////////////////////////////////////////

const path = require('path')
const clr = require('../lib/clr')

class Util {

  // It is a common mistake to start the server in a .dynamic folder (or subfolder)
  // or a .hugo folder or subfolder, etc. In these cases, try to recover and do the right thing.
  static magicallyRewritePathToServeIfNecessary (pathSpecified, pathToServe) {
    // Only attempt to magically fix the path to serve (if necessary)
    // if the current directory way not specifically requested by the person.
    let absolutePathToServe = path.resolve(pathToServe)
    if (pathSpecified !== '.' && pathToServe === '.') {
      const specialFolders = /\.dynamic.*$|\.hugo.*$|\.db.*$|\.wildcard.*$/
      const intelligentAbsolutePathToServe = absolutePathToServe.replace(specialFolders, '')

      if (absolutePathToServe !== intelligentAbsolutePathToServe) {
        pathToServe = path.relative(absolutePathToServe, intelligentAbsolutePathToServe)
        absolutePathToServe = intelligentAbsolutePathToServe
        console.log(`   🧙    ❨site.js❩ ${clr('Magically changed path to serve to the site root.', 'yellow')}`)
      }
    }
    return {pathToServe, absolutePathToServe}
  }
}

module.exports = Util