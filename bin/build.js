#!/usr/bin/env node

///////////////////////////////////////////////////////////////////////////
//
// Builds Linux x86/ARM/ARM64, macOS, and Windows 10 binaries of Site.js.
//
// Run with: npm run build
//       or: npm run deploy
//
// The Site.js binary is built from a Nexe base image. If the images
// do not exist locally, they are automatically downloaded from the
// remote we host at site.js.
//
// Once downloaded, the Nexe base images are stored at ~/.nexe
//
// To update the Nexe base image for your platform, pass the
// --update-nexe option.
//
///////////////////////////////////////////////////////////////////////////

const fs              = require('fs-extra')
const path            = require('path')
const os              = require('os')
const childProcess    = require('child_process')
const { compile }     = require('nexe')
const minimist        = require('minimist')
const package         = require('../package.json')
const moment          = require('moment')
const Hugo            = require('@small-tech/node-hugo')
const Util            = require('../lib/Util')
const cpuArchitecture = os.arch()

// Parse the command-line arguments.
const commandLineOptions = minimist(process.argv.slice(2), {boolean: true})

const mainSourceDirectory = path.join(__dirname, '..')

// Display help on syntax error or if explicitly requested.
if (commandLineOptions._.length !== 0 || commandLineOptions.h || commandLineOptions.help) {
  console.log('\n Usage: npm run build [--deploy] [--all] [--install] [--alpha] [--beta] [--update-nexe]\n')
  process.exit()
}

// Check for supported CPU architectures (currently only x86 and ARM)
if (cpuArchitecture !== 'x64' && cpuArchitecture !== 'arm' && cpuArchitecture !== 'arm64') {
  console.log(`❌ Error: The build script is currently only supported on x64, ARM, and ARM64 architectures.\n`)
  process.exit(1)
}

// If this is a deployment build, ensure that the working directory is not dirty
// before proceeding. Deployment builds are tied to Git revisions and tags.
if (commandLineOptions.deploy && childProcess.execSync('git status').toString().match('working tree clean') === null) {
  console.log('❌ Error: Cannot deploy when working copy is dirty. Please commit or stash changes before retrying.\n')
  process.exit(1)
}

const websitePath = path.resolve(path.join(__dirname, '..', '..', 'site'))

if (commandLineOptions.deploy) {
  // Ensure that a working copy of the Site.js web site exists
  // locally where we ex[ect it to so we can deploy to it.
  if (!fs.existsSync(websitePath)) {
    console.log('❌ Error: No local working copy of Site.js web site found.\n')
    console.log(`   Please clone https://small-tech.org/site.js/site to ${websitePath}`)
    console.log('   (and ensure you have commit permissions on the repository) before attempting to deploy.\n')
    process.exit(1)
  }

  // Ensure that we are on the master branch.
  // (Deployments are only allowed from the master branch.)
  const gitBranch = (childProcess.execSync('git branch --show-current', {env: process.env, cwd: mainSourceDirectory})).toString().replace(/\n/g, '').trim()
  if (gitBranch !== 'master') {
    console.log(`❌ Error: Refusing to deploy non-master (${gitBranch}) branch.\n`)
    process.exit(1)
  }
}

//
// There are six elements that go into uniquely identifying a build:
//
// releaseChannel       : alpha, beta, or release. Releases on a releaseChannel check for updates on that releaseChannel.
// nodeVersion   : the version of Node that’s bundled in the build.
// hugoVersion   : the version of Hugo that’s bundled in the build.
// binaryVersion : unique version for the binary, a calendar version determined at build time.
// packageVersion: the semantic version specified in the npm package.
// sourceVersion : the commit hash that corresponds to the source bundled in this build.
//
// Each version element is useful in its own way.
//

const releaseChannel    = commandLineOptions.alpha ? 'alpha' : (commandLineOptions.beta ? 'beta' : 'release')
const nodeVersion       = process.version.slice(1)
const hugoVersion       = (new Hugo()).version
const binaryVersion     = moment(new Date()).format('YYYYMMDDHHmmss')
const packageVersion    = package.version
const sourceVersion     = (childProcess.execSync('git log -1 --oneline')).toString().trim().split(' ')[0]
const binaryName        = 'site'
const windowsBinaryName = `${binaryName}.exe`
const updateNexe        = commandLineOptions['update-nexe'] || false

