////////////////////////////////////////////////////////////////////////////////
//
// Node.js version of the Owncast installation script.
// (With minor differences.)
//
// Copyright (C) 2021-present Aral Balkan, Small Technology Foundation
// Released under AGPL version 3.0
//
////////////////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const process = require('process')
const fetch = require('node-fetch')
const unzip = require('extract-zip')

async function installOwncast(owncastInstallDirectory) {

  const owncastVersion = '0.0.8'
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'owncast-'))

  console.log(`   💮️    ❨site.js❩ Installing Owncast version ${owncastVersion}…`)

  let owncastArch, owncastPlatform
  let ffmpegArch, ffmpegVersion, ffmpegDownloadUrl, ffmpegTargetFile

  const platform = os.platform()
  switch (platform) {
    case 'darwin':
      owncastArch = '64bit'
      owncastPlatform = 'macOS'
      ffmpegVersion = '4.3.1'
      ffmpegDownloadUrl = `https://evermeet.cx/ffmpeg/ffmpeg-${ffmpegVersion}.zip`
      ffmpegTargetFile = `${tempDirectory}/ffmpeg.zip`
    break;

    case 'linux':
      switch (process.arch) {
        case 'x64':
          ffmpegArch = 'linux-x64'
          owncastArch = '64bit'
        break

        case 'ia86':
          ffmpegArch = 'linux-ia32'
          owncastArch = '32bit'
        break

        case 'arm':
          if (process.config.variables.arm_version === '7') {
            ffmpegArch = 'linux-arm'
            owncastArch = 'arm7'
          }
        break

        default:
          throw new Error(`Architecture ${process.arch}${process.config.variables.arm_version !== undefined ? `v${process.config.variables.arm_version}`: ''} is not supported by Owncast.`)
        break
      }
      owncastPlatform = 'linux'
      ffmpegVersion = 'b4.3.1'
      ffmpegDownloadUrl = `https://github.com/eugeneware/ffmpeg-static/releases/download/${ffmpegVersion}/${ffmpegArch}`
      ffmpegTargetFile = path.join(owncastInstallDirectory, 'ffmpeg')
    break

    default:
      throw new Error(`Platform ${platform} is not supported by Owncast.`)
  }

  // Build release download URL
  const owncastDownloadUrl = `https://github.com/owncast/owncast/releases/download/v${owncastVersion}/owncast-${owncastVersion}-${owncastPlatform}-${owncastArch}.zip`
  const owncastTargetFile = `${tempDirectory}/owncast-${owncastVersion}-${owncastPlatform}-${owncastArch}.zip`

  // Backup existing Owncast folder, if it exists
  if (fs.existsSync(owncastInstallDirectory)) {
    console.log('   💮️    ❨site.js❩ Found existing Owncast directory. Backing it up…')
    const backup = `${owncastInstallDirectory}-backup-${Date.now()}`
    fs.moveSync(owncastInstallDirectory, backup)
  }

  // Make the installation directory.
  fs.ensureDirSync(owncastInstallDirectory)

  // Download Owncast release.
  console.log('   💮️    ❨site.js❩ Downloading Owncast release binary (zip)…')
  const owncastZip = await (await fetch(owncastDownloadUrl)).buffer()
  fs.writeFileSync(owncastTargetFile, owncastZip, {encoding: 'binary'})

  // Unzip Owncast release.
  console.log('   💮️    ❨site.js❩ Unzipping Owncast release binary…')
  await unzip(owncastTargetFile, {dir: owncastInstallDirectory})

  // Download ffmpeg.
  console.log(`   💮️    ❨site.js❩ Downloading Owncast dependency ffmpeg (version ${ffmpegVersion})…`)
  const ffmpeg = await (await fetch(ffmpegDownloadUrl)).buffer()
  fs.writeFileSync(ffmpegTargetFile, ffmpeg, {encoding: 'binary', mode: 755})

  console.log(`   💮️    ❨site.js❩ Owncast installed at ${owncastInstallDirectory}.`)
}

module.exports = installOwncast
