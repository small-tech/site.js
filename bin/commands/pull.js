//////////////////////////////////////////////////////////////////////
//
// Command: pull
//
// Pushes the current or specified folder to a remote server using
// the sync feature.
//
//////////////////////////////////////////////////////////////////////

const path = require('path')

const Site = require('../../index')
const sync = require('../lib/sync')
const clr = require('../../lib/clr')


function pull (args) {
  // Make sure the local path ends with the path separator so that the contents of the folder
  // are synced and not the folder itself.
  const _pathToPull = args.positional[0] || '.'
  const pathToPull = _pathToPull.endsWith(path.sep) ? _pathToPull : `${_pathToPull}${path.sep}`

  const absolutePathToPull = path.resolve(pathToPull)

  const pathFragments = absolutePathToPull.split(path.sep)
  const directoryToPull = pathFragments[pathFragments.length -1]

  // Either use the convention that the directory should be named with the domain
  // to pull to or, if an override has been provided in the --domain option, use that.
  const host = args.named.domain || directoryToPull
  const account = 'site'
  const remotePath = '/home/site/public/'

  const to = `${account}@${host}:${remotePath}`

  const options = {
    from: pathToPull,
    to,
    account,
    host,
    remotePath,
    isPull: true,
    live: false
  }

  Site.logAppNameAndVersion()

  console.log(`\n   ⏪    ❨site.js❩ Pulling from ${clr(host, 'yellow')} to ${clr(pathToPull, 'yellow')}\n`)

  sync(options)
}

module.exports = pull
