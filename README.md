# https-server

__Work in progress__ Please do not use yet.

An HTTPS server that uses [nodecert](https://source.ind.ie/hypha/tools/nodecert).

## Design goals

  * __Command-line use:__ https-server _directory_
  * Easy integration into Express

## Installation

```sh
npm i -g @ind.ie/https-server
```

(On macOS, you must [manually install the dependency](#macos-dependency) for now.)

## Usage

### Commandline
```sh
nodecert <folder-to-serve>
```

If you do not already have TLS certificates, they will be created for you automatically using nodecert.
