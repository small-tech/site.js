const { resolve } = require('resolve-dependencies')

;(async () => {
  const { entries, files } = await resolve({ entries: './index.js', loadContent: true })
  console.log(files)
})()

