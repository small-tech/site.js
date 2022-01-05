////////////////////////////////////////////////////////////////////////////////
//
// Anonymous, ephemeral server statistics for Site.js
//
////////////////////////////////////////////////////////////////////////////////

const fs = require('fs')
const crypto = require('crypto')

const secretHexademicalStringOf32CharactersOrMore = /[0-9,a-z]{32,}/g

class Stats {

  constructor(statisticsRouteSettingFile = null) {
    this.startTime = new Date()

    // Sanity check.
    if (statisticsRouteSettingFile === null) {
      throw new Error('Error: Stats module constructor requires statistics route setting file path.')
    }

    this.requests = {}
    this.referrers = {}
    this.errors = {}
    this.responseCodes = {}
    this.missing = new Set()

    this.statisticsRouteSettingFile = statisticsRouteSettingFile
    this._route = null
  }


  // Force a new route to be generated.
  refreshRoute() {
    fs.unlinkSync(this.statisticsRouteSettingFile)
    return this.route
  }


  // The route for the view.
  get route () {
    if (this._route !== null) {
      return this._route
    }

    // We haven’t loaded the route yet. Load or create it.
    if (!fs.existsSync(this.statisticsRouteSettingFile)) {
      // Generate a random route.
      this._route = `/${crypto.randomBytes(16).toString('hex')}`
      fs.writeFileSync(this.statisticsRouteSettingFile, this._route)
    } else {
      // Load the existing route.
      this._route = fs.readFileSync(this.statisticsRouteSettingFile, 'utf-8')
    }

    return this._route
  }


  // Returns the middleware that captures the statistics.
  get middleware () {
    return (request, response, next) => {
      let referrer = request.headers.referer

      if (referrer !== undefined) {
        referrer = referrer.replace(secretHexademicalStringOf32CharactersOrMore, '…')
        this.referrers[referrer] === undefined ? this.referrers[referrer] = 1 : this.referrers[referrer]++
      }

      response.on('finish', () => {
        // Certain requests can contain sensitive information (like secret cryptographically-secure
        // random URLs). Make sure we hide these before saving the request path.
        let requestPath = request.path
          .replace(this.route, 'This page')
          .replace(secretHexademicalStringOf32CharactersOrMore, '…')


        if (response.statusCode === 404) {
          this.missing.add(requestPath)
        }
        this.requests[requestPath] === undefined ? this.requests[requestPath] = 1 : this.requests[requestPath]++
      })

      response.on('error', (error) => {
        console.log('Error, should we add this to stats?', error)
      })

      next()
    }
  }


  // Returns the view that renders the statistics.
  // TODO: Implement as WebSocket for live stats.
  get view () {
    return (request, response) => {

      const requestKeysToHtml = (keys) => {
        return keys.reduce((list, key) => {

          let route = key
          if (this.missing.has(route)) {
            // Highlight the missing routes in red.
            route = `<span style='color: red;'>${route}</span>`
          }

          return list += `<li>${route}: ${this.requests[key]}</li>`
        }, '')
      }

      const referrersToHtml = (keys) => {
        return keys.reduce((list, key) => list += `<li>${key}: ${this.referrers[key]}</li>`, '')
      }


      const totalRequests = Object.keys(this.requests).reduce((total, key) => total += this.requests[key], 0)
      const sortedRequestKeys = Object.keys(this.requests).sort((a,b) => -(this.requests[a] - this.requests[b]))
      const topThreeRequestKeys = sortedRequestKeys.slice(0, 3)

      const sortedReferrers = Object.keys(this.referrers).sort((a, b) => -(this.referrers[a] - this.referrers[b]))

      const administrationFragmentRegExp = /^\/admin.*?$/
      const none = '<li>None yet.</li>'
      const allRequestsList = requestKeysToHtml(sortedRequestKeys).replace(this.route, 'This page').replace(administrationFragmentRegExp, 'Administration section') || none
      const topThreeRequestsList = requestKeysToHtml(topThreeRequestKeys).replace(this.route, 'This page').replace(administrationFragmentRegExp, 'Administration section') || none

      const sortedReferrersList = referrersToHtml(sortedReferrers) || none

      const missingRequestsList = Array.from(this.missing).reduce((list, item) => list += `<li>${item}</li>`, '') || none

      response.status(200)
      .type('html')
      .end(`
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            html {font-family: sans-serif; background-color: #eae7e1}
            body {padding-left: 2vw; padding-right: 2vw;}
            .requests { font-size: 10vw; font-weight: 200; line-height: 1; margin: 0; }
            ul { list-style: none; padding-left: 0; }
            li { padding: 0.25em 0; }
            li:nth-of-type(2n) { background-color: lightgray; }
            input[type='submit'] {
              font-size: 1.25em;
              background-color: #333;
              border: 1px solid black;
              border-radius: 0.25em;
              padding: 0.25em 2em;
              color: #eee;
            }
            code {
              font-size: 1.25em;
              background-color: #ccc;
              color: black;
              padding: 0.25em;
            }
          </style>
        </head>
        <body>
          <h1>Ephemeral Statistics</h1>

          <p><strong>Since:</strong> ${this.startTime}</p>

          <p><strong>To reset the statistics, restart the server using <code>site restart</code>.</strong></p>

          <form action ='${this.route}'><input type='submit' value='Load latest statistics' /></form>

          <h2 id='requests'>Requests</h2>

          <p class='requests'>${totalRequests}</p>

          <!-- List all requests, in order -->
          <ul>
            ${allRequestsList}
          </ul>

          <!-- 404s -->
          <h2 id='missing'>Missing</h2>
          <p>These are routes that have been requested but do not exist.</p>
          <ul>
            ${missingRequestsList}
          </ul>

          <h2 id='referrers'>Referrers</h2>
          <p>These are the URLs browsers have told us that links originate from.</p>
          <ul>
            ${sortedReferrersList}
          </ul>
        </body>

        <script>
          const secretHexademicalStringOf32CharactersOrMore = /[0-9,a-z]{32,}/g

          if (secretHexademicalStringOf32CharactersOrMore.exec(window.location) !== null) {
            // Hide the secret URL fragment so it is not accidentally displayed
            // in screenshots and is not added to the browser history.
            history.replaceState({}, '', window.location.href.replace(secretHexademicalStringOf32CharactersOrMore, 'stats'))
          }
        </script>
        </html>
      `)
    }
  }
}

module.exports = Stats
