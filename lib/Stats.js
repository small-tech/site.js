////////////////////////////////////////////////////////////////////////////////
//
// Anonymous, ephemeral server statistics for Site.js
//
////////////////////////////////////////////////////////////////////////////////

const fs = require('fs')
const crypto = require('crypto')

class Stats {

  constructor(statisticsRouteSettingFile = null) {
    this.startTime = new Date()

    // Sanity check.
    if (statisticsRouteSettingFile === null) {
      throw new Error('Error: Stats module constructor requires statistics route setting file path.')
    }

    this.requests = {}
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
      console.log('...', this.statisticsRouteSettingFile)
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
      response.on('finish', () => {
        if (response.statusCode === 404) {
          this.missing.add(request.path)
          // console.log('missing', this.missing)
        }
        this.requests[request.path] === undefined ? this.requests[request.path] = 1 : this.requests[request.path]++
        // console.log('requests', this.requests)
      })

      response.on('error', (error) => {
        console.log('Error, should we at this to stats?', error)
      })

      next()
    }
  }


  // Returns the view that renders the statistics.
  // TODO: Implement as WebSocket for live stats.
  get view () {
    return (request, response) => {

      const requestKeysToHtml = (keys) => {
        return keys.reduce((list, key) => list += `<li>${key}: ${this.requests[key]}</li>`, '')
      }

      const totalRequests = Object.keys(this.requests).reduce((total, key) => total += this.requests[key], 0)
      const sortedRequestKeys = Object.keys(this.requests).sort((a,b) => -(this.requests[a] - this.requests[b]))
      const topThreeRequestKeys = sortedRequestKeys.slice(0, 3)

      const none = '<li>None yet.</li>'
      const allRequestsList = requestKeysToHtml(sortedRequestKeys).replace(this.route, 'This page') || none
      const topThreeRequestsList = requestKeysToHtml(topThreeRequestKeys).replace(this.route, 'This page') || none

      const missingRequestsList = Array.from(this.missing).reduce((list, item) => list += `<li>${item}</li>`, '') || none

      response.end(`
        <h1>Stats</h1>

        <h2>Requests</h2>
        <p>${totalRequests}</p>

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

        <!-- 404s -->
        <h2>Missing</h2>
        <p>These are routes that have been requested but do not exist.</p>
        </ul>
          ${missingRequestsList}
        </ul>
      `)
    }
  }
}

module.exports = Stats
