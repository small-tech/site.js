//////////////////////////////////////////////////////////////////////
//
// Function: status (synchronous)
//
// Returns the Site.js server daemon status.
//
// Proxies: systemctl status site.js
//
//////////////////////////////////////////////////////////////////////

const fs                    = require('fs')
const path                  = require('path')
const childProcess          = require('child_process')
const crossPlatformHostname = require('@small-tech/cross-platform-hostname')

const Site         = require('../../')

function status () {

  const isWindows = process.platform === 'win32'
  if (isWindows) {
    // Daemons are not supported on Windows so we know for sure that it is
    // neither active nor enabled :)
    return { isActive: false, isEnabled: false }
  }

  // Note: do not call ensure.systemctl() here as it will
  // ===== create a cyclic dependency. Instead, check for
  //       systemctl support manually before calling status().

  let isActive
  try {
    childProcess.execSync('systemctl is-active site.js', {env: process.env, stdio: 'pipe'})
    isActive = true
  } catch (error) {
    isActive = false
  }

  let isEnabled
  try {
    childProcess.execSync('systemctl is-enabled site.js', {env: process.env, stdio: 'pipe'})
    isEnabled = true
  } catch (error) {
    isEnabled = false
  }

  let daemonDetails = null
  if (isEnabled) {
    // Parse the systemd unit configuration file to retrieve daemon details.
    const configuration = fs.readFileSync(path.join(path.sep, 'etc', 'systemd', 'system', 'site.js.service'), 'utf-8').trim().split('\n')

    const account = configuration[8].trim().replace('User=', '')
    const execStart = configuration[14].trim()

    // Launch configuration.
    const binaryAndPathBeingServed = /ExecStart=(.*?) (.*?) @hostname/.exec(execStart)
    const siteJSBinary = binaryAndPathBeingServed[1]
    const pathBeingServed = binaryAndPathBeingServed[2]

    // Optional options.
    let _domain, _aliases
    const domain = (_domain = /--domain=(.*?)(\s|--|$)/.exec(execStart)) === null ? null : _domain[1]
    const aliases = (_aliases = /--aliases=(.*?)(\s|--|$)/.exec(execStart)) === null ? null : _aliases[1].split(',')
    const skipDomainReachabilityCheck = execStart.includes('--skip-domain-reachability-check')

    let statisticsUrl = null
    if (isActive) {
      const statisticsPath = fs.readFileSync(path.join(Site.settingsDirectory, 'statistics-route'), 'utf-8')
      statisticsUrl = `https://${domain || crossPlatformHostname}${statisticsPath}`
    }

    const optionalOptions = {
      domain,
      aliases,
      skipDomainReachabilityCheck
    }

    daemonDetails = {
      account,
      siteJSBinary,
      statisticsUrl,
      pathBeingServed,
      optionalOptions
    }
  }

  return { isActive, isEnabled, daemonDetails }
}

module.exports = status
