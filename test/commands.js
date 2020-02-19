//
// Test command-line interface commands by executing them in the shell.
//
// Note: if you are using nvm, for these tests to pass, you must create symbolic
// ===== links from your /usr/local/bin folder to your current version of Node.
//
// e.g.,
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.0/bin/node /usr/local/bin/node
// sudo ln -s /home/aral/.nvm/versions/node/v12.16.0/bin/npm /usr/local/bin/npm
//

const test = require('tape')
const childProcess = require('child_process')

function options() {
  // Ensure that the command logs to console (as tests are being run with QUIET=true in the environment.)
  let env = Object.assign({}  , process.env)
  delete env['QUIET']
  return { env }
}

function cliHeader() {
  const version = require('../package.json').version
  return `
    💕 Site.js v${version} (running on Node ${process.version})

      ╔═══════════════════════════════════════════╗
      ║ Like this? Fund us!                       ║
      ║                                           ║
      ║ We’re a tiny, independent not-for-profit. ║
      ║ https://small-tech.org/fund-us            ║
      ╚═══════════════════════════════════════════╝
  `
}

function dehydrate (str) {
  if (typeof str !== 'string') {
    str = str.toString('utf-8')
  }
  return str.replace(/\s/g, '')
}

function outputForCommand(command) {
  return dehydrate(childProcess.execSync(command, options()))
}


test('[bin/commands] version', t => {
  t.plan(1)

  const command = 'bin/site.js version'
  const expectedOutput = dehydrate(cliHeader())

  const actualOutput = outputForCommand(command)

  t.strictEquals(actualOutput, expectedOutput, 'Actual output from command matches expected output')
  t.end()
})


test('[bin/commands] enable and disable', t => {
  t.plan(2)

  const enableCommand = 'bin/site.js enable test/site'
  const disableCommand = 'bin/site.js disable'

  const expectedOutputForEnableCommand = dehydrate(
  ` ${cliHeader()}

    😈 Launched as daemon on https://dev.ar.al serving test/site

    😈 Installed for auto-launch at startup.

    😁👍 You’re all set!`)

  const expectedOutputForDisableCommand = dehydrate(`${cliHeader()} 🎈 Server stopped and removed from startup.`)

  // Ensure server isn’t enabled first.
  try { outputForCommand(disableCommand) } catch (error) {
    // OK if this fails (it will fail if server wasn’t enabled).
  }

  const actualOutputForEnableCommand = outputForCommand(enableCommand)

  // Test enable.
  t.strictEquals(actualOutputForEnableCommand, expectedOutputForEnableCommand, 'Enable command: actual output matches expected output')

  const actualOutputForDisableCommand = outputForCommand(disableCommand)

  // Test disable
  t.strictEquals(actualOutputForDisableCommand, expectedOutputForDisableCommand, 'Disable command: actual output matches expected output')

  t.end()
})

