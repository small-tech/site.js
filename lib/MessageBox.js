//////////////////////////////////////////////////////////////////////
//
// An ASCII message box that you can create asynchronously and
// render when ready.
//
// Copyright (c) 2020 Aral Balkan. (c) Small Technology Foundation
// Released under AGPL version 3 or later.
//
//////////////////////////////////////////////////////////////////////

const actualStringLength = require('string-length')

class MessageBox {
  constructor () {
    this.lines = []
  }

  line (line) {
    this.lines.push(line)
  }

  emptyLine() {
    this.lines.push('')
  }

  render() {
    // Create the box based on the length of the longest line.
    // With 1 space padding on each side of a passed line.
    const boxWidth = this.lines.reduce((longestLineLengthSoFar, currentLine) => Math.max(longestLineLengthSoFar, actualStringLength(currentLine)), /* initial longestLineLengthSoFar value is */ 0) + 2

    const repeat = (thisMany, character) => Array(thisMany).fill(character).join('')
    const renderLine = (line) => `    ║ ${line}${repeat(boxWidth - actualStringLength(line) - 1, ' ')}║\n`

    const horizontalLine = repeat(boxWidth, '═')
    const top = ` 🔔 ╔${horizontalLine}╗\n`
    const body = this.lines.reduce((body, currentLine) => `${body}${renderLine(currentLine)}`, /* initial body is */ '')
    const bottom = `    ╚${horizontalLine}╝\n`

    return top + renderLine('') + body + renderLine('') + bottom
  }

  print() {
    const box = this.render()
    console.log(box)
  }
}

module.exports = MessageBox
