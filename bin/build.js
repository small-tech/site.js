#!/usr/bin/env node

//////////////////////////////////////////////////////////////////////
//
// Builds Linux x86 & ARM, macOS, and Windows 10 binaries of Site.js.
//
// Run with: npm run build
//       or: npm run deploy
//
//////////////////////////////////////////////////////////////////////

const fs              = require('fs-extra')
const path            = require('path')
const os              = require('os')
const childProcess    = require('child_process')
const { compile }     = require('nexe')
const minimist        = require('minimist')
const package         = require('../package.json')
const moment          = require('moment')
const cpuArchitecture = os.arch()

// Parse the commandline arguments.
const commandLineOptions = minimist(process.argv.slice(2), {boolean: true})

// Display help on syntax error or if explicitly requested.
if (commandLineOptions._.length !== 0 || commandLineOptions.h || commandLineOptions.help) {
  console.log('\n Usage: npm run build [--deploy] [--all] [--install] [--alpha] [--beta]\n')
  process.exit()
}

// Check for supported CPU architectures (currently only x86 and ARM)
if (cpuArchitecture !== 'x64' && cpuArchitecture !== 'arm') {
  console.log(`🤯 Error: The build script is currently only supported on x64 and ARM architectures.`)
  process.exit()
}

const releaseType     = commandLineOptions.alpha ? 'alpha' : (commandLineOptions.beta ? 'beta' : '')
const releaseTypeName = releaseType === '' ? 'release': releaseType
const releaseSuffix   = releaseType === '' ? '' : `-${releaseType}`

const nodeVersion = process.version.slice(1)

function presentBinaryVersion (binaryVersion) {
  const m = moment(binaryVersion, 'YYYYMMDDHHmmss')
  return `${m.format('MMMM Do YYYY')} at ${m.format('HH:mm:ss')}`
}

const binaryVersion     = moment(new Date()).format('YYYYMMDDHHmmss')
const sourceVersion     = package.version
const binaryName        = 'site'
const windowsBinaryName = `${binaryName}.exe`

console.log(`\n ⚙️ Site.js build started on ${presentBinaryVersion(binaryVersion)}.\n
    Build type    : ${releaseTypeName}
    Binary version: ${binaryVersion}
    Source version: ${sourceVersion}
    Node version  : ${nodeVersion}\n`)

// Write out the manifest file. This will be included in the build so that the binary knows what type of release it is.
// This allows it to modify its behaviour at runtime (e.g., auto-update from beta releases if it’s a beta release).
const manifest = {
  binaryVersion,
  sourceVersion,
  releaseType: releaseTypeName
}
fs.writeFileSync('manifest.json', JSON.stringify(manifest), 'utf-8')

const linuxX64Directory = path.join('dist', `linux${releaseSuffix}`,     binaryVersion)
const linuxArmDirectory = path.join('dist', `linux-arm${releaseSuffix}`, binaryVersion)
const macOsDirectory    = path.join('dist', `macos${releaseSuffix}`,     binaryVersion)
const windowsDirectory  = path.join('dist', `windows${releaseSuffix}`,   binaryVersion)

fs.mkdirSync(linuxX64Directory, {recursive: true})
fs.mkdirSync(linuxArmDirectory, {recursive: true})
fs.mkdirSync(macOsDirectory,    {recursive: true})
fs.mkdirSync(windowsDirectory,  {recursive: true})

const linuxX64BinaryPath = path.join(linuxX64Directory, binaryName       )
const linuxArmBinaryPath = path.join(linuxArmDirectory, binaryName       )
const macOsBinaryPath    = path.join(macOsDirectory,    binaryName       )
const windowsBinaryPath  = path.join(windowsDirectory,  windowsBinaryName)

const binaryPaths = {
  // Note: We have a special check for Linux on ARM, later.
  'linux': linuxX64BinaryPath,
  'darwin': macOsBinaryPath,
  'win32': windowsBinaryPath
}

// Note: Ensure that a Nexe build exists for the Node version you’re running as that is
// ===== what will be used. This is by design as you should be deploying with the Node
//       version that you’re developing and testing with. Pre-built Nexe base images are
//       downloaded from our own remote repository, not from the official Nexe releases
//       (so we can include platforms – like ARM – that aren’t covered yet by the
//       official releases).
const remote  = 'https://sitejs.org/nexe/'
const linuxX64Target = `linux-x64-${nodeVersion}`
const linuxArmTarget = `linux-arm-${nodeVersion}`
const macOsTarget    = `mac-x64-${nodeVersion}`
const windowsTarget  = `windows-x64-${nodeVersion}`

