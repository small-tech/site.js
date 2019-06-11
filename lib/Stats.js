////////////////////////////////////////////////////////////////////////////////
//
// Anonymous, ephemeral server statistics for Site.js
//
////////////////////////////////////////////////////////////////////////////////

class Stats {

  constructor() {
    this.startTime = new Date()

    this.requests = {}
    this.errors = {}
    this.responseCodes = {}
    this.missing = new Set()
  }

  // Returns the middleware that captures the statistics.
  middleware() {
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
  view() {
    return (request, response) => {

      const requestKeysToHtml = (keys) => {
        return keys.reduce((list, key) => list += `<li>${key}: ${this.requests[key]}</li>`, '')
      }

      const totalRequests = Object.keys(this.requests).reduce((total, key) => total += this.requests[key], 0)
      const sortedRequestKeys = Object.keys(this.requests).sort((a,b) => -(this.requests[a] - this.requests[b]))
      const topThreeRequestKeys = sortedRequestKeys.slice(0, 3)

      const none = '<li>None yet.</li>'
      const allRequestsList = requestKeysToHtml(sortedRequestKeys) || none
      const topThreeRequestsList = requestKeysToHtml(topThreeRequestKeys) || none

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
