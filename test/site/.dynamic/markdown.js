const md = require('markdown-it')()

function markdown (request, response, next) {
  const html = md.render(`
  # Markdown

  - Is
  - __Loads__
  - Of
  - Fun!
  `)
  response.html(`
    <!doctype html>
    <html lang="en" style="font-family: sans-serif; background-color: #eae7e1">
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Example</title>
      </head>
      <body style="display: grid; align-items: center; justify-content: center; height: 100vh; vertical-align: top; margin: 0;">
        <main style="font-size: 2rem;">${html}</main>
      </body>
    </html>
  `)
}

module.exports = markdown
