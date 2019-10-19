//////////////////////////////////////////////////////////////////////
//
// Command: update
//
// Checks for updates and updates Site.js if new version is found.
//
//////////////////////////////////////////////////////////////////////

const https = require('https')
const os = require('os')
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

  console.log(' 🧐 Checking for updates…\n')

  let response
  try {
    response = await secureGet('https://sitejs.org/version')
  } catch (error) {
    console.log(' 🤯 Error: Could not check for updates.\n')
    console.log(error)
    process.exit(1)
  }

  const latestVersion = response.body
  const [latestMajor, latestMinor, latestPatch] = latestVersion.split('.')

  const currentVersion = '12.7.9' // Site.versionNumber()
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.')

  // Debug.
  // console.log(`Latest version: ${latestVersion} ${latestMajor} ${latestMinor} ${latestPatch}`)
  // console.log(`Current version: ${currentVersion} ${currentMajor} ${currentMinor} ${currentPatch}`)

  if (currentVersion !== latestVersion) {
    // Are we running a newer (development or beta) version than the latest release version?
    if (currentMajor > latestMajor || (currentMajor === latestMajor && currentMinor > latestMinor) || (currentMajor === latestMajor && currentMinor === latestMinor && currentPatch > latestPatch)) {
      console.log(` 🤓 You are running a newer version (${currentVersion}) than the latest released version (${latestVersion}).\n`)
      process.exit()
    }

    // The current version is not newer than the latest version and we know
    // that it isn’t equal to the release version so it must be older. Let’s
    // update!
    console.log(` 🎁 There is a new version of Site.js available (v${latestVersion}).\n`)

    //
    // Compose the right binary URL for the platform and architecture.
    //
    const platform = os.platform()
    const cpuArchitecture = os.arch()

    let platformPath = {
      'linux': 'linux',
      'darwin': 'macos',
      'win32': 'windows'
    }[platform]

    if (platformPath === 'linux' && cpuArchitecture === 'arm') {
      platform = `${platformPath}-arm`
    }

    let binaryUrl = `https://sitejs.org/releases/${platformPath}/${latestVersion}.tar.gz`

    console.log(` 📡 Downloading Site.js version ${latestVersion}…`)

    // TODO

    console.log(' 📦 Installing…')

    // TODO

    console.log(' 🎉 Done!\n')

    // TODO
  } else {
    console.log(' 😁👍 You’re running the latest version of Site.js!\n')
  }
}

module.exports = update
