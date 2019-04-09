#!/usr/bin/env node

////////////////////////////////////////////////////////////
//
// Builds Linux and macOS binaries of Indie Web Server.
//
// Run with: npm run build
//
////////////////////////////////////////////////////////////

const { compile } = require('nexe')
const fs = require('fs')
const path = require('path')
const package = require('../package.json')
const version = package.version
const childProcess = require('child_process')

console.log(`\n ⚙ Indie Web Server: building native binaries for version ${version}`)

const linuxVersionPath = `dist-iws/linux/${version}`
const macOSVersionPath = `dist-iws/macos/${version}`

fs.mkdirSync(linuxVersionPath, {recursive: true})
fs.mkdirSync(macOSVersionPath, {recursive: true})

async function build () {
  //
  // Zip the source.
  //
  console.log('   • Zipping up the source for inclusion in the binary…')

  const mainSourceDirectory = path.join(__dirname, '..')
  childProcess.execSync(String.raw`rm -f web-server.zip && zip web-server.zip * -x \*.git\* \*dist-iws\* -r`, {env: process.env, cwd: mainSourceDirectory})

  //
  // Build.
  //
  console.log('   • Building Linux version…')
  await compile({
    input: 'bin/web-server.js',
    output: `${linuxVersionPath}/web-server`,
    target: 'linux-x64-10.15.3',
    resources: ['package.json', 'bin/daemon.js', 'web-server.zip']
  })

  console.log('   • Building macOS version…')

  await compile({
    input: 'bin/web-server.js',
    output: `${macOSVersionPath}/web-server`,
    target: 'mac-x64-10.15.3'
  })

  //
  // Zip.
  //
  console.log('   • Zipping binaries…')

  const zipFileName = `${version}.zip`
  const linuxVersionWorkingDirectory = path.join(mainSourceDirectory, linuxVersionPath)
  const macOSVersionWorkingDirectory = path.join(mainSourceDirectory, macOSVersionPath)

  childProcess.execSync(`zip ${zipFileName} web-server`, {env: process.env, cwd: linuxVersionWorkingDirectory})
  childProcess.execSync(`zip ${zipFileName} web-server`, {env: process.env, cwd: macOSVersionWorkingDirectory})

  //
  // Copy to web site.
  //
  // Note: this requires a relative directory setup that matches what I have on my
  // ===== development machine (remember we are running in web-server/bin/):
  //
  // |
  // |- site                                <- Ind.ie Web Site source
  //     |_www/content/web-server/
  // |- hypha
  //     |_ web-server                      <- This project
  //
  // If it cannot find the Ind.ie Web Site, the build script will just skip this step.
  //
  const pathToWebServerSectionOfSite = path.join(__dirname, '../../../site/www/content/web-server/')

  // Check that the local working copy of the Indie Web Site exists at the relative location
  // that we expect it to. If it doesn’t skip this step.
  if (fs.existsSync(pathToWebServerSectionOfSite)) {
    console.log('   • Copying binaries to the Indie Web Site…')
    const linuxVersionZipFilePath = path.join(linuxVersionWorkingDirectory, zipFileName)
    const macOSVersionZipFilePath = path.join(macOSVersionWorkingDirectory, zipFileName)
    const linuxVersionTargetDirectoryOnSite = path.join(pathToWebServerSectionOfSite, 'linux')
    const macOSVersionTargetDirectoryOnSite = path.join(pathToWebServerSectionOfSite, 'macos')

    fs.mkdirSync(linuxVersionTargetDirectoryOnSite, {recursive: true})
    fs.mkdirSync(macOSVersionTargetDirectoryOnSite, {recursive: true})

    fs.copyFileSync(linuxVersionZipFilePath, path.join(linuxVersionTargetDirectoryOnSite, zipFileName))
    fs.copyFileSync(macOSVersionZipFilePath, path.join(macOSVersionTargetDirectoryOnSite, zipFileName))
  } else {
    console.log('   • Skipped copy of binaries to Indie Web Site as could not find the local working copy.')
  }

  console.log('   • Cleaning up…')

  childProcess.execSync('rm -f web-server.zip', {env: process.env, cwd: mainSourceDirectory})

  console.log('\n 😁👍 Done!\n')
}

build()
