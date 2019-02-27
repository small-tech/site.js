# https-server

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).

## Design goals

  * ✔ Command-line app
  * To-do: Easy integration into Express
  * To-do: Seamless switch to using ACME/Let’s Encrypt in production

## Installation

```sh
npm i -g @ind.ie/https-server
```

## Usage

### Commandline

```sh
https-server [folder-to-serve] [port]
```

Both arguments are optional. Currently, if you want to specify the port manually, you must also specify the folder-to-serve.

  * `[folder-to-serve]` defaults to `.` (the current directory)
  * `[port]` defaults to 443 (automatically privileges Node.js to bind to it on Linux. This is not an issue on macOS & Windows.)

If you do not already have TLS certificates, they will be created for you automatically using [nodecert](https://source.ind.ie/hypha/tools/nodecert).

All dependencies will be installed automatically for you if they do not exist if you have apt, pacman, or yum (untested) on Linux or if you have [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (untested) on macOS.

## Help wanted

I’ve currently only tested this on Pop!_OS 18.10 (Ubuntu-based distro). I can use your help to test this on other platforms:

  * Windows 64-bit (should work without requiring any dependencies)
  * Linux with yum
  * macOS with MacPorts

If you get a chance to try out https-server on the above platforms, please [let me know how/if it works](https://github.com/indie-mirror/https-server/issues). Thank you.

## Thanks

  * [thagoat](https://github.com/thagoat) for confirming that [installation works on Arch Linux with Pacman](https://github.com/indie-mirror/https-server/issues/1).
