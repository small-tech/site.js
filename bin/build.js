#!/usr/bin/env node

//////////////////////////////////////////////////////////////////////
//
// Builds Linux and macOS binaries of Site.js.
//
// Note: the build script is only supported on Linux at this time.
//
// Run with: npm run build
//
//////////////////////////////////////////////////////////////////////

const fs = require('fs')
const path = require('path')
const os = require('os')
const childProcess = require('child_process')

const { compile } = require('nexe')
const minimist = require('minimist')

const package = require('../package.json')

const cpuArchitecture = os.arch()

// Parse the commandline arguments.
const commandLineOptions = minimist(process.argv.slice(2), {boolean: true})

// Display help on syntax error or if explicitly requested.
if (commandLineOptions._.length !== 0 || commandLineOptions.h || commandLineOptions.help) {
  console.log('\n Usage: npm run build [--deploy] [--all] [--install]\n')
  process.exit()
}

// Check for deployment attempt on non-ARM processor and fail with helpful message.
if (commandLineOptions.deploy && cpuArchitecture !== 'arm') {
  console.log(`
 🤯 Error: Deployment is currently only supported on ARM processors.
  
 (Nexe cannot cross-compile to ARM yet so it’s the only platform where we can build for all supported platforms. As of version 12.8.0, all official builds of Site.js are compiled on a Raspberry Pi 3B+. This restriction will be removed once cross-compilation support for ARM is added to Nexe.)

 More info: https://github.com/nexe/nexe/issues/424
  `)
  process.exit()
}

// Get the version from the npm package configuration.
const version = package.version
const binaryName = 'site'
const windowsBinaryName = `${binaryName}.exe`

console.log(`\n ⚙ Site.js: building native binaries for version ${version}`)

const linuxX64Directory = path.join('dist', 'linux', version)
const macOsDirectory = path.join('dist', 'macos', version)
const windowsDirectory = path.join('dist', 'windows', version)

fs.mkdirSync(linuxX64Directory, {recursive: true})
fs.mkdirSync(macOsDirectory, {recursive: true})
fs.mkdirSync(windowsDirectory, {recursive: true})

const linuxX64BinaryPath = path.join(linuxX64Directory, binaryName)
const macOsBinaryPath = path.join(macOsDirectory, binaryName)
const windowsBinaryPath = path.join(windowsDirectory, windowsBinaryName)

const binaryPaths = {
  'linux': linuxX64BinaryPath,
  'darwin': macOsBinaryPath,
  'win32': windowsBinaryPath
}

const linuxX64Target = 'linux-x64-10.16.3'
const macOsTarget = 'mac-x64-10.16.3'
const windowsTarget = 'windows-x64-10.16.3'

// Only build for the current platform unless a deployment build is requested via --deploy.
const platform = os.platform()
const buildLinuxX64Version = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'x64')
const buildMacVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'darwin')
const buildWindowsVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'win32')

// TODO: UPDATE!!! x64 / ARM
const currentPlatformBinaryPath = binaryPaths[['linux', 'darwin', 'win32'].find(_ => _ === platform)]

//
// Resources
//
// These are assets and code that are necessary for Site.js to work but which
// Nexe’s automatic dependency analyser cannot find as they’re either non-code assets
// or code that’s not required/conditionally required by the main script. By adding
// them here, we tell Nexe to copy them into the binary regardless so they are
// available at runtime.
//

// Common resources.
const resources = [
  'package.json',    // Used to get the app’s version at runtime.
  'bin/commands/*',   // Conditionally required based on command-line argument.
  'node_modules/le-store-certbot/renewal.conf.tpl',  // Template used to write out the Let’s Encrypt renewal config.
]

//
// Platform-specific resources.
//

const linuxX64Resources = resources.concat([
  'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-linux-amd64'         // mkcert binary used by nodecert.
])

const macOsResources = resources.concat([
  'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-darwin-amd64'       // mkcert binary used by nodecert.
])

const windowsResources = resources.push([
  'node_modules/@ind.ie/nodecert/mkcert-bin/mkcert-v1.4.0-windows-amd64.exe'  // mkcert binary used by nodecert.
])

const input = 'bin/site.js'

//
// Start the build.
//

build()

