////////////////////////////////////////////////////////////////////////////////
//
// Anonymous, ephemeral server statistics for Site.js
//
////////////////////////////////////////////////////////////////////////////////

class Stats {

  constructor() {
    this.startTime = new Date()

    this.hits = {}
    this.errors = {}
  }

  middleware() {
    return (request, response, next) => {
      response.on('finish', () => {
        this.hits[request.path] === undefined ? this.hits[request.path] = 1 : this.hits[request.path]++
        console.log(this.hits)
      })
      next()
    }
  }
}

module.exports = Stats
