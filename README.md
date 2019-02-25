# https-server

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).

## Design goals

  * ✔ __Command-line use:__ https-server _directory_
  * TO-DO: Easy integration into Express

## Installation

```sh
npm i -g @ind.ie/https-server
```

(On macOS, you must [manually install the dependency](#macos-dependency) for now.)

## Usage

### Commandline

```sh
https-server <folder-to-serve>
```

If you do not already have TLS certificates, they will be created for you automatically using nodecert.

On Linux, all dependencies will be installed automatically for you if they do not exist (only tested with apt).

For macOS, see the note on manually installing the macOS dependency, below.

## macOS dependency

On macOS, you must currently install a mkcert dependency manually:

For your certificate to work in Firefox:

  * [Homebrew](https://brew.sh/): `brew install nss`
  * [MacPorts](https://www.macports.org/): `sudo port install install nss`

## Help wanted

I’ve currently only tested this on Pop!_OS 18.10 (Ubuntu-based distro). I can use your help to test this on other platforms:

  * Windows 64-bit (should work without requiring any dependencies)
  * Linux with yum
  * Linux with pacman
  * macOS (I will be looking at this next)

If you get a chance to try out https-server on the above platforms, please [let me know how/if it works](https://github.com/indie-mirror/https-server/issues). Thank you.