if (updateNexe && (commandLineOptions.all || commandLineOptions.deploy)) {
  console.log('\n ❌ Error: Cannot update Nexe when more than one platform is specified (via --deploy or --all).')
  console.log('    (Nexe binary base images are built on the platform and architecture they are for.)\n')
  process.exit(1)
}

function presentBinaryVersion (binaryVersion) {
  const m = moment(binaryVersion, 'YYYYMMDDHHmmss')
  return `${m.format('MMMM Do YYYY')} at ${m.format('HH:mm:ss')}`
}

// Ensure that you cannot accidentally deploy the same source version (git hash) more than once.
const existingInstallationScriptTemplate = fs.readFileSync('installation-script-templates/install', 'utf-8')
const existingSourceVersionRegExp = new RegExp(`${releaseChannel}SourceVersion=([0-9a-fA-F]{7})`)
const existingSourceVersion = existingInstallationScriptTemplate.match(existingSourceVersionRegExp)[1]
const existingBinaryVersionRegExp = new RegExp(`${releaseChannel}BinaryVersion=(\\d{14})`)
const existingBinaryVersion = existingInstallationScriptTemplate.match(existingBinaryVersionRegExp)[1]

if (existingSourceVersion !== 'bedface' /* (the default) */ && sourceVersion === existingSourceVersion) {
  console.log(`❌ Error: You cannot deploy from the same source version twice in the same release channel.

   You’ve already deployed source version ${sourceVersion} in the ${releaseChannel} channel as binary version ${existingBinaryVersion}.

   If this is in error, please update the ${releaseChannel}SourceVersion variable in installation-script-templates/install.\n`)
  process.exit(1)
}

console.log(`\n ⚙️ Site.js build started on ${presentBinaryVersion(binaryVersion)}.\n
    Release channel: ${releaseChannel}
    Binary version : ${binaryVersion}
    Package version: ${packageVersion}
    Source version : ${sourceVersion}
    Node version   : ${nodeVersion}
    Hugo version   : ${hugoVersion}
`)

if (updateNexe) {
  console.log(' 📦 Asked to update Nexe base image (this will recompile Node and take a while).\n')
}

// Write out the manifest file. This will be included in the build so that the binary knows what type of release it is.
// This allows it to modify its behaviour at runtime (e.g., auto-update from beta releases if it’s a beta release).
const manifest = {
  binaryVersion,
  packageVersion,
  hugoVersion,
  sourceVersion,
  releaseChannel
}

const releaseChannelDirectory = path.join('dist', releaseChannel)
const linuxX64Directory       = path.join(releaseChannelDirectory, 'linux',       binaryVersion)
const linuxArmDirectory       = path.join(releaseChannelDirectory, 'linux-arm',   binaryVersion)
const linuxArm64Directory     = path.join(releaseChannelDirectory, 'linux-arm64', binaryVersion)
const macOsDirectory          = path.join(releaseChannelDirectory, 'macos',       binaryVersion)
const windowsDirectory        = path.join(releaseChannelDirectory, 'windows',     binaryVersion)

fs.ensureDirSync(releaseChannelDirectory)
fs.ensureDirSync(linuxX64Directory      )
fs.ensureDirSync(linuxArmDirectory      )
fs.ensureDirSync(linuxArm64Directory    )
fs.ensureDirSync(macOsDirectory         )
fs.ensureDirSync(windowsDirectory       )

const linuxX64BinaryPath   = path.join(linuxX64Directory,   binaryName       )
const linuxArmBinaryPath   = path.join(linuxArmDirectory,   binaryName       )
const linuxArm64BinaryPath = path.join(linuxArm64Directory, binaryName       )
const macOsBinaryPath      = path.join(macOsDirectory,      binaryName       )
const windowsBinaryPath    = path.join(windowsDirectory,    windowsBinaryName)

const binaryPaths = {
  // Note: We have a special check for Linux on ARM, later.
  'linux': linuxX64BinaryPath,
  'darwin': macOsBinaryPath,
  'win32': windowsBinaryPath
}

//
// Note: Ensure that a Nexe build exists for the Node version you’re running as that is
// ===== what will be used. This is by design as you should be deploying with the Node
//       version that you’re developing and testing with. Pre-built Nexe base images are
//       downloaded from our own remote repository, not from the official Nexe releases
//       (so we can include platforms – like ARM – that aren’t covered yet by the
//       official releases). If the --update-nexe option is passed, instead of the remote
//       image, the Nexe base image for your platform is recreated using your current
//       version of Node.js.
//

