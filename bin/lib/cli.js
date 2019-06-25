////////////////////////////////////////////////////////////////////////////////
//
// The command-line interface.
//
////////////////////////////////////////////////////////////////////////////////

const minimist = require('minimist')

class CommandLineInterface {

  // Initialise the command-line interface.
  initialise (args) {
    const options = minimist(args, {boolean: true})
    const positionalArguments = options._
    const arg0 = positionalArguments[0]

    // Note: for the version and help commands, we also accept the -v and --version forms as
    // ===== these are frequently used, even though version and help are commands and not options.
    //       We do not accept this form for any other command, however.
    const commands = [
      ['version', options.version === true || options.v === true || arg0 === 'version'],
      ['uninstall', arg0 === 'uninstall'],
      ['help', options.h === true || options.help === true || arg0 === 'help'],
      ['serve', arg0 === 'serve'],
      ['enable', arg0 === 'enable'],
      ['disable', arg0 === 'disable'],
      ['logs', arg0 === 'logs'],
      ['status', arg0 === 'status'],
    ]

    const command = commands.find(i => i[1])
    const commandExplicitlySupplied = command !== undefined

    // Set the command name and normalise the positional arguments.
    let commandName
    let commandPositionalArguments

    if (commandExplicitlySupplied) {
      commandName = command[0]
      // Remove the command name itself from the list of positional arguments.
      commandPositionalArguments = positionalArguments.slice(1)
    } else {
      // No explicit command supplied; default to 'serve'
      commandName = 'serve'
      commandPositionalArguments = positionalArguments
    }
    // Remove the positional arguments from the command line options object and
    // save the remaining named arguments.
    delete options._
    const commandNamedArguments = options

    // Note that this is included from bin/site.js and the path is relative to that script.
    const commandPath = `./commands/${commandName}`

    return {commandPath, args: {
      positional: commandPositionalArguments,
      named: commandNamedArguments
    }}
  }
}

module.exports = new CommandLineInterface()
