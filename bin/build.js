#!/usr/bin/env node

////////////////////////////////////////////////////////////
//
// Builds Linux and macOS binaries of Indie Web Server.
//
// Run with: npm run build
//
////////////////////////////////////////////////////////////

const fs = require('fs')
const path = require('path')
const os = require('os')
const childProcess = require('child_process')

const { compile } = require('nexe')
const minimist = require('minimist')

const package = require('../package.json')

// Parse the commandline arguments.
const commandLineOptions = minimist(process.argv.slice(2), {boolean: true})

// Display help on syntax error or if explicitly requested.
if (commandLineOptions._.length !== 0 || commandLineOptions.h || commandLineOptions.help) {
  console.log('\n Usage: npm run build [--deploy] [--all]\n')
  process.exit()
}

// Get the version from the npm package configuration.
const version = package.version

console.log(`\n ⚙ Indie Web Server: building native binaries for version ${version}`)

const linuxVersionPath = `dist/linux/${version}`
const macOSVersionPath = `dist/macos/${version}`

fs.mkdirSync(linuxVersionPath, {recursive: true})
fs.mkdirSync(macOSVersionPath, {recursive: true})

// Only build for the current platform unless a deployment build is requested via --deploy.
const platform = os.platform()
const buildLinuxVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux')
const buildMacVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'darwin')

// Start the build.
build()

async function build () {
  //
  // Build.
  //
  if (buildLinuxVersion) {
    console.log('   • Building Linux version…')

    await compile({
      input: 'bin/web-server.js',
      output: `${linuxVersionPath}/web-server`,
      target: 'linux-x64-10.15.3',
      resources: ['package.json', 'bin/commands/*', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.3.0-linux-amd64', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.3.0-linux-arm']
    })
  }


  if (buildMacVersion) {
    console.log('   • Building macOS version…')

    await compile({
      input: 'bin/web-server.js',
      output: `${macOSVersionPath}/web-server`,
      target: 'mac-x64-10.15.3',
      resources: ['package.json', 'bin/commands/*', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.3.0-darwin-amd64']
    })
  }


  // Only zip and copy files to the Indie Web Site if explicitly asked to.
  if (commandLineOptions.deploy) {
    //
    // Zip.
    //
    console.log('   • Zipping binaries…')

    // We use tar and gzip here instead of zip as unzip is not a standard
    // part of Linux distributions whereas tar and gzip are. We do not use
    // gzip directly as that does not maintain the executable flag on the binary.
    const zipFileName = `${version}.tar.gz`
    const mainSourceDirectory = path.join(__dirname, '..')
    const linuxVersionWorkingDirectory = path.join(mainSourceDirectory, linuxVersionPath)
    const macOSVersionWorkingDirectory = path.join(mainSourceDirectory, macOSVersionPath)

    childProcess.execSync(`tar -cvzf ${zipFileName} web-server`, {env: process.env, cwd: linuxVersionWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} web-server`, {env: process.env, cwd: macOSVersionWorkingDirectory})

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
  }

  console.log('\n 😁👍 Done!\n')
}