// Only build for the current platform unless a deployment build is requested via --deploy.
const platform = os.platform()
const buildLinuxX64Version = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'x64')
const buildLinuxArmVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'arm')
const buildMacVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'darwin')
const buildWindowsVersion = commandLineOptions.deploy || commandLineOptions.all || (platform === 'win32')

let currentPlatformBinaryPath = binaryPaths[['linux', 'darwin', 'win32'].find(_ => _ === platform)]
if (platform === 'linux' && cpuArchitecture === 'arm') { currentPlatformBinaryPath = linuxArmBinaryPath }

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
  'manifest.json',                             // App-specific metadata generated by this build script (version, etc.)
  'bin/commands/*',                            // Conditionally required based on command-line argument.

  // nexe@next does not appear to be making use of the pkg→assets setting in
  // the package.json files of modules. Instead, we specify the files here.
  // See: https://github.com/nexe/nexe/issues/758
  'node_modules/@small-tech/auto-encrypt-localhost/mkcert-bin/*',
  'node_modules/@small-tech/node-hugo/hugo-bin/*',

  // Not sure if this is a different regression in Nexe 4’s resolve dependencies.
  // Afaik, it was being included correctly before.
  'node_modules/@small-tech/instant/client/bundle.js'
]

const input = 'bin/site.js'

//
// Start the build.
//

build()

