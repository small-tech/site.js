const md = require('markdown-it')()

function markdown (request, response, next) {
  const html = md.render(`
  # Markdown

    - Is
    - Lots
    - Of
    - Fun!
  `)
  response.end(html)
}

module.exports = markdown