// One of these will be added to the compile options based on whether --update-nexe is true.
const remote           = 'https://sitejs.org/nexe/'
const build            = true

const linuxX64Target   = `linux-x64-${nodeVersion}`
const linuxArmTarget   = `linux-arm-${nodeVersion}`
const linuxArm64Target = `linux-arm64-${nodeVersion}`
const macOsTarget      = `mac-x64-${nodeVersion}`
const windowsTarget    = `windows-x64-${nodeVersion}`

// Only build for the current platform unless a deployment build is requested via --deploy.
const platform = os.platform()
const buildLinuxX64Version   = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'x64')
const buildLinuxArmVersion   = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'arm')
const buildLinuxArm64Version = commandLineOptions.deploy || commandLineOptions.all || (platform === 'linux' && cpuArchitecture === 'arm64')
const buildMacVersion        = commandLineOptions.deploy || commandLineOptions.all || (platform === 'darwin')
const buildWindowsVersion    = commandLineOptions.deploy || commandLineOptions.all || (platform === 'win32')

let currentPlatformBinaryPath = binaryPaths[['linux', 'darwin', 'win32'].find(_ => _ === platform)]
if (platform === 'linux' && cpuArchitecture === 'arm'  ) { currentPlatformBinaryPath = linuxArmBinaryPath   }
if (platform === 'linux' && cpuArchitecture === 'arm64') { currentPlatformBinaryPath = linuxArm64BinaryPath }

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
  'node_modules/@small-tech/instant/client/bundle.js',
]

const input = 'bin/site.js'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Build.
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

//
// Start the build.
//

buildBinary()

