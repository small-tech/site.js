# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To-do

  - Integrate pm2 for production use.
  - Create native binary releases.

### Done



## [6.4.0] - 2019-03-31

## Added

  - Native [404 to 302](https://4042302.org/) support.
  - Programmatic access to the default 404 and 500 error page content.

## [6.3.0] - 2019-03-30

## Added

  - You can now create custom error pages for 404 and 500 errors.

## [6.2.0] - 2019-03-12

## Changed

  - Uses latest ACME TLS that disables all Greenlock-related telemetry from submodules (such as acme, acme-v2, and rsa-compat) and accepts hostnames as valid local identifiers in place of the artificial and privacy-eroding email address requirement imposed earlier by Greenlock.js).

## [6.0.0] – 2019-03-09

## Changed

  - __Name:__ HTTPS Server is now called Indie Web Server.
  - __NPM module:__ @ind.ie/https-server is now @ind.ie/web-server.
  - __Source code repository:__ Now located at https://source.ind.ie/hypha/tools/web-server/.

## Added

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
