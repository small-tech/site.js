//////////////////////////////////////////////////////////////////////
//
// Command: hugo
//
// Gives generic access to the built-in Hugo binary. For advanced
// use if you don’t have Hugo installed locally.
//
//////////////////////////////////////////////////////////////////////

const path = require('path')

const Graceful = require('node-graceful')

const Hugo = require('@small-tech/node-hugo')
const Site = require('../../index')

module.exports = function (args) {
  Site.logAppNameAndVersion()

  // Recreate the command-line arguments (that were parsed by the general CLI
  // (which is what we usually want) to pass to the Hugo process.
  const positionalArgs = args.positional.join(' ')
  const namedArgs = Object.entries(args.named).reduce((namedArgsString, currentValue) => {
    const [key, value] = currentValue
    return `${namedArgsString} --${key}=${value}`
  }, /* initialValue = */ '')

  const hugoArgs = `${positionalArgs}${namedArgs}`

  const hugo = new Hugo(path.join(Site.settingsDirectory, 'node-hugo'))

  console.log(`   🎠    ❨Site.js❩ Running Hugo with command ${hugoArgs}\n`)

  ;(async () => {
    if (positionalArgs.startsWith('server')) {
      //
      // This is a server request. Pass it to a method that pipes the
      // responses back instead of blocking.
      //

      let result
      try {
        result = await hugo.serverWithArgs(hugoArgs)
      } catch (error) {
        error.split('\n').forEach(line => {
          console.log(`${Site.HUGO_LOGO} ${line}`)
        })
        console.log('\n   ❌    Hugo encountered an error. Exiting… ')
        console.log('\n   💕    ❨Site.js❩ Goodbye!\n')
        process.exit(1)
      }

      const { hugoServerProcess, hugoBuildOutput } = result

      // At this point, the build process is complete and the .generated folder should exist.

      // Note: the following three handlers are repeated here from /index.js.
      // Listen for standard output and error output on the server instance.
      hugoServerProcess.stdout.on('data', (data) => {
        const lines = data.toString('utf-8').split('\n')
        lines.forEach(line => console.log(`${Site.HUGO_LOGO} ${line}`))
      })

      hugoServerProcess.stderr.on('data', (data) => {
        const lines = data.toString('utf-8').split('\n')
        lines.forEach(line => console.log(`${Site.HUGO_LOGO} [ERROR] ${line}`))
      })

      // Print the output received so far.
      hugoBuildOutput.split('\n').forEach(line => {
        console.log(`${Site.HUGO_LOGO} ${line}`)
      })

      // Handle graceful exit.
      goodbye = (done) => {
        console.log('\n   💃    ❨Site.js❩ Preparing to exit gracefully, please wait…\n')

        if (hugoServerProcess) {
          console.log('   🚮    ❨Site.js❩ Killing Hugo server process.')
          hugoServerProcess => hugoServerProcess.kill()
        }

        console.log('\n   💕    ❨Site.js❩ Goodbye!\n')
        done()
      }
      Graceful.on('SIGINT', this.goodbye)
      Graceful.on('SIGTERM', this.goodbye)
    } else {
      //
      // All other commands return when done so it’s ok if we block here.
      //
      let output = null
      try {
        output = await hugo.command(hugoArgs)
      } catch (error) {
        error.message.split('\n').forEach(line => {
          console.log(`${Site.HUGO_LOGO} ${line}`)
        })
        console.log('\n   ❌    Hugo encountered an error. Exiting… ')
        console.log('\n   💕    ❨Site.js❩ Goodbye!\n')
        process.exit(1)
      }
      output.split('\n').forEach(line => {
        console.log(`${Site.HUGO_LOGO} ${line}`)
      })
      console.log('\n   💕    ❨Site.js❩ Goodbye!\n')
    }
  })()
}
