////////////////////////////////////////////////////////////////////////////////
//
// Anonymous, ephemeral server statistics for Site.js
//
////////////////////////////////////////////////////////////////////////////////

const fs = require('fs')
const crypto = require('crypto')
const requestIp = require('request-ip')

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
      // Note: referrers are coming up as ::1 when testing on localhost (expected)
      // ===== and also via ngrok (unexpected). TODO: Note behaviour on a live server.
      const referrer = requestIp.getClientIp(request)

      if (referrer !== undefined) {
        this.referrers[referrer] === undefined ? this.referrers[referrer] = 1 : this.referrers[referrer]++
      }

      response.on('finish', () => {
        if (response.statusCode === 404) {
          this.missing.add(request.path)
        }
        this.requests[request.path] === undefined ? this.requests[request.path] = 1 : this.requests[request.path]++
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

      const none = '<li>None yet.</li>'
      const allRequestsList = requestKeysToHtml(sortedRequestKeys).replace(this.route, 'This page').replace(/\/admin.*?:/, 'Administration page:') || none
      const topThreeRequestsList = requestKeysToHtml(topThreeRequestKeys).replace(this.route, 'This page').replace(/\/admin.*?:/, 'Administration page:') || none

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
          </style>
        </head>
        <body>
          <h1>Stats</h1>

          <p><strong>Since:</strong> ${this.startTime}</p>

          <h2>Requests</h2>
          <p class='requests'>${totalRequests}</p>

          <h3>Top three</h3>
          <!-- Top three requests, in order -->
          <ul>
            ${topThreeRequestsList}
          </ul>

          <h3>All</h3>
          <!-- List all requests, in order -->
          <ul>
            ${allRequestsList}
          </ul>

          <h2>Referrers</h2>
          <ul>
            ${sortedReferrersList}
          </ul>

          <!-- 404s -->
          <h2>Missing</h2>
          <p>These are routes that have been requested but do not exist.</p>
          <ul>
            ${missingRequestsList}
          </ul>
        </body>
        </html>
      `)
    }
  }
}

module.exports = Stats
