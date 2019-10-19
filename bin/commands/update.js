//////////////////////////////////////////////////////////////////////
//
// Command: update
//
// Checks for updates and updates Site.js if new version is found.
//
//////////////////////////////////////////////////////////////////////

const https = require('https')
const os = require('os')
const fs = require('fs')
const { Readable } = require('stream')

const tar = require('tar-stream')
const gunzip = require('gunzip-maybe')
const concat = require('concat-stream')

const Site = require('../../index')
const ensure = require('../lib/ensure')
const status = require('../lib/status')
const start = require('../lib/start')
const stop = require('../lib/stop')

async function update () {
  const platform = os.platform()
  const cpuArchitecture = os.arch()

  // On Linux, we might need to update the status of the Site.js daemon and
  // for that we need to be root.
  const isLinux = platform === 'linux'
  if (isLinux) {
    ensure.root('update')
  }

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

  const currentVersion = Site.versionNumber()
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.')

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

    let platformPath = {
      'linux': 'linux',
      'darwin': 'macos',
      'win32': 'windows'
    }[platform]

    if (platformPath === 'linux' && cpuArchitecture === 'arm') {
      platformPath = `${platformPath}-arm`
    }

    let binaryUrl = `https://sitejs.org/releases/${platformPath}/${latestVersion}.tar.gz`

    console.log(` 📡 Downloading Site.js version ${latestVersion}…`)

    let latestReleaseResponse
    try {
      latestReleaseResponse = await secureGetBinary(binaryUrl)
    } catch (error) {
      console.log(' 🤯 Error: Could not download update.\n')
      console.log(error)
      process.exit(1)
    }

    const latestRelease = latestReleaseResponse.body

    console.log(' 📦 Installing…')

    //
    // Check if the server daemon is running. If so, we must first stop
    // it before we can install the binary otherwise we will get the
    // error Error: ETXTBSY: text file is busy, open '/usr/local/bin/site'.
    //
    // We will restart the server using the latest version of Site.js
    // after a successful install.
    //
    let weStoppedTheDaemon = false
    if (isLinux) {
      if (ensure.commandExists('systemctl')) {
        const { isActive } = status()
        if (isActive) {
          console.log('\n 😈 Site.js daemon is active. Stopping it before installing latest version… ')

          try {
            stop()
          } catch (error) {
            console.log(' 🤯 Error: Could not stop the Site.js daemon.\n')
            console.log(error)
            process.exit(1)
          }

          weStoppedTheDaemon = true
        }
      }
    }

    //
    // Extract the latest release in memory from the gzipped tarball.
    //

    await extract(latestRelease)

    //
    // If we stopped the daemon, restart it.
    //
    if (weStoppedTheDaemon) {
      console.log(` 😈 Restarting the daemon using Site.js v${latestVersion}…`)
      start()
    }

    console.log(' 🎉 Done!\n')

  } else {
    console.log(' 😁👍 You’re running the latest version of Site.js!\n')
  }
}

module.exports = update

//
// Helpers.
//

async function extract (release) {
  return new Promise((resolve, reject) => {
    const extractTar = tar.extract()

    extractTar.on('entry', (header, stream, next) => {
      // There should be only one file in the archive and it should be called site.
      if (header.name === 'site') {
        stream.pipe(concat(executable => {
          const binaryPath = os.platform() === 'windows' ? 'C:\\Program Files\\site.js\\site' : '/usr/local/bin/site'
          fs.writeFileSync(binaryPath, executable, { mode: 0o755 })
          resolve()
        }))
      } else {
        console.log(` 🤯 Error: Unknown file encountered: ${header.name}`)
        reject()
      }
    })

    bufferToStream(release).pipe(gunzip()).pipe(extractTar)
  })
}


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


async function secureGetBinary (url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const code = response.statusCode

      if (code !== 200) {
        reject({code})
      }

      let chunks = []
      response.on('data', _ => chunks.push(_))
      response.on('end', () => {
        const body = Buffer.concat(chunks)
        resolve({code, body})
      })
    })
  })
}


// Takes a binary buffer and returns a Readable instance stream.
// Courtesy: https://stackoverflow.com/a/54136803
 function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary)
      this.push(null)
    }
  })

  return readableInstanceStream
}
