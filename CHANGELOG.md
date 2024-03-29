# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [17.7.1] - 2022-06-14

### Fixed

  - The HTTP Proxy feature no longer has the change origin setting set to true. This fixes federation failing with `crypto/rsa: verification error` errors (e.g., on remote follow attempts) when proxying Owncast.

## [17.7.0] - 2022-06-11

### Updated

  - Owncast to version 0.0.11. 
  
    This version brings fediverse functionality to Owncast servers that you can set up by running `site enable --owncast`.

## [17.6.0] - 2022-06-10

### Updated

  - [@small-tech/https](https://github.com/small-tech/https) to [version 2.2.0](https://github.com/small-tech/https/blob/2.x/CHANGELOG.md#220---2022-06-07). 
  
    Includes Auto Encrypt version to 2.3.0. This updates the certificate signing request (CSR) signature algorithm from the obsolete SHA-1 to SHA-256. (Let’s Encrypt will beging to reject certificate requests signed with SHA-1 on September 15, 2022. See https://community.letsencrypt.org/t/rejecting-sha-1-csrs-and-validation-using-tls-1-0-1-1-urls/175144)

## [17.5.0] - 2022-01-31

### Updated

  - Owncast to version 0.0.10.

## [17.4.1] - 2022-01-05

### Improved

  - Added links to the Site.js site and documentation in the statistics view with further information on the server and how ephemeral statistics work.

## [17.4.0] - 2022-01-05

### Improved

  - Statistics view now displays referrer URLs not IP addresses (so you can see where people link to your site from). Note that these are based what browsers tell us so they can be spoofed.

## [17.3.6] - 2022-01-05

### Fixed

  - Statistics: fix regular expression so all 32-digit hexadecimal strings are replaced in a string even if there are multiple.

## [17.3.5] - 2022-01-05

### Improved

  - Statistics: any 32-digit hexadecimal string (e.g., as used in the admin pattern or for ids) found in Urls is masked so as not to leak them in public statistics.

  - The statistics route itself is masked in the browser (requires JavaScript to be on) so it is not inadvertently revealed in screenshots or browser history (this does not mean you should access private routes on public computers as browsers may still cache URLs).

  - Updated readme with JavaScript snippet you can use on your own sites to mask routes with random cryptographically-secure path fragments to protect them from being inadvertently leaked in screenshots.

  (Please see the readme for the full security model of this unconventional method if you’re going to make use of it on your own sites.)

## [17.3.4] - 2022-01-01

### Fixed

  - Upgrade JSDB to 1.2.2; fixes crash during copy of complex data types (e.g., Date) from one table to another.

## [17.3.3] - 2021-12-31

### Fixed

  - __Security issue__: due to a misconfiguration of how [dotfiles](https://github.com/pillarjs/send#dotfiles) are handled in the [send](https://www.npmjs.com/package/send) package that’s used within the static file serving functionality, if an attacker knew the exact path to a file in a dotfile directory (for example, the default `.db` [JSDB](https://github.com/small-tech/jsdb#javascript-database-jsdb)), they could download the files (e.g., the database tables) within it. This was due to the default dotfiles setting in send being “similar to `'ignore'`”, not exactly like it. The fix was to explicitly set it to `'ignore'` so that files within dotfile directories are not served.

## [17.3.2] - 2021-12-29

### Fixed

  - Upgrade JSDB to 1.2.1; fixes database corruption when serialising certain edge-case object keys (like strings that start with a number or contain all digits and have left padding, etc.)

## [17.3.1] - 2021-08-19

### Fixed

  - Fix regression due to missing Nexe binaries in new operating system environment. (17.3.0 did not contain the Nexe binaries and was reverted within minutes.)

## [17.3.0] - 2021-08-19 (reverted release)

### Updated

  - Version of Owncast installed via `site enable --owncast` upgraded to 0.0.8 (was 0.0.7).

## [17.2.1] - 2021-06-18

### Fixed

  - WebSockets are now being proxied correctly. Among other things, this fixes the issue with viewer counts appearing as zero (and chat not working) in Owncast installations.

## [17.2.0] - 2021-06-16

### Added

  - The new `--allow-embeds` option for the `serve` and `enable` commands allows site content to be embedded in other sites via iframes, etc. By default, this is off and an [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) header set to `SAMEORIGIN` is sent for security purposes to avoid click-jacking attacks, etc.

### Fixed

  - Owncast installations are run with the `--allow-embeds` option by default so live streams can now be embedded on other sites.

## [17.1.0] - 2021-06-16

### Updated

  - Now installs the latest [Owncast](https://owncast.online) ([version 0.0.7](https://github.com/owncast/owncast/releases/tag/v0.0.7)) when [setting up an Owncast server](https://owncast.online/quickstart/sitejs/) using `site enable --owncast`.

## [17.0.2] - 2021-04-29

### Fixed

  - Server now automatically restarts when middleware (in the _.middleware/_ folder of your project) is updated.

## [17.0.1] - 2021-04-27

### Fixed

  - Regression (in 17.0.0): Web Socket server is created only once when using both routes.js file (advanced routing) and DotJS together.

## [17.0.0] - 2021-04-25

### Breaking change

  - If you have an advanced routes file (routes.js) it is loaded prior to any DotJS routes. Previously, the presence of a advanced routes file meant that routes were only loaded from it and that any DotJS routes, if they existed, were ignored. This change means you can use DotJS in your sites and (instead of or), when you need to, define some of your routes using the full expressiveness of Express routes.

      Although this is a breaking change in that it changes behaviour, the practical impact on existing sites should be minimal given that a project that was using advanced routing would not have had DotJS routes. The only place where this might impact you is if you forgot to delete some old DotJS routes and get surprised when they’re added to your application.

### Added

  - In advanced routes (in routes.js) you now have access to the Site.js class (`app.Site`) and Site.js instance (`app.site`) through the Express `app` instance.

  - In the statistics view, any routes that begin with _/admin/…_ are shown as ‘Administration page’ to hide any cryptographically-secure paths that may be used as per convention.

## [16.6.0] - 2021-04-23

### Changed

  - JSDB databases now store their tables with the `.cjs` extension instead of the `.js` extension for better compatibility when used in mixed CommonJS/ESM projects.
  - Support for `routes.cjs` file in addition to `routes.js` file for advanced routing.

## [16.5.0] - 2021-04-23

### Added

  - Custom middleware. You can now add any piece of standard Express middleware to your server by defining them as modules in a `.middleware` directory in your project.
  - Your routes (and middleware) can now be defined in `.cjs` files in addition to `.js` ones.

## [16.4.1] - 2021-04-17

### Fixed

  - Owncast installation no longer requires the server to have any dependencies. Previously, it would fail if the server didn’t have curl and unzip installed.

## [16.4.0] - 2021-04-15

### Added

  - Your server will now send out a `Permissions-Policy: interest-cohort=()` header on every request. Why? Because otherwise Google will soon start tracking the people who view your site using Google Chrome.

    __Note:__ if you’re reading this, stop using Google Chrome. It is ridiculous for web servers to essentially have to ask please do not violate the privacy of the people who are viewing this site” with every request. For more info, see: https://plausible.io/blog/google-floc

## [16.3.2] - 2021-04-14

### Fixed

  - Ensure that settings directory is always created with regular permissions.

## [16.3.1] - 2021-04-14

### Fixed

  - Ensure Site.js settings directory exists before copying Owncast installation script to it.

## [16.3.0] - 2021-04-14

### Added

  - Owncast support.

    You can now install and run a production-ready Owncast server with the following command: `site enable --owncast`.

## [16.2.0] - 2021-04-13

### Added

  - Proxy servers are now supported in production. To proxy whatever is running over HTTP and WS at port 8080 at https://your.domain, for example, enable the server using:

    ```shell
    site enable :8080
    ```

## [16.1.1] - 2021-04-11

### Fixed

  - Initial double load issue on Firefox during development with hot reloading. Removed the Firefox hack in @small-tech/instant and @small-tech/sendevent forks as the original issue it was attempting to work around does not appear to be manifesting on latest Firefox.

## [16.1.0] - 2021-03-11

### Fixed

  - Regression: `--sync-to` without `--sync-from` no longer fails (https://source.small-tech.org/site.js/app/-/issues/254)

### Improved

  - The addition of a generated folder now causes the server to restart. So, for example, if you’re going from a plain site to a Hugo site and you sync, you do not need to manually restart your production server. (https://source.small-tech.org/site.js/app/-/issues/261)

  - Sync now detects common erroneous invocations from well-known site subfolders (e.g., .hugo, .dynamic, etc.) and magically fixes the path (just like the serve command does for the path to serve). (https://source.small-tech.org/site.js/app/-/issues/262)

## [16.0.6] - 2021-03-08

Update to @small-tech/https version 2.1.2, which includes @small-tech/auto-encrypt version 2.2.0.

### Fixed

  - Regression: check for certificate renewal bug.

### Updated

  - Includes the latest Let’s Encrypt staging certificate authority root certificate for tests.

## [16.0.5] - 2021-01-03

### Fixed

  - Regression: First line of logo is misaligned on Help screen. Thanks to Alfonso Muñoz-Pomer Fuentes for contributing the fix.

## [16.0.4] - 2021-01-03

### Fixed

  - Regression: crash on enable on systems that don’t have Node.js installed (#258)

## [16.0.3] - 2020-12-11

### Fixed

  - Regression on macOS: incorrect unprivileged home path calculation leads to crash (#256)

## [16.0.2] - 2020-12-11

### Fixed

  - Regression: `site disable` crashes (#253)
  - Regression: `--sync-to` without `--sync-from` fails (#254)
  - No longer crashes on enable command when running under Node.js on older systemd versions that require an absolute path for the binary in the service unit description. (Bug encountered on elementary OS Hera 5.1.7). (#255)

## [16.0.1] - 2020-11-07

### Fixed

  - No longer crashes if run from source that’s not under git. Thank you to [kapitaali](https://github.com/kapitaali) for reporting [this bug](https://github.com/small-tech/site.js/issues/20#issuecomment-723048260) (#250).

### Improved

  - HTTP and WebSocket proxy messages are now easier to understand (#38).

## [16.0.0] - 2020-11-05

### Breaking change

__Upgrade Hugo to version 0.78.0 (November 3rd, 2020).__

(Previously bundled version was 0.64.1 from February 9th, 2020.)

There are breaking changes between these Hugo versions, so please read through the [Hugo release notes](https://github.com/gohugoio/hugo/releases).

We ran into the following two issues while upgrading our own sites:

  - In the `[outputs]` section of your _config.toml_ file, change `taxonomy` parameter to `tags` or `categories`. (See [this issue](https://source.small-tech.org/site.js/starters/starter-theme/-/issues/109).)

  - Change usage of parentheses in `if or` statements. (See [this commit](https://source.small-tech.org/site.js/starters/starter-theme/-/commit/2f116aa7f7f3cc4e8db028ad2d47b2ff1c4200f2).)

### Improved

  - Upgrade bundled mkcert binaries to version 1.4.2 and add the new arm64 mkcert binary.
  - Use new arm64 Hugo and mkcert binaries in Site.js arm64 releases.
  - Improve the build script (rebuild node_modules on deploy for safety, auto-commit and push install script updates, auto-push release tag).

## [15.4.2] - 2020-11-04

### Fixed

  - When running Hugo sites locally from a non-default port, the port is now correctly added to the `baseURL`.

## [15.4.1] - 2020-11-04

### Fixed

  - Multiple local servers feature actually works now (updated stale @small-tech/https dependency).
  - Fixed possible crash if status is not included in access log.

## [15.4.0] - 2020-11-04

This release implements a lot of small improvements, some of which have been longstanding.

### Improved

#### General:

  - You can now run multiple local servers on your development machine (not on staging or production).

    Running multiple local servers at different HTTPS ports no longer results in an error due to port 80 being unavailable for the HTTP Server that’s automatically started alongside. However, keep in mind that only your first server will get the features of that HTTP server, including HTTP to HTTPS redirects.

  - Running `site` without specifying a path while inside a special subfolder of your site (`.dynamic`, `.hugo`, `.wildcard`, `.db`) now magically does the right thing and serves the site root instead of the folder you’re in. If you really do want to serve one of these folders or a subfolder thereof, specifically state your intent by passing the current folder (`.`) as an argument. (#217)

  - Status command now displays daemon details if daemon is enabled (#36).

  - Status command now displays statistics URL if daemon is active (#232).

  - On Linux-like systems, the installation script now uses wget or curl to download the Site.js binary based on whichever is present (favouring wget), instead of expecting wget to be present and failing if it isn’t (#140).

  - Implement shorter custom ssh connection timeout for sync for when the host exists but you are not authorised to connect to it.

    Previously, the timeout was the default TCP connection timeout of 120 seconds which would make it look like the process had hanged. The new timeout is 5 seconds, which provides timely feedback.

  - Version update messages are now easier to read and understand (#207).

  - Displays a graceful error message if an attempt is made to serve a file instead of a directory (#208).

  - Displays explanation of rsync error 12 along with advice for solving it (#85).

#### Security:

  - Site.js will now refuse to serve the root or home directory for security reasons (#178).
  - Site.js will now refuse to run if started from the root account for security reasons (#194).

#### Documentation:

  - Document initial run `@hostname` error on Mac with stale DNS cache (#138).
  - Update Help output to add examples for update, start, stop, restart commands and match the readme (#137).
  - Document that `.generated` folder should be added to `.gitignore` (#197).
  - Document how `baseURL` handling works for generated Hugo content. (#200).
  - Update docs to include Mac install example for alpha/beta installs (#201).
  - Improve Hugo documentation.
  - General proof-read and update of the documentation (#196).

### Added

  - `--access-log-errors-only` option when starting a server (regular process or daemon). (#157)

    Displays only errors in the access log (HTTP status codes _4xx_ and _5xx_). Successful access requests (_1xx_, _2xx_, and _3xx_) are not logged. This is useful during development if you feel overwhelmed by the output and miss other, non-access-related errors.

  - `--access-log-disable` option when starting a server (regular process or daemon). (#157)

    Completely disable the access log. No access requests, _not even errors_ will be logged. Be careful when using this in production as you might miss important errors.

  - Support for [custom Hugo 404 pages](https://gohugo.io/templates/404/) (#237).

    Create a 404.html page in your `layouts/` folder so that it gets created in your `.generated` folder and it will be used instead of the default 404 page. If you have both a custom static 404 page (defined at /404/index.html) and a custom Hugo 404 page, the Hugo 404 page will take precedence.

  - New npm build task: `update-nexe`.

    This task updates the Nexe base image for your platform, architecture, and version of Node.js. As you are basically building a modified version of Node.js this will take a while. The --all and --deploy options are not available on the build script when updating Nexe and will result in an error.

### Fixed

  - Completed incomplete basic getting started with Hugo example in the readme.
  - Automatic rsync install no longer exits with error following successful installation (#97).

## [15.3.1] - 2020-10-29

This is a bugfix release that upgrades [JSDB](https://github.com/small-tech/jsdb/) to [version 1.1.4](https://github.com/small-tech/jsdb/blob/master/CHANGELOG.md#114---2020-10-29).

### Fixed

  - Object keys containing non-alphanumeric characters are now properly supported.

### Changed

  - Cosmetic: Site.js logo now displays in block text in terminal.

## [15.3.0] - 2020-10-28

### Added

  - Tests for JavaScript Database (JSDB).

### Improved

  - The global JSDB reference (`db`) is now available from outside of route functions in route files. This is a good place to perform initialisation of your database “tables” (arrays and objects). (#241)

### Fixed

  - The property that lazily creates the global JSDB reference (`db`) is now properly garbage collected on server shutdown (#242).

## [15.2.2] - 2020-10-28

### Improved

  - Upgrade [JSDB](https://github.com/small-tech/jsdb/) to [version 1.1.3](https://github.com/small-tech/jsdb/blob/master/CHANGELOG.md#113---2020-10-28) (improves query security).

## [15.2.1] - 2020-10-26

### Fixed

  - Node module upgrades included in 15.2.0 added 45MB to the binary size. Until I know why and can handle it properly, I’m reverting the node modules to the versions they were at in 15.1.1 to bring the binary size back down. (#240)

## [15.2.0] - 2020-10-26

### Added

  - Add [JavaScript Database (JSDB)](https://github.com/small-tech/jsdb) support. You can now create server-side databases. (#236)

### Fixed

  - Don’t sync .git folders (the contents of the folder were already correctly not being synced). (#238)

## [15.1.1] - 2020-09-11

### Fixed

  - Circular dependency issue (regression) in content generator used by the push and serve commands.

## [15.1.0] - 2020-09-02

### Added

  - Enable wildcards to be defined using the filename of the HTML file, not just as the `index.html` file in a folder (to be consistent with how `.dynamic` routes work).

## [15.0.1] - 2020-09-02

### Fixed

  - DotJS routes with parameters now work correctly on Windows 10 also.

## [15.0.0] - 2020-09-01

### Added

  - (Breaking change.) DotJS routes can now specify any number of parameters and static route fragments. This is potentially a breaking change for existing sites if they used underscores in the names of dynamic routes as these have now gained special significance and will be interpreted as parameter (single) and path (double) delimiters. (#230)

### Fixed

  - Dynamic routes are now reloaded on regular processes after restarts. (Server restarts now create a new Site instance and destroy the old one instead of just stopping/starting the same server instance. This brings the restart behaviour of regular processes closer to that of daemons, which simply exit the process so that systemd can restart it.)

## [14.6.3] - 2020-08-31

### Fixed

  - Redundant server close call causing subsequent restart attempts to fail (#231)

## [14.6.2] - 2020-08-30

### Fixed

  - Regression introduced during wildcard routes refactor where regular process server restart attempt would cause a crash.

## [14.6.1] - 2020-08-29

### Fixed

  - Regression with sync/push due to missing dependencies in generate content refactor in 14.4.0.

## [14.6.0] - 2020-08-27

### Added

  - `response.html()` utility method for setting the response type to HTML and ending the response with the passed HTML content. Equivalent to `response.type('html').end()`.

## [14.5.3] - 2020-08-27

### Fixes

  - Revert the 14.5.2 fix for #227 as it does not work when the app is wrapped in Nexe.

## [14.5.2] - 2020-08-27

### Fixes

  - Proper fix for issue #227 (https://source.small-tech.org/site.js/app/-/issues/227, see 14.5.1, below.)

## [14.5.1] - 2020-08-26

### Fixes

  - File watches now also work when serving the current directory (without a path specified). (#227)

## [14.5.0] - 2020-08-26

### Added

  - Wildcard static route support. Any path under https://your.site/x will route to .wildcard/x/index.html if that file exists. So, for example, https://your.site/x/y, https://your.site/x/y/z, etc., will all route to the same static file. Use this if you want to allow path-style arguments in your URLs but carry out client-side processing. This saves you from having to create .dynamic routes for that use case.

### Improved

  - Refactored file watching (now using a single file watcher for both dynamic and wildcard route changes. Also, upgraded to the latest Chokidar).

## [14.4.0] - 2020-08-25

The pull and push commands implement Small Web conventions to enable simple bi-directional data transfer between a local machine and a Small Web server.

### Added

  - `push` command (#221)
  - `pull` command (#222)

### Fixed

  - Daemon now automatically restarts when dynamic routes are first added and synced. (#223)

## [14.3.0] - 2020-08-24

### Added

  - Support for sync on Windows 10 (#224)

## [14.2.0] - 2020-07-28

### Added

  - ARM64 support on Linux. Among other things, this means that Site.js now runs on the Pinebook Pro and PinePhone. (Note that localhost servers are not supported on PinePhone at this time as a build of certutil/NSS does not exist in the package manager for UBPorts.)

## [14.1.1] - 2020-07-10

### Fixed

  - Fixes HTTP → HTTPS redirects on global servers. (Previously, the HTTP server that does the redirects was not being started due to a bug in Auto Encrypt.)

## [14.1.0] - 2020-07-07

### Added

  - Local servers now redirect HTTP to HTTPS just like global servers.

  - You can now access local servers via their IPv4 address over a local area network. This is useful when you want to test your site with different devices without having to expose your server over the Internet using a service like ngrok.

  - When running a local server, you can go to http://(IPv4 address)/.ca to download the local root certificate authority’s public key. You must install this in the certificate stores of any devices you want to access the local server from via your local area network.

  - Note to documentation that the installer should not be run as root.

  - `--skip-domain-reachability-check` flag. This will skip the domain reachability check when starting a global server. Useful if you are setting up a server where you know that the DNS has not propagated yet. Note that if you specify this flag, you double check that you’ve specified the domain and any aliases correctly as you will not be warned if you make a mistake.

## [14.0.1] - 2020-07-03

### Fixed

  - HTTP to HTTPS redirects are now once again active following regression in 13.0.0. (The feature was missing in Auto Encrypt. It has now been implemented in Auto Encrypt 2.0.1 and included in @small-tech/https version 1.3.1).

## [14.0.0] - 2020-06-28

### Changed

  - Default behaviour of sync is to exit once sync is complete.

### Removed

  - `--exit-on-sync` flag.

### Added

  - `--live-sync` flag. If you specify this flag, the behaviour of Site.js will match the default sync behaviour from previous releases (Site.js server will be started, will sync to the destination, will start watching for changes and sync to destination on changes).

### Fixed

  - Hugo drafts are no longer published to production site (#204).

## [13.0.4] - 2020-06-25

### Fixed

  - Archival cascade routes no longer break when server is started from outside of folder to serve.

## [13.0.3] - 2020-06-24

### Fixed

  - Sync now generates Hugo content with the correct baseURL (based on the host we are syncing to).
  - Sync no longer erroneously creates an .hugo folder on the remote host, causing server to crash.

## [13.0.2] - 2020-06-20

### Fixed

  - Let’s Encrypt certificate provisioning no longer fails at the finalise stage for some domains due to erroneous carriage returns in the Certificate Signing Request (CSR). (#193)

### Changed

  - Update to https version 1.2.5. (Fixes the issue mentioned above.)

## [13.0.1] - 2020-06-19

### Changed

  - The `site logs` command now shows log history for the current day instead of just the last few entries.

### Fixed

  - Regression: settings directory is created with root permissions as pre-flight check is launched as root (#190).
  - Regression: update check failure when running as daemon (#192).
  - Specifying `--domain` when enabling a daemon works as expected.
  - Update command no longer displays the header twice in the log when run as a daemon.
  - Other miscellaneous minor code improvements.

## [13.0.0] - 2020-06-18

### Changed

  - __(Breaking change)__ Starting a server now only provisions a TLS certificate for and serves _hostname_ (it no longer also provisions a TLS certificate for and aliases the _www_ subdomain). If you want to have _www_ subdomain support, add _www_ via the `--aliases` option manually.

### Added

  - Native support for Hugo static site generator with integrated binary.
  - Ability to manually set the main domain being served (the default is based on the hostname) using the `--domain` option.
  - Pre-flight check for global servers: the server will no longer be started if its main domain or aliases are unreachable. This should make it easier and faster to debug domain propagation and DNS issues (as well as typos in domain names).
  - Alpha and beta binaries in addition to release binaries.
  - Local TLS certificate auto-upgrade feature: certificates are now automatically recreated following mkcert binary upgrades.
  - QUIET=true environment variable to suppress console output.
  - Unit tests for all CLI commands.

### Changed

  - Update @small-tech/https to version 1.2.1. Through this change, TLS certificates are now managed by [Auto Encrypt](https://source.ind.ie/site.js/lib/auto-encrypt) and [Auto Encrypt Localhost](https://source.ind.ie/site.js/lib/auto-encrypt-localhost).
  - Instead of using `setcap`, [Site.js now disables privileged ports on Linux](https://source.small-tech.org/site.js/app/-/issues/169).
  - Upgrade version of bundled Node LTS to 12.16.2.
  - Upgrade Nexe to latest 4.x beta.
  - Naming and directory placement conventions for archival cascades. Existing conventions will continue to work but have been deprecated. Please see the README file for further details.
  - New [CalVer](https://calver.org/#other-notable-projects) version numbering scheme for binaries (YYYYMMDDHHMMSS). These version numbers are meant to be represented as human readable dates when presented to people. e.g., Site.js – released April 29, 2020 at 15:13:02 (running on Node.js version 12.16.2). Alpha and beta versions display their modifier in parentheses. e.g., Site.js – (alpha) released April 29, 2020 at 15:13:02 (running on Node.js version 12.16.2).
  - Improved log output.
  - Improved test output.

### Fixed

  - Handled all npm security warnings in third-party dependencies.
  - Serve command now displays an error if the path to serve doesn’t exist.

## [12.10.5] - 2020-01-22

### Changed

  - Automatic server reload on source code changes now picks up changes in nested hidden directories (e.g., when using separate `.get/` and `.post/` folders for your routes).

## [12.10.4] - 2019-11-27

### Changed

  - (Refactor) Now uses @small-tech/https module instead of @ind.ie/acme-tls and @ind.ie/nodecert directly.

  - Consolidates all settings under `~/.small-tech.org/site.js` and cleans up everything on uninstall. You can safely delete the `~/.nodecert` and `~/.acme-tls` folders from your machine once you’ve updated to this version if you’re not using those dependencies directly elsewhere. Note that this means that new Let’s Encrypt certificates will be provisioned for you and placed in the new location when you update to this version.

### Added

  - Improved support for `uninstall` command on Windows.
  - Improved `install-locally` npm task support on Windows.

## [12.10.3] - 2019-11-24

### Fixed

  - __Security:__ sync was setting execute permissions on transferred files (`chmod 755`). Removed this.

### Changed

  - Update chat example to match the one in [the Simple Chat Tutorial](https://ar.al/2019/10/11/build-a-simple-chat-app-with-site.js/).

## [12.10.2] - 2019-11-02

### Fixed

  - Auto update check no longer blocks main thread.

## [12.10.1] - 2019-11-02

### Fixed

  - Update command now correctly exits with an error if SiteJS.org is unreachable. Also implements a short timeout.

## [12.10.0] - 2019-11-01

### Added

  - Auto updates. Production servers will check for updates on start up and at regular intervals (currently, every 5 hours) and update themselves as and when necessary. This is a primary security feature given that Site.js is meant for use by individuals, not startups or enterprises with operations teams that can (in theory, at least) maintain servers with the latest updates.

## [12.9.7] - 2019-10-30

### Added

  - Automatic server reload when source code in your dynamic routes or any of their dependencies changes. (This will improve your development experience and it means that when you sync changes to dynamic routes to a production server, your production server will automatically restart and start serving the freshest content.)

### Fixed

  - Error on exit of proxy server due to `instant` instance `cleanUp()` method being undefined (https://source.ind.ie/site.js/app/issues/139)

## [12.9.6] - 2019-10-29

### Added

  - Live reload for static pages.

### Fixed

  - Error in update command semantic version comparison that would have prevented upgrades from 12.9.x to 12.10.x.

## [12.9.5] - 2019-10-21

### Added

  - Updated changelog. This release will be used to test the update mechanism in the wild.

## [12.9.4] - 2019-10-20

### Fixed

  - Reimplemented update command logic and got it working properly on Windows.

## [12.9.3] - 2019-10-20

### Added

  - Updated changelog. This release will be used to test the update mechanism in the wild.

## [12.9.2] - 2019-10-19

### Fixed

  - Fix update command crash on Linux.

## [12.9.1] - 2019-10-19

### Fixed

  - Fix update command crash on Windows.

## [12.9.0] - 2019-10-19

### Added

  - New command: update – checks for Site.js updates and updates to latest version if there is one.
  - New command: start – starts the Site.js daemon.
  - New command: stop – stops the Site.js daemon.
  - New command: restart – restarts the Site.js daemon.

## [12.8.0] - 2019-10-17

### Added

  - Linux on ARM support (Raspberry Pi, etc.).

### Fixed

  - Let’s Encrypt renewal template added to the binary.

## [12.7.1] - 2019-10-13

### Fixed

  - Fixed [install script failure on macOS](https://source.ind.ie/site.js/app/issues/128) if person didn’t already have a /usr/local/bin directory. (On macOS, this directory does not exist by default.)

### Changed

  - Updated the chat example to match the one in the upcoming [Build a simple chat app with Site.js tutorial](https://localhost/2019/10/10/build-a-simple-chat-app-with-site.js).

## [12.7.0] - 2019-10-05

### Added

  - Elegant WebSocket room/broadcast support.

### Changed

  - Include express-ws 1.0.0 from our new npm fork (@small-tech/express-ws) instead of from the fork’s git repository.

## [12.6.1] - 2019-10-02

### Fixed

  - Exits with graceful message instead of an error when sync is requested on Windows.

## [12.6.0] - 2019-10-01

### Added

  - Native Windows 10 support under Windows Terminal (Powershell).

### Removed

  - Windows Subsystem for Linux (WSL) support.

## [12.5.1] - 2019-09-29

### Fixed

  - Add mime types to dynamic routes in test/site (to avoid Safari 13 downloading
    them as `.dms` files).

## [12.5.0] - 2019-09-28

### Added

  - macOS Catalina support (upgrade to Nodecert 3.1.0, with mkcert 1.4.0 support)

## [12.4.1] - 2019-09-11

### Fixed

  - Installation script now fully suppresses tar command output on macOS

## [12.4.0] - 2019-09-11

### Changed

  - Uses cURL instead of wget to install on macOS
  - Updated to latest version of our fork of express-ws

## [12.3.1] - 2019-08-18 (unreleased publicly)

### Fixed

  - --ensure-can-sync option displays correctly in help

## [12.3.0] - 2019-07-26  (unreleased publicly)

### Added

  - Access to WebSocket server from WebSocket routes.

## [12.2.0] - 2019-07-25

### Added

  - Full support for dynamic applications with dotJS and routes.js routing for HTTPS and WebSocket (WSS).

## [12.1.1] - 2019-07-10

### Fixed

  - Aliases no longer incorrectly applied to local servers (regression from 12.1.0).
  - Actually exits on sync when run with `--exit-on-sync`.

## [12.1.0] - 2019-07-07

### Added

  - `--aliases` option to specify additional domains to obtain TLS certificates for and respond to.

## [12.0.0] - 2019-07-01

### Added

  - You can now use Site.js as a reverse proxy (proxy servers now supported @hostname).
  - Statistics now supported on proxy servers.
  - Can run at any port on @hostname, not just @localhost.
  - API: serve method now handles proxying.

### Fixed

  - When run with `--exit-on-sync`, Site.js no longer starts up a server.

### Changed

  - New CLI grammar (breaking change).
  - API: `site` is now `Site`; a class, not an object (breaking change).
  - API: The server configuration object is now passed to the `Site` class constructor, not to the `serve()` method (breaking change).
  - API: server callback is now a positional parameter on the `serve()` method of `Site` not a property in the configuration parameter object (breaking change).

## [11.0.2] - 2019-06-21

### Fixed

  - 100% CPU usage after first run following new install ([#63](https://source.ind.ie/site.js/app/issues/63))

## [11.0.1] - 2019-06-20

### Fixed

  - Statistics view sends proper status code and content type ([#59](https://source.ind.ie/site.js/app/issues/59))

### Changed

  - Install script now runs in _/tmp/sitejs.org_ directory. ([#57](https://source.ind.ie/site.js/app/issues/57))
  - Moved install script from Sitejs.org site repo to the app repo ([#58](https://source.ind.ie/site.js/app/issues/58))

## [11.0.0] - 2019-06-12

### Changed

  - (Breaking) Name changed to Site.js.

### Added

  - Very basic statistics middleware and view.

## [10.2.0] - 2019-05-15

## Added

  - Dynamic routes feature. You can now specify simple dynamic routes by including middleware functions in JS files within a folder named _.dynamic_ in your web folder.

## [10.1.0] - 2019-05-14

### Added

  - Uninstall command.

## [10.0.1] - 2019-05-12

### Fixed

  - Regression: Sync watcher no longer fails when the directory is . (dot; current directory).

## [10.0.0] - 2019-05-12

### Changed

  - By default, sync contents of the folder, regardless of whether it is specified in the arguments with or without a trailing slash, and only sync the folder and its contents if the new --sync-folder-and-contents flag is specified (breaking change).

## [9.3.0] - 2019-05-12

### Added

  - `--exit-on-sync` flag to the `sync` command for one-time sync (useful in deployment scripts).

## [9.2.4] - 2019-05-09

### Fixed

  - Connection string information displayed by the enable command when used with the --sync option.

## [9.2.3] - 2019-05-09

### Fixed

  - Build script regression.

## [9.2.2] - 2019-05-09

### Fixed

  - Revert process.exit to Graceful.exit migration as it causes regression in the enable command.

## [9.2.1] - 2019-05-09

### Fixed

  - Deploy feature regression in build script.

## [9.2.0] - 2019-05-09

### Added

  - New rsync-based `sync` command for deploying live changes to a server.
  - Unit tests for command-line interface.
  - Code coverage via _nyc_ and better tape reporting via _tap-spec_.

### Changed

  - Improved usage instructions for command-line interface.
  - Does not throw after handling a port conflict error when creating a proxy server.

### Fixed

  - Syntax error display regression.

## [9.1.0] - 2019-04-30

### Added

  - Better error handling.

## [9.0.0] - 2019-04-29

### Changed

  - You must specify the proxy command explicitly (breaking change). Will no longer automatically start in proxy mode when a http URL is provided instead of a path to serve.
  - Refactored the command-line app to aid in maintainability (internal change).

### Removed

  - Support for use under Windows. If you’re running Windows, please use Windows Subsystem for Linux to run Indie Web Server.

## [8.2.0] - 2019-04-20

### Added

  - Automatic cascading archive support for an evergreen web. Just add previous static backups of your site into specially-named folders and they will be served as fallbacks for links that no longer exist on the latest version of your site.

## [8.1.1] - 2019-04-18

### Fixed

  - Automatic privilege escalation for binary now also works when using the reverse proxy.

## [8.1.0] - 2019-04-18

### Added

  - HTTP → HTTPS and WS → WSS reverse proxy (for local mode only).

## [8.0.0] - 2019-04-16

### Added

  - Native binaries.

### Changed

  - (Breaking) Simplified commandline vocabulary; now using command syntax (not options syntax).
  - Running as daemon is only supported on platforms with systemd.

### Fixed

  - Fix auto-restart after automatically obtaining privileged port binding privileges via setcap during first run on Linux.

## [7.1.0] - 2019-04-01

### Added

  - `--offline` command to take a running live server offline (remove it from startup items and delete it from the process manager if necessary).

### Changed

  - Simplified the `--help` display.

## [7.0.1] - 2019-04-01

### Fixed

  - No longer using a custom directory for pm2 files (fixes directory not found issue).

## [7.0.0] - 2019-03-31

### Added

  - `--live` flag to run as daemon and handle crashes/restarts via integrated pm2 process manager.
  - `--monitor` command to monitor an already-running live server daemon process.
  - `--logs` command to display and tail the web server logs for an already-running live server daemon process.
  - `--info` command to display detailed information for an already-running live server daemon process.

### Changed

  - (Breaking) Options that are not boolean flags now require an equals sign. This means that boolean flags like --live and --global can now be used before or after the path to be served whereas previously the path would not be registered if a boolean flag was used before it.
  - (Breaking) The `--global` flag is now called `--staging`.

## [6.4.0] - 2019-03-31

### Added

  - Native [404 to 302](https://4042302.org/) support.
  - Programmatic access to the default 404 and 500 error page content.

## [6.3.0] - 2019-03-30

### Added

  - You can now create custom error pages for 404 and 500 errors.

## [6.2.0] - 2019-03-12

### Changed

  - Uses latest ACME TLS that disables all Greenlock-related telemetry from submodules (such as acme, acme-v2, and rsa-compat) and accepts hostnames as valid local identifiers in place of the artificial and privacy-eroding email address requirement imposed earlier by Greenlock.js).

## [6.0.0] – 2019-03-09

### Changed

  - __Name:__ HTTPS Server is now called Indie Web Server.
  - __NPM module:__ @ind.ie/https-server is now @ind.ie/web-server.
  - __Source code repository:__ Now located at https://source.ind.ie/hypha/tools/web-server/.

### Added

  - [Helmet](https://helmetjs.github.io/) for securing the Express app further.

## [5.1.0] - 2019-03-09

### Changed

  - Nodecert is no longer invoked at startup but only if locally-trusted certificates are requested.
  - ACME TLS globally-trusted Let’s Encrypt certificates are now stored in `~/.acme-tls` (locally trusted nodecert certificates are still stored in `~/.nodecert`).

### Fixed

  - Tests

## [5.0.0] - 2019-03-09

### Changed

  - __Privacy and usability__: Now using [ACME TLS](https://source.ind.ie/hypha/tools/acme-tls/) (fork of Greenlock.js) for Let’s Encrypt certificate provisioning. This removes the artificial and privacy-eroding Greenlock.js requirement to specify an email address for Let’s Encrypt certificates.

  - __API:__ The `serve()` method now accepts a single parameter object (`options`).

## [4.0.0] - 2019-03-08

### Added

  - Add support for globally-trusted Let’s Encrypt TLS certificates.

## [3.0.0] - 2019-03-05

### Removed

  - HTTP2 support

    HTTP2 is not useful for [Small Tech](https://ar.al/2019/03/04/small-technology/) as it simply further privileges centralised servers. If you need HTTP2, use [https-server version 2.0.1](https://source.ind.ie/hypha/tools/https-server/tags/2.0.1).

## [2.0.1] - 2019-03-01

### Fixed

  - Remove erroneously-added console log message.

## [2.0.0] - 2019-02-28

### Added

  - HTTP2 support (API-only)

### Changed

  - Command-line arguments: specify port using `--port N`
  - Update `serve` method signature: `serve (pathToServe = '.', callback = null, port = 443)`

### Fixed

  - Start using [semver](https://semver.org/) properly (most of the previous releases should have been minor version bumps.) This is a major bump as there is a backwards-incompatible API change to the serve() method.

## [1.0.7] - 2019-02-28

### Fixed

  - Fix regression with automatic privileged port binding on Linux.

## [1.0.6] - 2019-02-28

### Changed

  - Uses nodecert v1.0.5: certificates now work in Node.js (e.g., via https.get(), etc.).

### Added

  - Unit tests.

## [1.0.5] - 2019-02-27

### Added

  - API: you can now use https-server programmatically from your own Node.js apps. It exposes a `createServer` method that’s polymorphic with its namesake from the base `https` module and it provides a `serve` convenience method that uses Express to serve a static site at the passed directory and port (or the current directory at port 443 by default).

## [1.0.4] - 2019-02-26

### Changed

  - Uses nodecert v1.0.4 (with progress indication).

## [1.0.3] - 2019-02-26

### Added

  - Node.js is automatically privileged to bind to ports < 1024 (including the default TLS port of 443).

## [1.0.2] - 2019-02-25

### Changed

  - Uses nodecert v1.0.3 with seamless install on macOS as well as Linux.

## [1.0.1] - 2019-02-25

### Fixed

  - Actually serves the requested folder instead of a hardcoded one 🤦

### Added

  - Support for manually-specifying the port.

## [1.0.0] - 2019-02-25

Initial release.