async function buildBinary () {
  //
  // Build.
  //

  // Move all the third-party binaries out of the node_modules folders so they
  // are not all included in the various builds.
  const nodeModulesPath = path.resolve(__dirname, '..', 'node_modules')

  if (commandLineOptions.deploy) {
    //
    // Rebuild node_modules to ensure that all dependencies are as we expect them.
    //
    console.log('   • Rebuilding node modules before creating deployment builds…')

    fs.removeSync(nodeModulesPath)
    childProcess.execSync('npm i', {env: process.env, cwd: mainSourceDirectory})
  }

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
    fs.moveSync(path.join(mkcertTemporaryDirectoryPath, fileName), path.join(mkcertBinaryDirectoryPath, fileName), {overwrite: true})
  }

  function restoreHugoBinary(platform) {
    const fileName = `${hugoBinaryFilenameBase}${platform}`
    fs.moveSync(path.join(hugoTemporaryDirectoryPath, fileName), path.join(hugoBinaryDirectoryPath, fileName), {overwrite: true})
  }

  const platforms = ['darwin-amd64', 'linux-amd64', 'linux-arm', 'linux-arm64', 'windows-amd64.exe']

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

  function stripForPlatform  (platform) {
    removeAllMkcertPlatforms ()
    removeAllHugoPlatforms   ()
    restoreMkcertBinary      (platform)
    restoreHugoBinary        (platform)
  }

  function writeManifestForPlatformAndArchitecture (platform, architecture) {
    manifest.platform = platform
    manifest.architecture = architecture
    fs.writeFileSync('manifest.json', JSON.stringify(manifest), 'utf-8')
  }

  // Unstrip at start in case last build failed.
  unstrip()

  function unstrip () {
    restoreAllMkcertPlatforms()
    restoreAllHugoPlatforms()
  }

  if (buildLinuxX64Version) {
    console.log('   • Building Linux version (x64)…')

    writeManifestForPlatformAndArchitecture('linux', 'x64')

    stripForPlatform('linux-amd64')

    await compile(Object.assign({
      input,
      output    : linuxX64BinaryPath,
      target    : linuxX64Target,
      resources,
    }, updateNexe ? {build} : {remote}))

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildLinuxArmVersion) {
    console.log('   • Building Linux version (ARM)…')

    writeManifestForPlatformAndArchitecture('linux', 'arm')

    stripForPlatform('linux-arm')

    await compile(Object.assign({
      input,
      output    : linuxArmBinaryPath,
      target    : linuxArmTarget,
      resources,
    }, updateNexe ? {build} : {remote}))

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildLinuxArm64Version) {
    console.log('   • Building Linux version (ARM64)…')

    writeManifestForPlatformAndArchitecture('linux', 'arm64')

    stripForPlatform('linux-arm')

    await compile(Object.assign({
      input,
      output    : linuxArm64BinaryPath,
      target    : linuxArm64Target,
      resources,
    }, updateNexe ? {build} : {remote}))

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildMacVersion) {
    console.log('   • Building macOS version…')

    writeManifestForPlatformAndArchitecture('macOS', 'x64')

    stripForPlatform('darwin-amd64')

    await compile(Object.assign({
      input,
      output    : macOsBinaryPath,
      target    : macOsTarget,
      resources,
    }, updateNexe ? {build} : {remote}))

    unstrip()

    console.log('     Done ✔\n')
  }

  if (buildWindowsVersion) {
    console.log('   • Building Windows version…')

    // For sync support on Windows, include our own portable bundle of rsync and ssh running under cygwin.
    // We don’t need this included for any other platform.
    const windowsResources = resources.slice(0) // make a copy of the resources array
    windowsResources.push('node_modules/@small-tech/portable-rsync-with-ssh-for-windows/**/*')

    writeManifestForPlatformAndArchitecture('windows', 'x64')

    stripForPlatform('windows-amd64.exe')

    await compile(Object.assign({
      input,
      output    : windowsBinaryPath,
      target    : windowsTarget,
      resources : windowsResources,
    }, updateNexe ? {build} : {remote}))

    unstrip()

    console.log('     Done ✔\n')
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Install.
  //
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Install the build for the current platform if requested.
  if (commandLineOptions.install) {
    //
    // Install.
    //

    // Disable the site server if it is enabled
    try {
      childProcess.execSync('QUIET=true site disable')
    } catch (error) {
      // Ignore error. It just means Site.js was not enabled; which is what we want.
    }

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

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Update Nexe.
  //
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  if (updateNexe) {
    // At this point, the new Nexe binary will be at ~/.nexe/<node version>/out/Release/node and
    // needs to be copied to ~/.nexe/<platform>-<cpu architecture>-<node version>

    const nexeBaseBinariesPath = path.join(Util.unprivilegedHomeDirectory(), '.nexe')
    const compiledNexeBaseBinaryPath = path.join(nexeBaseBinariesPath, nodeVersion, 'out', 'Release', 'node')
    const nexeBaseBinaryNewName = `${platform}-${cpuArchitecture}-${nodeVersion}`
    const nexeBaseBinaryNewPath = path.join(nexeBaseBinariesPath, nexeBaseBinaryNewName)

    try {
      fs.copyFileSync(compiledNexeBaseBinaryPath, nexeBaseBinaryNewPath)
    } catch (error) {
      console.log(`\n ❌ Error: could not copy new Nexe base binary from ${compiledNexeBaseBinaryPath} to ${nexeBaseBinaryNewPath}.\n`, error)
      process.exit(1)
    }

    console.log('\n 📦 New Nexe base image is ready at ${nexeBaseBinaryNewPath}\n')
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Deploy.
  //
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Only zip and copy files to the local working copy of the Site.js web site if explicitly asked to.
  // Check that a local working copy of the Site.js web site exists at the relative location
  // that we expect it to. If it doesn’t skip this step.
  if (commandLineOptions.deploy) {

    // Update the install file and deploy them to the Site.js web site.
    console.log('   • Updating the installation scripts and copying them to local Site.js web site working copy.')

    const installationScriptTemplatesFolder = path.join(mainSourceDirectory, 'installation-script-templates')

    // Check again that the wokring tree is clean. We just did an npm install
    // so if the tree is not clean, it’s because the package-lock.json file has
    // changed and that means that there is something unexpected in the node_modules.
    if (childProcess.execSync('git status').toString().match('working tree clean') === null) {
      console.log('❌ Error: Working copy is dirty after npm i. Please take a look at your package-lock.json and commit it before retrying.\n')
      process.exit(1)
    }

    const INDEX                                  = 'index.js'
    const websitePathForBinaries                 = path.resolve(path.join(websitePath, 'binaries', releaseChannel))
    const websitePathForVersionRoutesFolder      = path.join(websitePath, '.dynamic', 'version')
    const websitePathForBinaryVersionRouteFolder = path.join(websitePathForVersionRoutesFolder, releaseChannel)
    const websitePathForBinaryVersionRouteFile   = path.join(websitePathForBinaryVersionRouteFolder, INDEX)
    const websitePathForInstallScripts           = path.join(websitePath, 'installation-scripts')
    const websitePathForLinuxAndMacInstallScript = path.join(websitePathForInstallScripts, 'install')
    const websitePathForWindowsInstallScript     = path.join(websitePathForInstallScripts, 'install.txt')

    // Ensure website version route folders exist
    fs.ensureDirSync(websitePathForVersionRoutesFolder)
    fs.ensureDirSync(websitePathForBinaryVersionRouteFolder)

    //
    // Linux and macOS.
    //

    const linuxAndMacOSInstallScriptFile = path.join(installationScriptTemplatesFolder, 'install')

    const binaryVersionVariableName = `${releaseChannel}BinaryVersion`
    const binaryVersionVariable = `${binaryVersionVariableName}=${binaryVersion}`
    const binaryVersionRegExp = new RegExp(`${binaryVersionVariableName}=\\d{14}`)

    const sourceVersionVariableName = `${releaseChannel}SourceVersion`
    const sourceVersionVariable = `${sourceVersionVariableName}=${sourceVersion}`
    const sourceVersionRegExp = new RegExp(`${sourceVersionVariableName}=[0-9a-fA-F]{7}`)

    const packageVersionVariableName = `${releaseChannel}PackageVersion`
    const packageVersionVariable = `${packageVersionVariableName}=${packageVersion}`
    const packageVersionRegExp = new RegExp(`${packageVersionVariableName}=\\d+\\.\\d+\\.\\d+`)

    let linuxAndMacOSInstallScript
    linuxAndMacOSInstallScript = fs.readFileSync(linuxAndMacOSInstallScriptFile, 'utf-8')
    linuxAndMacOSInstallScript = linuxAndMacOSInstallScript.replace(binaryVersionRegExp, binaryVersionVariable)
    linuxAndMacOSInstallScript = linuxAndMacOSInstallScript.replace(sourceVersionRegExp, sourceVersionVariable)
    linuxAndMacOSInstallScript = linuxAndMacOSInstallScript.replace(packageVersionRegExp, packageVersionVariable)

    // As we have three different release types, each with a different version, we need to persist
    // the template with the other values. Changes should be checked into the repository.
    fs.writeFileSync(linuxAndMacOSInstallScriptFile, linuxAndMacOSInstallScript)
    fs.copyFileSync(linuxAndMacOSInstallScriptFile, websitePathForLinuxAndMacInstallScript)

    //
    // Windows.
    //
    // (Note: Windows script does not support alpha and beta builds.)
    //

    if (releaseChannel === 'release') {
      const windowsInstallScriptFile = path.join(installationScriptTemplatesFolder, 'windows')

      let windowsInstallScript
      windowsInstallScript = fs.readFileSync(windowsInstallScriptFile, 'utf-8')
      windowsInstallScript = windowsInstallScript.replace(/\d{14}/g, binaryVersion)
      windowsInstallScript = windowsInstallScript.replace(/\/[0-9a-fA-F]{7}\)/g, `/${sourceVersion})`)
      windowsInstallScript = windowsInstallScript.replace(/\d+\.\d+\.\d+/g, packageVersion)

      fs.writeFileSync(websitePathForWindowsInstallScript, windowsInstallScript)
    } else {
      console.log(`   • This is a ${releaseChannel} build, not updating the Windows install script as ${releaseChannel} builds are not supported on Windows.`)
    }

    //
    // Commit the installation script changes.
    //
    console.log('   • Committing and pushing latest generated installation script…')

    childProcess.execSync('git add installation-script-templates/install')
    childProcess.execSync(`git commit -m "Update installation script for ${manifest.releaseChannel} version ${manifest.packageVersion}"`)
    childProcess.execSync('git push')

    //
    // Tag the release and push tags.
    //
    console.log('   • Tagging the release and pushing tags…')

    const capitaliseFirstLetter = word => `${word.slice(0,1).toUpperCase()}${word.slice(1)}`
    childProcess.execSync(`git tag -s ${binaryVersion} -m '${capitaliseFirstLetter(manifest.releaseChannel)} (package version: ${manifest.packageVersion}, source version: ${manifest.sourceVersion})'`)
    childProcess.execSync('git push --tags')

    //
    // Zip.
    //
    console.log('   • Zipping binaries…')

    // We use tar and gzip here instead of zip as unzip is not a standard
    // part of Linux distributions whereas tar and gzip are. We do not use
    // gzip directly as that does not maintain the executable flag on the binary.
    const zipFileName                = `${binaryVersion}.tar.gz`
    const linuxX64WorkingDirectory   = path.join(mainSourceDirectory, linuxX64Directory  )
    const linuxArmWorkingDirectory   = path.join(mainSourceDirectory, linuxArmDirectory  )
    const linuxArm64WorkingDirectory = path.join(mainSourceDirectory, linuxArm64Directory)
    const macOsWorkingDirectory      = path.join(mainSourceDirectory, macOsDirectory     )
    const windowsWorkingDirectory    = path.join(mainSourceDirectory, windowsDirectory   )

    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxX64WorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxArmWorkingDirectory})
    childProcess.execSync(`tar -cvzf ${zipFileName} ${binaryName}`, {env: process.env, cwd: linuxArm64WorkingDirectory})
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
    //  |_ app                    This project.
    //  |   |_ bin                The folder that this script is running in.
    //  |_ site                   The Site.js web site.
    //      |_ version/
    //      |    |_ index.js      (Dynamic) Returns source version (for compatibility with versions prior to 12.11.0)
    //      |    |_ alpha
    //      |    |    |_ index.js (Dynamic) If it exists, returns latest alpha releaseChannel version.
    //      |    |_ beta
    //      |    |    |_ index.js (Dynamic) If it exists, returns latest beta releaseChannel version.
    //      |    |_ release
    //      |         |_ index.js (Dynamic) If it exists, returns latest release releaseChannel version.
    //      |_ binaries
    //           |_ alpha         (12.11.0+) Contains alpha releases.
    //           |_ beta          (12.11.0+) Contains beta releases.
    //           |_ release       (12.11.0+) Contains release versions

    //
    // If it cannot find the Site.js web site, the build script will simply skip this step.
    //

    console.log('   • Copying release binaries to the Site.js web site…')

    const linuxX64VersionZipFilePath    = path.join(linuxX64WorkingDirectory,   zipFileName)
    const linuxArmVersionZipFilePath    = path.join(linuxArmWorkingDirectory,   zipFileName)
    const linuxArm64VersionZipFilePath  = path.join(linuxArm64WorkingDirectory, zipFileName)
    const macOsVersionZipFilePath       = path.join(macOsWorkingDirectory,      zipFileName)
    const windowsVersionZipFilePath     = path.join(windowsWorkingDirectory,    zipFileName)

    const websitePathForLinuxX64Version   = path.join(websitePathForBinaries, 'linux'      )
    const websitePathForLinuxArmVersion   = path.join(websitePathForBinaries, 'linux-arm'  )
    const websitePathForLinuxArm64Version = path.join(websitePathForBinaries, 'linux-arm64')
    const websitePathForMacVersion        = path.join(websitePathForBinaries, 'macos'      )
    const websitePathForWindowsVersion    = path.join(websitePathForBinaries, 'windows'    )

    fs.ensureDirSync(websitePathForBinaries, {recursive: true})
    fs.ensureDirSync(websitePathForLinuxX64Version  )
    fs.ensureDirSync(websitePathForLinuxArmVersion  )
    fs.ensureDirSync(websitePathForLinuxArm64Version)
    fs.ensureDirSync(websitePathForMacVersion       )
    fs.ensureDirSync(websitePathForWindowsVersion   )

    fs.copyFileSync(linuxX64VersionZipFilePath,   path.join(websitePathForLinuxX64Version,   zipFileName))
    fs.copyFileSync(linuxArmVersionZipFilePath,   path.join(websitePathForLinuxArmVersion,   zipFileName))
    fs.copyFileSync(linuxArm64VersionZipFilePath, path.join(websitePathForLinuxArm64Version, zipFileName))
    fs.copyFileSync(macOsVersionZipFilePath,      path.join(websitePathForMacVersion,        zipFileName))
    fs.copyFileSync(windowsVersionZipFilePath,    path.join(websitePathForWindowsVersion,    zipFileName))

    // Write out a dynamic route on the SiteJS.org web site to return the binary version. This endpoint is used by
    // the auto-update feature to decide whether the binary should be updated.
    console.log(`   • Adding dynamic binary version endpoint for ${releaseChannel} version to Site.js web site.`)
    const binaryVersionRoute = `module.exports = (request, response) => { response.end('${binaryVersion}') }\n`
    fs.writeFileSync(websitePathForBinaryVersionRouteFile, binaryVersionRoute, {encoding: 'utf-8'})
  }

  console.log('\n 😁👍 Done!\n')
}
