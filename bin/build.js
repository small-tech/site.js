#!/usr/bin/env node

////////////////////////////////////////////////////////////
//
// Builds Linux and macOS binaries of Site.js.
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
  console.log('\n Usage: npm run build [--deploy] [--all] [--install]\n')
  process.exit()
}

// Get the version from the npm package configuration.
const version = package.version
const binaryName = 'site'
const windowsBinaryName = `${binaryName}.exe`

console.log(`\n ⚙ Site.js: building native binaries for version ${version}`)

const linuxVersionDirectory = path.join('dist', 'linux', version)
const macOsVersionDirectory = path.join('dist', 'macos', version)
const windowsVersionDirectory = path.join('dist', 'windows', version)

fs.mkdirSync(linuxVersionDirectory, {recursive: true})
fs.mkdirSync(macOsVersionDirectory, {recursive: true})
fs.mkdirSync(windowsVersionDirectory, {recursive: true})

const linuxVersionBinaryPath = path.join(linuxVersionDirectory, binaryName)
const macOsVersionBinaryPath = path.join(macOsVersionDirectory, binaryName)
const windowsVersionBinaryPath = path.join(windowsVersionDirectory, windowsBinaryName)

const binaryPaths = {
  'linux': linuxVersionBinaryPath,
  'darwin': macOsVersionBinaryPath,
  'win32': windowsVersionBinaryPath
}

// Only build for the current platform unless a deployment build is requested via --deploy.
const platform = os.platform()
const buildLinuxVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux')
const buildMacVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'darwin')
const buildWindowsVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'win32')

const currentPlatformBinaryPath = binaryPaths[['linux', 'darwin', 'win32'].find(_ => _ === platform)]

// Start the build.
build()

async function build () {
  //
  // Build.
  //
  if (buildLinuxVersion) {
    console.log('   • Building Linux version…')

    await compile({
      input: 'bin/site.js',
      output: linuxVersionBinaryPath,
      target: 'linux-x64-10.15.3',
      resources: ['package.json', 'bin/commands/*', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-linux-amd64', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-linux-arm']
    })
  }

  if (buildMacVersion) {
    console.log('   • Building macOS version…')

    await compile({
      input: 'bin/site.js',
      output: macOsVersionBinaryPath,
      target: 'mac-x64-10.15.3',
      resources: ['package.json', 'bin/commands/*', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-darwin-amd64']
    })
  }

  if (buildWindowsVersion) {
    console.log('   • Building Windows version…')

    await compile({
      input: 'bin/site.js',
      output: windowsVersionBinaryPath,
      target: 'windows-x64-10.15.3',
      resources: ['package.json', 'bin/commands/*', 'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-windows-amd64.exe']
    })
  }

  // Install the build for the current platform if requested.
  if (commandLineOptions.install) {
    //
    // Install.
    //
    console.log('   • Installing locally…')

    childProcess.execSync(`sudo cp ${currentPlatformBinaryPath} /usr/local/bin`)
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
    const linuxVersionWorkingDirectory = path.join(mainSourceDirectory, linuxVersionDirectory)
    const macOsVersionWorkingDirectory = path.join(mainSourceDirectory, macOsVersionDirectory)
    const windowsVersionWorkingDirectory = path.join(mainSourceDirectory, windowsVersionDirectory)

    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxVersionWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: macOsVersionWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${windowsBinaryName}`, {env: process.env, cwd: windowsVersionWorkingDirectory})

    //
    // Copy Site.js release binaries to the Site.js web site.
    //
    // Note: this requires a relative directory setup that matches the project structure
    // ===== of the Site.js source code repository. Remember we are running in:
    // site.js/app/bin/
    //
    // site.js
    //  |_ app                 This project.
    //  |   |_ bin             The folder that this script is running in.
    //  |_ site                The Site.js web site.
    //      |_ releases        The folder that releease binaries are held.
    //
    // If it cannot find the Site.js web site, the build script will simply skip this step.
    //
    const pathToWebSite = path.resolve(path.join(__dirname, '../../site/'))
    const pathToReleasesFolder = path.resolve(path.join(pathToWebSite, 'releases/'))
    const pathToDynamicVersionRoute = path.join(pathToWebSite, '.dynamic', 'version.js')
    const pathToInstallationScriptFolderOnWebSite = path.join(pathToWebSite, 'installation-script', 'install')

    // Check that a local working copy of the Site.js web site exists at the relative location
    // that we expect it to. If it doesn’t skip this step.
    if (fs.existsSync(pathToWebSite)) {
      console.log('   • Copying release binaries to the Site.js web site…')
      const linuxVersionZipFilePath = path.join(linuxVersionWorkingDirectory, zipFileName)
      const macOsVersionZipFilePath = path.join(macOsVersionWorkingDirectory, zipFileName)
      const windowsVersionZipFilePath = path.join(windowsVersionWorkingDirectory, zipFileName)
      const linuxVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'linux')
      const macOsVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'macos')
      const windowsVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'windows')

      fs.mkdirSync(linuxVersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(macOsVersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(windowsVersionTargetDirectoryOnSite, {recursive: true})

      fs.copyFileSync(linuxVersionZipFilePath, path.join(linuxVersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(macOsVersionZipFilePath, path.join(macOsVersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(windowsVersionZipFilePath, path.join(windowsVersionTargetDirectoryOnSite, zipFileName))

      // Write out a dynamic route with the latest version into the site. That endpoint will be used by the
      // auto-update feature to decide whether it needs to update.
      console.log('   • Adding dynamic version endpoint to Site.js web site.')
      const versionRoute = `module.exports = (request, response) => { response.end('${package.version}') }\n`
      fs.writeFileSync(pathToDynamicVersionRoute, versionRoute, {encoding: 'utf-8'})

      // Update the install file and deploy it to the Site.js web site.
      console.log('   • Updating the installation script and deploying it to Site.js web site.')
      const installScriptFile = path.join(mainSourceDirectory, 'script', 'install')
      let installScript = fs.readFileSync(installScriptFile, 'utf-8')
      installScript = installScript.replace(/\d+\.\d+\.\d+/g, package.version)
      fs.writeFileSync(installScriptFile, installScript)

      fs.copyFileSync(installScriptFile, pathToInstallationScriptFolderOnWebSite)
    } else {
      console.log('   • No local working copy of Site.js web site found. Skipped copy of release binaries.')
    }
  }

  console.log('\n 😁👍 Done!\n')
}
