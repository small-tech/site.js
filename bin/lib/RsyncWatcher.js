////////////////////////////////////////////////////////////////////////////////
//
// Watch files and directories then sync them to the remote server using rsync.
//
// Fork of rysnc watcher by Mikhail Kalashnik <splurov@gmail.com>
// (http://mkln.ru/en/).
//
// You can find the original module at:
// https://github.com/Splurov/rsync-watch
//
// Original license: CC-BY-4.0.
//
// This version modified by: Aral Balkan and licensed under AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const chokidar = require('chokidar')
const Rsync = require('rsync')
const debounce = require('debounce')
const path = require('path')

const consoleTimestamp = require('./console-timestamp')

class RSyncWatcher {
  constructor (options) {
    this.options = options
    this.synchronisers = new Map()
    this.watchers = []

    const quit = () => {
      consoleTimestamp.log(`\n[stopping]`)

      for (let entry of this.synchronisers) {
          let synchroniser = entry[1]
          consoleTimestamp.log(`[sync stop] ${synchroniser.project}`)
          synchroniser.process.kill()
      }

      for (let watcher of this.watchers) {
          consoleTimestamp.log(`[watch stop] ${watcher.project}`)
          watcher.watcher.close()
      }

      process.exit()
    }

    process.on('SIGINT', quit) // run signal handler on CTRL-C
    process.on('SIGTERM', quit) // run signal handler on SIGTERM

    for (let project in this.options) {
      this.sync(project).then(() => {
          this.watch(project)
      }).catch(error => {
          consoleTimestamp.error(`[${project} | sync error] `, error)
      })
    }
  }


  sync(project) {
    const rsync = new Rsync()
    .exclude(this.options[project].exclude || [])
    .source(path.join(process.cwd(), this.options[project].from))
    .destination(this.options[project].to)

    for (let optionKey in (this.options[project].rsyncOptions || {})) {
      rsync.set(optionKey, this.options[project].rsyncOptions[optionKey]);
    }

    consoleTimestamp.log(`[sync start] ${project}`)

    return new Promise((resolve, reject) => {
      const rsyncProcess = rsync.execute((error, code, command) => {
        if (error) {
          reject(error)
          return
        }

        consoleTimestamp.log(`[sync finish] ${project} | ${command}`)
        resolve(rsyncProcess.pid)
      }, (data) => {
        process.stdout.write(`[sync] ${data.toString('ascii')}`)
      })

      rsyncProcess.on('close', () => {
        this.synchronisers.delete(rsyncProcess.pid)
      })

      this.synchronisers.set(rsyncProcess.pid, {project, process: rsyncProcess})
    })
  }

  watch(project) {
    const watcher = chokidar.watch(path.join(process.cwd(), this.options[project].from), {
      ignoreInitial: true,
      ignored: this.options[project].exclude || null,
      cwd: path.join(process.cwd(), this.options[project].from),
    })

    this.watchers.push({project, watcher})

    const syncDebounced = debounce(() => {
      this.sync(project)
      .catch(error => {
          consoleTimestamp.error(`[${project} | sync error] `, error)
      })
    }, 500)

    watcher
    .on('ready', function() {
        consoleTimestamp.log(`[watch] ${project}`);
    })
    .on('all', function(event, path) {
        consoleTimestamp.log(`[watch | ${event}] ${path}`);
        syncDebounced();
    })
    .on('error', function(error) {
        consoleTimestamp.error(`[${project} | watch error] `, error);
    })
  }
}

module.exports = RSyncWatcher
