const ansi = require('ansi-escape-sequences')

class CommandLineHelpers {

  // Format ansi strings.
  // Courtesy Bankai (https://github.com/choojs/bankai/blob/master/bin.js#L142)
  clr (text, color) {
    return process.stdout.isTTY ? ansi.format(text, color) : text
  }
}

module.exports = new CommandLineHelpers()
