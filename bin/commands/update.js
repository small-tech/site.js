//////////////////////////////////////////////////////////////////////
//
// Command: update
//
// Checks for updates and updates Site.js if new version is found.
//
//////////////////////////////////////////////////////////////////////

const https = require('https')
const Site = require('../../index')

async function secureGet (url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      const code = response.statusCode

      if (code !== 200) {
        reject({code})
      }

      let body = ''
      response.on('data', _ => body += _)
      response.on('end', () => {
        resolve({code, body})
      })
    })
  })
}

async function update () {
  Site.logAppNameAndVersion()

  let response
  try {
    response = await secureGet('https://sitejs.org/version')
  } catch (error) {
    console.log(`\n 🤯 Error: Could not check for updates.\n`)
    console.log(error)
    process.exit(1)
  }

  const latestVersion = '12.9.0' //response.body
  const [latestMajor, latestMinor, latestPatch] = latestVersion.split('.')

  const currentVersion = Site.versionNumber()
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.')

  console.log(`Latest version: ${latestVersion} ${latestMajor} ${latestMinor} ${latestPatch}`)
  console.log(`Current version: ${currentVersion} ${currentMajor} ${currentMinor} ${currentPatch}`)

  if (currentVersion !== latestVersion) {
    // Are we running a newer (development or beta) version than the latest release version?
    if (currentMajor > latestMajor || (currentMajor === latestMajor && currentMinor > latestMinor) || (currentMajor === latestMajor && currentMinor === latestMinor && currentPatch > latestPatch)) {
      console.log(`\n 🤓 You are running a newer version (${currentVersion}) than the latest released version (${latestVersion}). You geek, you!\n`)
      process.exit()
    }

    // The current version is not newer than the latest version and we know
    // that it isn’t equal to the release version so it must be older. Let’s
    // update!
    console.log(`\n 🎁 There is a new version of Site.js available (${latestVersion})`)

    // Get the right binary for the platform and architecture.
    // TODO

    console.log(' ⏬ Downloading Site.js ')
  } else {
    console.log('\n 😁👍 You’re running the latest version of Site.js!\n')
  }
}

module.exports = update
