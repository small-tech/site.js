const fs = require('fs-extra')
const path = require('path')

const asyncForEach = require('../../lib/async-foreach')

async function generateContent (workingPath) {

  const absolutePathToServe = path.resolve(workingPath)

  // Delete the .generated folder so that a full
  // generation can happen as we’re about to deploy.
  const generatedContentPath = path.join(absolutePathToServe, '.generated')
  fs.removeSync(generatedContentPath)

  // Generate any Hugo content they might be.
  // Hugo source folder names must begin with either
  // .hugo or .hugo--. Anything after the first double-dash
  // specifies a custom mount path (double dashes are converted
  // to forward slashes when determining the mount path).
  const hugoSourceFolderPrefixRegExp = /^.hugo(--)?/

  const files = fs.readdirSync(absolutePathToServe)

  let hugo = null

  await asyncForEach(files, async file => {
    if (file.match(hugoSourceFolderPrefixRegExp)) {
      const hugoSourceDirectory = path.join(absolutePathToServe, file)

      let mountPath = '/'
      // Check for custom mount path naming convention.
      if (hugoSourceDirectory.includes('--')) {
        // Double dashes are translated into forward slashes.
        const fragments = hugoSourceDirectory.split('--')

        // Discard the first '.hugo' bit.
        fragments.shift()

        const _mountPath = fragments.reduce((accumulator, currentValue) => {
          return accumulator += `/${currentValue}`
        }, /* initial value = */ '')

        mountPath = _mountPath
      }

      if (fs.existsSync(hugoSourceDirectory)) {
        const sourceDetails = clr(`${file}${path.sep}`, 'green')
        console.log(`   🎠    ❨site.js❩ Building Hugo source at ${sourceDetails}`)

        // Create a node-hugo instance when first needed.
        if (hugo === null) {
          hugo = new Hugo(path.join(Site.settingsDirectory, 'node-hugo'))
        }

        const sourcePath = path.join(workingPath, file)
        const destinationPath = `../.generated${mountPath}`
        const baseURL = `https://${syncOptions.host}`

        // Run the Hugo build.
        try {
          const hugoBuildOutput = await hugo.build(sourcePath, destinationPath, baseURL)

          // Print the output received so far.
          hugoBuildOutput.split('\n').forEach(line => {
            console.log(`${Site.HUGO_LOGO} ${line}`)
          })
        } catch (error) {
          let errorMessage = error

          if (errorMessage.includes('--appendPort=false not supported when in multihost mode')) {
            errorMessage = 'Hugo’s Multilingual Multihost mode is not supported in Site.js.'
          }

          console.log(`\n   ❌    ${clr('❨site.js❩ Error:', 'red')} Could run Hugo build. ${errorMessage}\n`)
          process.exit(1)
        }
      }
    }
  })
}

module.exports = generateContent
