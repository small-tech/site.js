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

const linuxVersionPath = `dist/linux/${version}`
const macOSVersionPath = `dist/macos/${version}`

fs.mkdirSync(linuxVersionPath, {recursive: true})
fs.mkdirSync(macOSVersionPath, {recursive: true})

async function build () {
  //
  // Build.
  //
  console.log('   • Building Linux version…')
  await compile({
    input: 'bin/web-server.js',
    output: `${linuxVersionPath}/web-server`,
    target: 'linux-x64-10.15.3',
    resources: ['package.json', 'bin/daemon.js', 'node_modules/**/*']
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
  const linuxVersionWorkingDirectory = path.join(__dirname, '..', linuxVersionPath)
  const macOSVersionWorkingDirectory = path.join(__dirname, '..', macOSVersionPath)

  childProcess.execSync(`zip ${zipFileName} web-server`, {env: process.env, cwd: linuxVersionWorkingDirectory})
  childProcess.execSync(`zip ${zipFileName} web-server`, {env: process.env, cwd: macOSVersionWorkingDirectory})

  //
  // Copy to web site.
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

  console.log('\n 😁👍 Done!\n')
}

build()
