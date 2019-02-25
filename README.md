# https-server

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).

## Design goals

  * ✔ __Command-line use:__ https-server _directory_
  * To-do: Easy integration into Express
  * To-do: Seamless switch to using ACME/Let’s Encrypt in production

## Installation

```sh
npm i -g @ind.ie/https-server
```

(On macOS, you must [manually install the dependency](#macos-dependency) for now.)

## Note regarding port 443

The server is started on port 443 by default. This is on purpose as an overarching goal of https-server is to make your development environment mirror your production environment as closely possible to remove that complexity from the code you have to write. 

However, you must have your system setup to allow Node (Linux) or your account (macOS) to bind to so-called “privileged” ports so that this works. I will automate this as part of the process in the future but, for the time being:

### Linux

```sh
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### macOS

```sh
sudo touch /etc/authbind/byport/443
sudo chown $(whoami) /etc/authbind/byport/443
sudo chmod 755 /etc/authbind/byport/443
```

macOS instructions courtesy of [Setup authbind on Mac OS](https://medium.com/@steve.mu.dev/setup-authbind-on-mac-os-6aee72cb828) by Steve Mu.

## Usage

### Commandline

```sh
https-server [folder-to-serve] [port]
```

Both arguments are optional. Currently, if you want to specify the port manually, you must also specify the folder-to-serve.

  * `[folder-to-serve]` defaults to `.` (the current directory)
  * `[port]` defaults to 443. (See [note regarding port 443](#note-regarding-port-443), above.)

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
