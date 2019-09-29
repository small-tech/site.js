# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

Nothing yet.

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