async function build () {
  //
  // Build.
  //

  // Move all the third-party binaries out of the node_modules folders so they
  // are not all included in the various builds.
  const nodeModulesPath = path.resolve(__dirname, '..', 'node_modules')

  const mkcertBinaryDirectoryPath = path.join(nodeModulesPath, '@small-tech', 'auto-encrypt-localhost', 'mkcert-bin')
  const hugoBinaryDirectoryPath   = path.join(nodeModulesPath, '@small-tech', 'node-hugo', 'hugo-bin')

  const mkcertTemporaryDirectoryPath = '/tmp/mkcert-bin/'
  const hugoTemporaryDirectoryPath   = '/tmp/hugo-bin/'

  fs.ensureDirSync(mkcertTemporaryDirectoryPath)
  fs.ensureDirSync(hugoTemporaryDirectoryPath)

  const mkcertBinaryName = fs.readdirSync(mkcertBinaryDirectoryPath).filter(fileName => fileName.startsWith('mkcert'))[0]

  if (mkcertBinaryName === undefined) {
    throw new Error('Panic: Could not find any mkcert binaries in', mkcertBinaryDirectoryPath)
  }

  const mkcertBinaryFilenameBase = mkcertBinaryName.match(/^mkcert-v\d+\.\d+\.\d+-/)[0]

  const hugoBinaryName = fs.readdirSync(hugoBinaryDirectoryPath).filter(fileName => fileName.startsWith('hugo'))[0]

  if (hugoBinaryName === undefined) {
    throw new Error('Panic: Could not find any Hugo binaries in', hugoBinaryDirectoryPath)
  }

  const hugoBinaryFilenameBase = hugoBinaryName.match(/^hugo-v\d+\.\d+\.\d+-/)[0]

  function removeMkcertBinary(platform) {
    const fileName = `${mkcertBinaryFilenameBase}${platform}`
    fs.moveSync(path.join(mkcertBinaryDirectoryPath, fileName), path.join(mkcertTemporaryDirectoryPath, fileName), {overwrite: true})
  }

  function removeHugoBinary(platform) {
    const fileName = `${hugoBinaryFilenameBase}${platform}`
    fs.moveSync(path.join(hugoBinaryDirectoryPath, fileName), path.join(hugoTemporaryDirectoryPath, fileName), {overwrite: true})
  }

  function restoreMkcertBinary(platform) {
    const fileName = `${mkcertBinaryFilenameBase}${platform}`
    fs.moveSync(path.join(mkcertTemporaryDirectoryPath, fileName), path.join(mkcertBinaryDirectoryPath, fileName))
  }

  function restoreHugoBinary(platform) {
    const fileName = `${hugoBinaryFilenameBase}${platform}`
    fs.moveSync(path.join(hugoTemporaryDirectoryPath, fileName), path.join(hugoBinaryDirectoryPath, fileName))
  }

  const platforms = ['darwin-amd64', 'linux-amd64', 'linux-arm', 'windows-amd64.exe']

  function removeAllMkcertPlatforms () {
    platforms.forEach(platform => {
      if (fs.existsSync(path.join(mkcertBinaryDirectoryPath, `${mkcertBinaryFilenameBase}${platform}`))) {
        removeMkcertBinary(platform)
      }
    })
  }

  function removeAllHugoPlatforms () {
    platforms.forEach(platform => {
      if (fs.existsSync(path.join(hugoBinaryDirectoryPath, `${hugoBinaryFilenameBase}${platform}`))) {
        removeHugoBinary(platform)
      }
    })
  }

  function restoreAllMkcertPlatforms () {
    platforms.forEach(platform => {
      if (fs.existsSync(path.join(mkcertTemporaryDirectoryPath, `${mkcertBinaryFilenameBase}${platform}`))) {
        restoreMkcertBinary(platform)
      }
    })
  }

  function restoreAllHugoPlatforms () {
    platforms.forEach(platform => {
      if (fs.existsSync(path.join(hugoTemporaryDirectoryPath, `${hugoBinaryFilenameBase}${platform}`))) {
        restoreHugoBinary(platform)
      }
    })
  }

  function stripForPlatform (platform) {
    removeAllMkcertPlatforms (platform)
    removeAllHugoPlatforms   (platform)
    restoreMkcertBinary      (platform)
    restoreHugoBinary        (platform)
  }

  // Unstrip at start in case last build failed.
  unstrip()

  function unstrip () {
    restoreAllMkcertPlatforms()
    restoreAllHugoPlatforms()
  }

  if (buildLinuxX64Version) {
    console.log('   • Building Linux version (x64)…')

    stripForPlatform('linux-amd64')

    await compile({
      input,
      remote,
      output    : linuxX64BinaryPath,
      target    : linuxX64Target,
      resources,
    })

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildLinuxArmVersion) {
    console.log('   • Building Linux version (ARM)…')

    stripForPlatform('linux-arm')

    await compile({
      input,
      remote,
      output    : linuxArmBinaryPath,
      target    : linuxArmTarget,
      resources,
    })

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildMacVersion) {
    console.log('   • Building macOS version…')

    stripForPlatform('darwin-amd64')

    await compile({
      input,
      remote,
      output    : macOsBinaryPath,
      target    : macOsTarget,
      resources,
    })

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildWindowsVersion) {
    console.log('   • Building Windows version…')

    stripForPlatform('windows-amd64.exe')

    await compile({
      input,
      remote,
      output    : windowsBinaryPath,
      target    : windowsTarget,
      resources,
    })

    unstrip()

    console.log('     Done ✔\n')
  }

  // Install the build for the current platform if requested.
  if (commandLineOptions.install) {
    //
    // Install.
    //

    // TODO: Implement the same logic as in update.js for handling
    // ===== the existing binary (on Windows) and for handling an
    //       active daemon.

    console.log('   • Installing locally…')
    const isWindows = process.platform === 'win32'
    if (isWindows) {
      const windowsInstallationDirectory =  'C:\\Program Files\\site.js'
      // Output instructions for installing
      console.log('\nTo install the binary on Windows, open a PowerShell window with administrator privileges and paste the following commands into it:\n')
      // Ensure the installation directory exists.
      console.log(`New-Item -Force -ItemType directory -Path "${windowsInstallationDirectory}"`)
      // Copy the binary into it.
      console.log(`Copy-Item -Force -Path "${path.resolve(currentPlatformBinaryPath)}" -Destination "${windowsInstallationDirectory}"`)
      console.log(`\nDont forget to add ${windowsInstallationDirectory} to your path.\n`)
    } else {
      childProcess.execSync(`sudo cp ${currentPlatformBinaryPath} /usr/local/bin`)
    }
  }

  // Only zip and copy files to the local working copy of the Site.js web site if explicitly asked to.
  if (commandLineOptions.deploy) {
    //
    // Zip.
    //
    console.log('   • Zipping binaries…')

    // We use tar and gzip here instead of zip as unzip is not a standard
    // part of Linux distributions whereas tar and gzip are. We do not use
    // gzip directly as that does not maintain the executable flag on the binary.
    const zipFileName              = `${binaryVersion}.tar.gz`
    const mainSourceDirectory      = path.join(__dirname, '..')
    const linuxX64WorkingDirectory = path.join(mainSourceDirectory, linuxX64Directory)
    const linuxArmWorkingDirectory = path.join(mainSourceDirectory, linuxArmDirectory)
    const macOsWorkingDirectory    = path.join(mainSourceDirectory, macOsDirectory   )
    const windowsWorkingDirectory  = path.join(mainSourceDirectory, windowsDirectory )

    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxX64WorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxArmWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: macOsWorkingDirectory   })
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
    //      |_ releases        The folder that release binaries are held.
    //
    // If it cannot find the Site.js web site, the build script will simply skip this step.
    //
    const pathToWebSite                                      = path.resolve(path.join(__dirname, '../../site/'))
    const pathToReleasesFolder                               = path.resolve(path.join(pathToWebSite, 'releases/'))
    const pathToDynamicVersionRoute                          = path.join(pathToWebSite, '.dynamic', 'version.js')
    const pathToInstallationScriptsFolderOnWebSite           = path.join(pathToWebSite, 'installation-scripts')
    const pathToLinuxAndMacOSInstallationScriptFileOnWebSite = path.join(pathToInstallationScriptsFolderOnWebSite, 'install')
    const pathToWindowsInstallationScriptFileOnWebSite       = path.join(pathToInstallationScriptsFolderOnWebSite, 'install.txt')

    // Check that a local working copy of the Site.js web site exists at the relative location
    // that we expect it to. If it doesn’t skip this step.
    if (fs.existsSync(pathToWebSite)) {
      console.log('   • Copying release binaries to the Site.js web site…')

      const linuxX64VersionZipFilePath           = path.join(linuxX64WorkingDirectory, zipFileName)
      const linuxArmVersionZipFilePath           = path.join(linuxArmWorkingDirectory, zipFileName)
      const macOsVersionZipFilePath              = path.join(macOsWorkingDirectory, zipFileName   )
      const windowsVersionZipFilePath            = path.join(windowsWorkingDirectory, zipFileName )

      const linuxX64VersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'linux'    )
      const linuxArmVersionTargetDirectoryOnSite = path.join(pathToReleasesFolder, 'linux-arm')
      const macOsVersionTargetDirectoryOnSite    = path.join(pathToReleasesFolder, 'macos'    )
      const windowsVersionTargetDirectoryOnSite  = path.join(pathToReleasesFolder, 'windows'  )

      fs.mkdirSync(linuxX64VersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(linuxArmVersionTargetDirectoryOnSite, {recursive: true})
      fs.mkdirSync(macOsVersionTargetDirectoryOnSite,    {recursive: true})
      fs.mkdirSync(windowsVersionTargetDirectoryOnSite,  {recursive: true})

      fs.copyFileSync(linuxX64VersionZipFilePath, path.join(linuxX64VersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(linuxArmVersionZipFilePath, path.join(linuxArmVersionTargetDirectoryOnSite, zipFileName))
      fs.copyFileSync(macOsVersionZipFilePath,    path.join(macOsVersionTargetDirectoryOnSite,    zipFileName))
      fs.copyFileSync(windowsVersionZipFilePath,  path.join(windowsVersionTargetDirectoryOnSite,  zipFileName))

      // Write out a dynamic route with the latest version into the site. That endpoint will be used by the
      // auto-update feature to decide whether it needs to update.
      console.log('   • Adding dynamic version endpoint to Site.js web site.')
      const versionRoute = `module.exports = (request, response) => { response.end('${binaryVersion}') }\n`
      fs.writeFileSync(pathToDynamicVersionRoute, versionRoute, {encoding: 'utf-8'})

      // Update the install file and deploy them to the Site.js web site.
      console.log('   • Updating the installation scripts and deploying them to Site.js web site.')

      //
      // Linux and macOS.
      //
      const linuxAndMacOSInstallScriptFile = path.join(mainSourceDirectory, 'script', 'install')
      let linuxAndMacOSInstallScript       = fs.readFileSync(linuxAndMacOSInstallScriptFile, 'utf-8')
      linuxAndMacOSInstallScript           = linuxAndMacOSInstallScript.replace(/\d+\.\d+\.\d+/g, binaryVersion)

      fs.writeFileSync(linuxAndMacOSInstallScriptFile, linuxAndMacOSInstallScript)
      fs.copyFileSync(linuxAndMacOSInstallScriptFile, pathToLinuxAndMacOSInstallationScriptFileOnWebSite)

      //
      // Windows.
      //
      const windowsInstallScriptFile = path.join(mainSourceDirectory, 'script', 'windows')
      let windowsInstallScript       = fs.readFileSync(windowsInstallScriptFile, 'utf-8')
      windowsInstallScript           = windowsInstallScript.replace(/\d+\.\d+\.\d+/g, binaryVersion)

      fs.writeFileSync(windowsInstallScriptFile, windowsInstallScript)
      fs.copyFileSync(windowsInstallScriptFile, pathToWindowsInstallationScriptFileOnWebSite)

    } else {
      console.log('   • No local working copy of Site.js web site found. Skipped copy of release binaries.')
    }
  }

  console.log('\n 😁👍 Done!\n')
}