async function build () {
  //
  // Build.
  //
  if (buildLinuxX64Version) {
    console.log('   • Building Linux version…')

    await compile({
      input,
      output    : linuxX64BinaryPath,
      target    : linuxX64Target,
      resources : linuxX64Resources
    })
  }

  if (buildMacVersion) {
    console.log('   • Building macOS version…')

    await compile({
      input,
      output    : macOsBinaryPath,
      target    : macOsTarget,
      resources : macOsResources
    })
  }

  if (buildWindowsVersion) {
    console.log('   • Building Windows version…')

    await compile({
      input,
      output    : windowsBinaryPath,
      target    : windowsTarget,
      resources : windowsResources
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
    const linuxX64WorkingDirectory = path.join(mainSourceDirectory, linuxX64Directory)
    const macOsWorkingDirectory = path.join(mainSourceDirectory, macOsDirectory)
    const windowsWorkingDirectory = path.join(mainSourceDirectory, windowsDirectory)

    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxX64WorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: macOsWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${windowsBinaryName}`, {env: process.env, cwd: windowsWorkingDirectory})

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
    const pathToInstallationScriptsFolderOnWebSite = path.join(pathToWebSite, 'installation-scripts')
    const pathToLinuxAndMacOSInstallationScriptFileOnWebSite = path.join(pathToInstallationScriptsFolderOnWebSite, 'install')
    const pathToWindowsInstallationScriptFileOnWebSite = path.join(pathToInstallationScriptsFolderOnWebSite, 'install.txt')

    // Check that a local working copy of the Site.js web site exists at the relative location
    // that we expect it to. If it doesn’t skip this step.
    if (fs.existsSync(pathToWebSite)) {
      console.log('   • Copying release binaries to the Site.js web site…')
      const linuxX64VersionZipFilePath = path.join(linuxX64WorkingDirectory, zipFileName)
      const macOsVersionZipFilePath = path.join(macOsWorkingDirectory, zipFileName)
      const windowsVersionZipFilePath = path.join(windowsWorkingDirectory, zipFileName)
      const linuxX64VersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'linux')
      const macOsVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'macos')
      const windowsVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'windows')

      fs.mkdirSync(linuxX64VersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(macOsVersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(windowsVersionTargetDirectoryOnSite, {recursive: true})

      fs.copyFileSync(linuxX64VersionZipFilePath, path.join(linuxX64VersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(macOsVersionZipFilePath, path.join(macOsVersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(windowsVersionZipFilePath, path.join(windowsVersionTargetDirectoryOnSite, zipFileName))

      // Write out a dynamic route with the latest version into the site. That endpoint will be used by the
      // auto-update feature to decide whether it needs to update.
      console.log('   • Adding dynamic version endpoint to Site.js web site.')
      const versionRoute = `module.exports = (request, response) => { response.end('${package.version}') }\n`
      fs.writeFileSync(pathToDynamicVersionRoute, versionRoute, {encoding: 'utf-8'})

      // Update the install file and deploy them to the Site.js web site.
      console.log('   • Updating the installation scripts and deploying them to Site.js web site.')

      // Linux and macOS.
      const linuxAndMacOSInstallScriptFile = path.join(mainSourceDirectory, 'script', 'install')
      let linuxAndMacOSInstallScript = fs.readFileSync(linuxAndMacOSInstallScriptFile, 'utf-8')
      linuxAndMacOSInstallScript = linuxAndMacOSInstallScript.replace(/\d+\.\d+\.\d+/g, package.version)
      fs.writeFileSync(linuxAndMacOSInstallScriptFile, linuxAndMacOSInstallScript)
      fs.copyFileSync(linuxAndMacOSInstallScriptFile, pathToLinuxAndMacOSInstallationScriptFileOnWebSite)

      // Windows.
      const windowsInstallScriptFile = path.join(mainSourceDirectory, 'script', 'windows')
      let windowsInstallScript = fs.readFileSync(windowsInstallScriptFile, 'utf-8')
      windowsInstallScript = windowsInstallScript.replace(/\d+\.\d+\.\d+/g, package.version)
      fs.writeFileSync(windowsInstallScriptFile, windowsInstallScript)
      fs.copyFileSync(windowsInstallScriptFile, pathToWindowsInstallationScriptFileOnWebSite)

    } else {
      console.log('   • No local working copy of Site.js web site found. Skipped copy of release binaries.')
    }
  }

  console.log('\n 😁👍 Done!\n')
}
