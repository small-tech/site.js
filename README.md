# Site.js

[![Screenshot of the Site.js web site header](images/site.js.jpeg)](https://sitejs.org)

## Develop, test, and deploy your secure static or dynamic personal web site with zero configuration.

__Site.js is a [small](https://small-tech.org/about#small-technology) personal web tool for Linux, macOS, and Windows 10.__

Most tools today are built for startups and enterprises. Site.js is built for people.

## Features

  - Zero-configuration – It Just Works 🤞™.

  - Seamless single binary [install](#install) (thanks to [Nexe](https://github.com/nexe/nexe)).

  - Automatically provisions locally-trusted TLS for development (courtesy of [mkcert](https://github.com/FiloSottile/mkcert) seamlessly integrated via [Auto Encrypt Localhost](https://source.small-tech.org/site.js/lib/auto-encrypt-localhost)).

  - Automatically provisions globally-trusted TLS for staging and production (courtesy of [Let’s Encrypt](https://letsencrypt.org/) seamlessly integrated via [Auto Encrypt]((https://source.small-tech.org/site.js/lib/auto-encrypt) and [systemd](https://freedesktop.org/wiki/Software/systemd/). Your server will score an A on the [SSL Labs SSL Server Test](https://www.ssllabs.com/ssltest).)

  - Supports static web sites, dynamic web sites written in JavaScript, and hybrid sites (via integrated [Node.js](https://nodejs.org/) and [Express](https://expressjs.com)).

  - Can be used as a proxy server (via integrated [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)).

  - Supports WebSockets (via integrated [express-ws](https://github.com/HenningM/express-ws), which itself wraps [ws](https://github.com/websockets/ws)).

  - Supports [DotJS](#dotjs) (PHP-like simple routing for Node.js to quickly prototype and build dynamic sites).

  - And, for full flexibility, you can define your HTTPS and WebSocket (WSS) routes entirely in code in the traditional way for Express apps.

  - Live reload on static pages.

  - Automatic server reload when the source code of your dynamic routes change.

  - Auto updates of production servers.

  <ins>Note:</ins> Production use via startup daemon is only supported on Linux distributions with systemd.

## Install

Copy and paste the following commands into your terminal:

### Native binaries

__Before you pipe any script into your computer, always view the source code ([Linux and macOS](https://site.js/install), [Windows](https://site.js/windows)) and make sure you understand what it does.__

#### Linux

```shell
wget -qO- https://sitejs.org/install | bash
```

(To use curl instead, see the macOS instructions, below.)

#### macOS

```shell
curl -s https://sitejs.org/install | bash
```

#### Windows 10 with PowerShell running under Windows Terminal

```shell
iex(iwr -UseBasicParsing https://sitejs.org/install.txt).Content
```

### Node.js

```shell
npm i -g @small-tech/site.js
```

### Alpha and Beta channels

On Linux and macOS, addition to the release build channel, there is also an alpha build and beta build channel available. Pass either `alpha` or `beta` as an argument to the Bash pipe to install the latest build from the respective channel.

For example, to install the latest beta build on Linux:

```shell
wget -qO- https://sitejs.org/install | bash -s -- beta
```

All of our servers at Small Technology Foundation ([Laura’s web site](https://laurakalbag.com), [Aral’s web site](https://ar.al), the [Small Technology Foundation web site](https://small-tech.org), and the [Better Blocker web site](https://better.fyi)) run on the Beta channel of Site.js so we can hopefully catch any issues that may exist in updates before pushing them out to everyone else.

Alpha builds are strictly for local testing and should not, under any circumstances, be used in production. We do not test Alpha builds in production.

Servers deployed using release builds check for updates every six hours whereas beta builds check every 10 minutes.

## System Requirements

### Linux

Any recent Linux distribution should work. However, Site.js is most thoroughly tested at Small Technology Foundation on Ubuntu 19.04/Pop!_OS 19.04 (development and staging) and Ubuntu 18.04 LTS (production).

There are builds available for x64 and ARM.

ARM builds currently only tested and supported on Raspberry Pi Zero W, 3B+, and 4B (armv6l and armv7l). If you are successfully running Site.js on other ARM architectures, please [let us know by opening an issue with the details](https://github.com/small-tech/site.js/issues) and we’ll update the documentation accordingly.

For production use, [systemd](https://en.wikipedia.org/wiki/Systemd) is required.

### macOS

macOS 10.14.x Mojave and macOS 10.15.x Catalina are supported (the latter as of Site.js 12.5.1).

_Production use is not possible under macOS._

### Windows 10

The current version of Windows 10 is supported with PowerShell running under [Windows Terminal](https://github.com/Microsoft/Terminal).

__Windows Subsystem for Linux is _not_ supported.__

_Production use is not possible under Windows._

## Dependencies

Site.js tries to seamlessly install the dependencies it needs when run. That said, there are certain basic components it expects on a Linux-like system. These are:

  - `sudo`
  - `libcap2-bin` (we use `setcap` to escalate privileges on the binary as necessary)
  - `bash` (on Linux, macOS, etc.)

__For production use, passwordless sudo is required.__ On systems where the sudo configuration directory is set to `/etc/sudoers.d`, Site.js will automatically install this rule. On other systems, you might have to [set it up yourself](https://serverfault.com/questions/160581/how-to-setup-passwordless-sudo-on-linux).

If it turns out that any of these prerequisites are a widespread cause of first-run woe, we can look into having them installed automatically in the future. Please [open an issue](https://github.com/small-tech/site.js/issues) if any of these affects you during your deployments or in everyday use.

To install Site.js using the one-line installation command on Linux and macOS, you will need `wget` (or `curl`) installed to download the installation script. On Linux, you can install either via your distribution’s package manager (e.g., `sudo apt install wget` on Ubuntu-like systems). macOS comes with curl installed.

## Update (as of version 12.9.5; properly functioning as of version 12.9.6)

To seamlessly update the native binary if a newer version exists:

```shell
site update
```

This command will automatically restart a running Site.js daemon if one exists. If you are running Site.js as a regular process, it will continue to run and you will run the newer version the next time you launch a regular Site.js process.

__Note:__ There is a bug in the semantic version comparison in the original release with the update feature (version 12.9.5) that will prevent upgrades between minor versions (i.e., between 12.9.5 and 12.10.x and beyond). This was fixed in version 12.9.6. If you’re still on 12.9.5 and you’re reading this after we’ve moved to 12.10.0 and beyond, please stop Site.js if it’s running and [install the latest Site.js](#install) manually.

## Automatic updates in production (as of version 12.10.0)

[Production servers](#production) started with the `enable` command will automatically check for updates on first launch and then again at a set interval (currently every 6 hours) and update themselves as and when necessary.

This is a primary security feature given that Site.js is meant for use by individuals, not startups or enterprises with operations teams that can (in theory, at least) maintain servers with the latest updates.

## Uninstall

To uninstall the native binary (and any created artifacts, like TLS certificates, systemd services, etc.):

```shell
site uninstall
```

## Use

### Development (servers @localhost)

#### Regular server

Start serving the current directory at https://localhost as a regular process using locally-trusted certificates:

```shell
$ site
```

This is a shorthand for the full form of the `serve` command which, for the above example, is:

```shell
$ site serve . @localhost:443
```

#### To serve on a different port

Just specify the port explicitly as in the following example:

```shell
$ site @localhost:666
```

That, again, is shorthand for the full version of the command, which is:

```shell
$ site serve . @localhost:666
```

#### Proxy server

You can use Site.js as a development-time reverse proxy for HTTP and WebSocket connections. This is useful if you have a web app written in any language that only supports HTTP (not TLS) that you want to deploy securely.

For example, the following is a simple HTTP server written in Python 3 (_server.py_) that runs insecurely on port 3000:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler

class MyRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Hello, from Python!')

server = HTTPServer(('localhost', 3000), MyRequestHandler)
server.serve_forever()
```

Run it (at http://localhost:3000) with:

```shell
$ python3 server
```

Then, proxy it securely from https://localhost using:

```shell
$ site :3000
```


Again, this is a convenient shortcut. The full form of this command is:

```shell
$ site serve :3000 @localhost:443
```

This will create and serve the following proxies:

  * http://localhost:3000 → https://localhost
  * ws://localhost:3000 → wss://localhost

### Testing (servers @hostname)

#### Regular server

Start serving the _my-site_ directory at your _hostname_ as a regular process using globally-trusted Let’s Encrypt certificates:

```shell
$ site my-site @hostname
```

#### Proxy server

Start serving `http://localhost:1313` and `ws://localhost:1313` at your _hostname_:

```shell
$ site :1313 @hostname
```

#### macOS notes

To set your hostname under macOS (e.g., to `example.small-tech.org`), run the following command:

```shell
$ sudo scutil --set HostName example.small-tech.org
```

#### Windows 10 notes

On Windows 10, you must add quotation marks around `@hostname` and `@localhost`. So the first example, above, would be written in the following way on Windows 10:

```shell
$ site my-site "@hostname"
```

Also, Windows 10, unlike Linux and macOS, does not have the concept of a hostname. The closest thing to it is your _full computer name_. Setting your full computer name is a somewhat convoluted process so we’ve documented it here for you.

##### How to set your full computer name on Windows 10

Say you want to set your hostname to `my-windows-laptop.small-tech.org`:

1. Control Panel → System And Security → System → Change Settings link (next to Computer name) → [Change…] Button
2. Under Computer name, enter your _subdomain_ (`my-windows-laptop`)
3. [More…] Button → enter your _domain name_ (`small-tech.org`) in the Primary DNS suffix of this computer field.
4. Press the various [OK] buttons to dismiss the various modal dialogues and restart your computer.

#### Making your server public

Use a service like [ngrok](https://ngrok.com/) (Pro+) to point a custom domain name to your temporary staging server. Make sure you set your `hostname` file (e.g., in `/etc/hostname` or via `hostnamectl set-hostname <hostname>` or the equivalent for your platform) to match your domain name. The first time you hit your server via your hostname it will take a little longer to load as your Let’s Encrypt certificates are being automatically provisioned by Auto Encrypt.

When you start your server, it will run as a regular process. It will not be restarted if it crashes or if you exit the foreground process or restart the computer.

### Deployment (live and one-time sync)

Site.js can also help you when you want to deploy your site to your live server with its sync feature. You can even have Site.js watch for changes and sync them to your server in real-time (e.g., if you want to live blog something or want to keep a page updated with local data you’re collecting from a sensor):

```shell
$ site my-demo --sync-to=my-demo.site
```

The above command will start a local development server at _https://localhost_. Additionally, it will watch the folder _my-demo_ for changes and sync any changes to its contents via rsync over ssh to the host _my-demo.site_.

If don’t want Site.js to start a server and you want to perform just a one-time sync, use the `--exit-on-sync` flag.

```shell
$ site my-demo --sync-to=my-demo.site --exit-on-sync
```

Without any customisations, the sync feature assumes that your account on your remote server has the same name as your account on your local machine and that the folder you are watching (_my-demo_, in the example above) is located at _/home/your-account/my-demo_ on the remote server. Also, by default, the contents of the folder will be synced, not the folder itself. You can change these defaults by specifying a full-qualified remote connection string as the `--sync-to` value.

The remote connection string has the format:

```
remoteAccount@host:/absolute/path/to/remoteFolder
```

For example:

```shell
$ site my-folder --sync-to=someOtherAccount@my-demo.site:/var/www
```

If you want to sync a different folder to the one you’re serving or if you’re running a proxy server (or if you just want to be as explicit as possible about your intent) you can use the `--sync-from` option to specify the folder to sync:

```shell
$ site :1313 --sync-from=public --sync-to=my-demo.site
```

(The above command will start a proxy server that forwards requests to and responses from http://localhost to https://localhost and sync the folder called `public` to the host `my-demo.site`.)

If you want to sync not the folder’s contents but the folder itself, use the `--sync-folder-and-contents` flag. e.g.,

```shell
$ site my-local-folder --sync-to=me@my.site:my-remote-folder --sync-folder-and-contents
```

The above command will result in the following directory structure on the remote server: _/home/me/my-remote-folder/my-local-folder_. It also demonstrates that if you specify a relative folder, Site.js assumes you mean the folder exists in the home directory of the account on the remote server.

### Production

__Available on Linux distributions with systemd (most Linux distributions, but [not these ones](https://sysdfree.wordpress.com/2019/03/09/135/) or on macOS or Windows).__

On your live, public server, you can start serving the _my-site_ directory at your _hostname_ as a daemon that is automatically run at system startup and restarted if it crashes with:

```shell
$ site enable my-site
```

The `enable` command sets up your server to start automatically when your server starts and restart automatically if it crashes. Requires superuser privileges on first run to set up the launch item.

For example, if you run the command on a connected server that has the ar.al domain pointing to it and `ar.al` set in _/etc/hostname_, you will be able to access the site at https://ar.al. (Yes, of course, [ar.al](https://ar.al) runs on Site.js.) The first time you hit your live site, it will take a little longer to load as your Let’s Encrypt certificates are being automatically provisioned by Auto Encrypt.

The automatic TLS certificate provisioning will get certificates for the naked domain and the _www_ subdomain. There is currently no option to add other subdomains. Also, please ensure that both the naked domain and the _www_ subdomain are pointing to your server before you enable your server and hit it to ensure that the provisioning works. This is especially important if you are migrating an existing site.

When the server is enabled, you can also use the following commands:

  - `start`: Start server.
  - `stop`: Stop server.
  - `restart`: Restart server.
  - `disable`: Stop server and remove from startup.
  - `logs`: Display and tail server logs.
  - `status`: Display detailed server information (press ‘q’ to exit).

Site.js uses the [systemd](https://freedesktop.org/wiki/Software/systemd/) to start and manage the daemon. Beyond the commands listed above that Site.js supports natively (and proxies to systemd), you can make use of all systemd functionality via the [systemctl](https://www.freedesktop.org/software/systemd/man/systemctl.html) and [journalctl](https://www.freedesktop.org/software/systemd/man/journalctl.html) commands.

## Build and test from source

Site.js is built using and supports Node.js LTS (currently version 12.16.2).

The build is created using Nexe and our own pre-built Nexe base Node.js binaries hosted on SiteJS.org. Please make sure that the version of your Node.js runtime matches the currently supported version stated above to ensure that the correct Nexe binary build is downloaded and used by the build script.

### Install the source and run tests

```shell
# Clone and install.
mkdir site.js && cd site.js
git clone https://source.small-tech.org/site.js/app.git
cd app
./install

# Run the app once (so that it can get your Node.js binary
# permission to bind to ports < 1024 on Linux ­– otherwise
# the tests will fail.)
bin/site.js test/site

# You should be able to see the site at https://localhost
# now. Press Ctrl+C to stop the server.

# Run unit tests.
npm test
```

__Note:__ If you upgrade your Node.js binary, please run `bin/site.js` again before running the tests (or using Site.js as a module in your own app) so that it can get permissions for your Node.js binary to bind to ports < 1024. Otherwise, it will fail with `Error: listen EACCES: permission denied 0.0.0.0:443`.

### Install as global Node.js module

After you install the source and run tests:

```shell
# Install the binary as a global module
npm i -g

# Serve the test site locally (visit https://localhost to view).
site test/site
```

__Note:__ for commands that require root privileges (i.e., `enable` and `disable`), Site.js will automatically restart itself using sudo and Node must be available for the root account. If you’re using [nvm](https://github.com/creationix/nvm), you can enable this via:

```shell
# Replace v10.16.3 with the version of node you want to make available globally.
sudo ln -s "$NVM_DIR/versions/node/v12.16.2/bin/node" "/usr/local/bin/node"
sudo ln -s "$NVM_DIR/versions/node/v12.16.2/bin/npm" "/usr/local/bin/npm"
```

### Native binaries

After you install the source and run tests:

```shell
# Build the native binary for your platform.
# To build for all platforms, use npm run build -- --all
npm run build

# Serve the test site (visit https://localhost to view).
# e.g., Using the Linux binary with version <binary-version>
# in the format (YYYYMMDDHHmmss).
dist/linux/<binary-version>/site test/site
```

### Build and install native binary locally

After you install the source and run tests:

```shell
npm run install-locally
```

### Deployment

```shell
# To cross-compile binaries for Linux (x64), macOS, and Windows
# and also copy them over to the Site.js web Site for deployment.
# (You will most likely not need to do this.)
npm run deploy
```

## Syntax

```shell
site [command] [folder|:port] [@host[:port]] [--options]
```

  - `command`: serve | enable | disable | start | stop | logs | status | update | uninstall | version | help
  - `folder|:port`: Path of folder to serve (defaults to current folder) or port on localhost to proxy.
  - `@host[:port]`: Host (and, optionally port) to sync. Valid hosts are @localhost and @hostname.
  - `--options`: Settings that alter command behaviour.

__Key:__ `[]` = optional &nbsp;&nbsp;`|` = or

### Commands:

  - `serve`: Serve specified folder (or proxy specified `:port`) on specified `@host` (at `:port`, if given). The order of arguments is:

    1. what to serve,
    2. where to serve it at. e.g.,

    ```site serve my-folder @localhost```

    If a port (e.g., `:1313`) is specified instead of my-folder, start an HTTP/WebSocket proxy.

  - `enable`: Start server as daemon with globally-trusted certificates and add to startup.

  - `disable`: Stop server daemon and remove from startup.

  - `start`: Start server as daemon with globally-trusted certificates.

  - `stop`: Stop server daemon.

  - `restart`: Restart server daemon.

  - `logs`: Display and tail server logs.

  - `status`: Display detailed server information.

  - `update`: Check for Site.js updates and update if new version is found.
  - `uninstall`: Uninstall Site.js.

  - `version`: Display version and exit.
  - `help`: Display help screen and exit.

If `command` is omitted, behaviour defaults to `serve`.

### Options:

#### For both the `serve` and `enable` commands:

  - `--aliases`: Comma-separated list of additional domains to obtain TLS certificates for and respond to.

#### For the `serve` command:

  - `--sync-to`: The host to sync to.

  - `--sync-from`: The folder to sync from (only relevant if `--sync-to` is specified).

  - `--exit-on-sync`: Exit once the first sync has occurred (only relevant if `--sync-to` is specified). Useful in deployment scripts.

  - `--sync-folder-and-contents`: Sync folder and contents (default is to sync the folder’s contents only).

#### For the `enable` command:

  - `--ensure-can-sync`: Ensure server can rsync via ssh.

All command-line arguments are optional. By default, Site.js will serve your current working folder over port 443 with locally-trusted certificates.

When you `serve` a site at `@hostname` or use the `enable` command, globally-trusted Let’s Encrypt TLS certificates are automatically provisioned for you using Auto Encrypt the first time you hit your hostname. The hostname for the certificates is automatically set from the hostname of your system (and the _www._ subdomain is also automatically provisioned).

## Usage examples

### Develop using locally-trusted TLS certificates

| Goal                                      | Command                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Serve current folder*                     | site                                                          |
|                                           | site serve                                                    |
|                                           | site serve .                                                  |
|                                           | site serve . @localhost                                       |
|                                           | site serve . @localhost:443                                   |
| Serve folder demo (shorthand)             | site demo                                                     |
| Serve folder demo on port 666             | site serve demo @localhost:666                                |
| Proxy localhost:1313 to https://localhost*| site :1313                                                    |
|                                           | site serve :1313 @localhost:443                               |
| Serve current folder, sync it to my.site* | site --sync-to=my.site                                        |
|                                           | site serve . @localhost:443 --sync-to=my.site                 |
| Serve demo folder, sync it to my.site     | site serve demo --sync-to=my.site                             |
| Ditto, but use account me on my.site      | site serve demo --sync-to=me@my.site                          |
| Ditto, but sync to remote folder ~/www    | site serve demo --sync-to=me@my.site:www                      |
| Ditto, but specify absolute path          | site serve demo --sync-to=me@my.site:/home/me/www             |
| Sync current folder, proxy localhost:1313 | site serve :1313 --sync-from=. --sync-to=my.site              |
| Sync current folder to my.site and exit   | site --sync-to=my.site --exit-on-sync                         |
| Sync demo folder to my.site and exit*     | site demo --sync-to=my.site --exit-on-sync                    |
|                                           | site --sync-from=demo --sync-to=my.site --exit-on-sync        |

### Stage and deploy using globally-trusted Let’s Encrypt certificates

#### Regular process:

| Goal                                      | Command                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Serve current folder                      | site @hostname                                                |
| Serve current folder also at aliases	    | site @hostname --aliases=other.site,www.other.site            |
| Serve folder demo*                        | site demo @hostname                                           |
|                                           | site serve demo @hostname                                     |
| Proxy localhost:1313 to https://hostname  | site serve :1313 @hostname                                    |

#### Start-up daemon:

| Goal                                      | Command                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Serve current folder as daemon            | site enable                                                   |
| Ditto & also ensure it can rsync via ssh  | site enable --ensure-can-sync                                 |
| Get status of daemon                      | site status                                                   |
| Start server                              | site start                                                    |
| Stop server                               | site stop                                                     |
| Restart server                            | site restart                                                  |
| Display server logs                       | site logs                                                     |
| Stop current daemon                       | site disable                                                  |

#### General:

| Goal                                      | Command                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Check for updates and update if found     | site update                                                   |


\* _Alternative, equivalent forms listed (some commands have shorthands)._

## Native support for an Evergreen Web

What if links never died? What if we never broke the Web? What if it didn’t involve any extra work? It’s possible. And, with Site.js, it’s effortless.

### The Archival Cascade

__(As of version 12.11.0)__ If you have static archives of previous versions of your site, you can have Site.js automatically serve them for you.

Just put them into folder named `.archive-1`, `.archive-2`, etc.

If a path cannot be found in your current site, Site.js will search for it first in `.archive-2` and, if it cannot find it there either, in `.archive-1`.

Paths in your current site will override those in `.archive-2` and those in `.archive-2` will, similarly, override those in `.archive-1`.

Use the archival  old links will never die but if you do replace them with never content in never versions, those will take precedence.

#### Legacy method (pre version 12.11.0)

In older versions, the convention for specifying the archival cascade was as follows:

```
|- my-site
|- my-site-archive-1
|- my-site-archive-2
|- etc.
```

This legacy method of specifying the archival cascade is still supported but may be removed in a future release. Please use the recommended method outlined above instead.

### Native 404 → 302 support

But what if the previous version of your site is a dynamic site and you either don’t want to lose the dynamic functionality or you simply cannot take a static backup. No worries. Just move it to a different subdomain or domain and make your 404s into 302s.

Site.js has native support for [the 404 to 302 technique](https://4042302.org) to ensure an evergreen web. Just serve the old version of your site (e.g., your WordPress site, etc.) from a different subdomain and tell Site.js to forward any unknown requests on your new static site to that subdomain so that all your existing links magically work.

To do so, create a simple file called `4042302` in the root directory of your web content and add the URL of the server that is hosting your older content. e.g.,

### /4042302
```
https://the-previous-version-of.my.site
```

You can chain the 404 → 302 method any number of times to ensure that none of your links ever break without expending any additional effort to migrate your content.

For more information and examples, see [4042302.org](https://4042302.org).

## Custom error pages

![Screenshot of the custom 404 error page included in the unit tests](images/custom-404.png)

You can specify a custom error page for 404 (not found) and 500 (internal server error) errors. To do so, create a folder with the status code you want off of the root of your web content (i.e., `/404` and/or `/500`) and place at least an `index.html` file in the folder. You can also, optionally, put any assets you want to display on your error pages into those folders and load them in via relative URLs. Your custom error pages will be served with the proper error code and at the URL that was being accessed.

If you do not create custom error pages, the built-in default error pages will be displayed for 404 and 500 errors.

When creating your own servers (see [API](#API)), you can generate the default error pages programmatically using the static methods `Site.default404ErrorPage()` and `Site.default500ErrorPage()`, passing in the missing path and the error message as the argument, respectively to get the HTML string of the error page returned.

## Ephemeral statistics

When Site.js launches, you will see a line similar to the following in the console:

```
📊    ❨site.js❩ For statistics, see https://localhost/b64bd821d521b6a65a307c2b83060766
```

This is your private, cryptographically secure URL where you can access ephemeral statistics about your site. If you want to share your statistics, link to them publicly. If you want to keep them private, keep the URL secret.

![Screenshot of the statistics page](/images/statistics.png)

The statistics are ephemeral as they are only kept in memory and they reset any time your server restarts.

The statistics are very basic and they’re there only to give an idea about which parts of your site are most popular as well as to highlight missing pages, etc., They’re not there so you can spy on people (if you want to do that, this is not the tool for you).

## Dynamic sites

You can specify routes with dynamic functionality by specifying HTTPS and WebSocket (WSS) routes in two ways: either using DotJS – a simple file system routing convention ala PHP, but for JavaScript – or through code in a _routes.js_ file.

In either case, your dynamic routes go into a directory named _.dynamic_ in the root of your site.

### DotJS

DotJS maps JavaScript modules in a file system hierarchy to routes on your web site in a manner that will be familiar to anyone who has ever used PHP.

#### GET-only (simplest approach)

The easiest way to get started with dynamic routes is to simply create a JavaScript file in a folder called _.dynamic_ in the root folder of your site. Any routes added in this manner will be served via HTTPS GET.

For example, to have a dynamic route at `https://localhost`, create the following file:

```
.dynamic/
    └ index.js
```

Inside _index.js_, all you need to do is to export your route handler:

```js
let counter = 0

module.exports = (request, response) => {
  response
    .type('html')
    .end(`
      <h1>Hello, world!</h1>
      <p>I’ve been called ${++counter} time${counter > 1 ? 's': ''} since the server started.</p>
    `)
}
```

To test it, run a local server (`site`) and go to `https://localhost`. Refresh the page a couple of times to see the counter increase.

Congratulations, you’ve just made your first dynamic route using DotJS.

In the above example, _index.js_ is special in that the file name is ignored and the directory that the file is in becomes the name of the route. In this case, since we put it in the root of our site, the route becomes `/`.

Usually, you will have more than just the index route (or your index route might be a static one). In those cases, you can either use directories with _index.js_ files in them to name and organise your routes or you can use the names of _.js_ files themselves as the route names. Either method is fine but you should choose one and stick to it in order not to confuse yourself later on (see [Precedence](#Precendence), below).

So, for example, if you wanted to have a dynamic route that showed the server CPU load and free memory, you could create a file called _.dynamic/server-stats.js_ in your web folder with the following content:

```js
const os = require('os')

function serverStats (request, response) {

  const loadAverages = `<p> ${os.loadavg().reduce((a, c, i) => `${a}\n<li><strong>CPU ${i+1}:</strong> ${c}</li>`, '<ul>') + '</ul>'}</p>`

  const freeMemory = `<p>${os.freemem()} bytes</p>`

  const page = `<html><head><title>Server statistics</title><style>body {font-family: sans-serif;}</style></head><body><h1>Server statistics</h1><h2>Load averages</h2>${loadAverages}<h2>Free memory</h2>${freeMemory}</body></html>`

  response
    .type('html')
    .end(page)
}

module.exports = serverStats
```

Site.js will load your dynamic route at startup and you can test it by hitting _https://localhost/server-stats_ using a local web server. Each time you refresh, you should get the latest dynamic content.

__Note:__ You could also have named your route _.dynamic/server-stats/index.js_ and still hit it from _https://localhost/server-stats_. It’s best to keep to one or other convention (either using file names as route names or directory names as route names). Using both in the same app will probably confuse you (see [Precedence](#Precendence), below).

##### Using node modules

Since Site.js contains Node.js, anything you can do with Node.js, you do with Site.js, including using node modules and [npm](https://www.npmjs.com/). To use custom node modules, initialise your _.dynamic_ folder using `npm init` and use `npm install`. Once you’ve done that, any modules you `require()` from your DotJS routes will be properly loaded and used.

Say, for example, that you want to display a random ASCII Cow using the Cows module (because why not?) To do so, create a _package.json_ file in your _.dynamic_ folder (e.g., use `npm init` to create this interactively). Here’s a basic example:

```json
{
  "name": "random-cow",
  "version": "1.0.0",
  "description": "Displays a random cow.",
  "main": "index.js",
  "author": "Aral Balkan <mail@ar.al> (https://ar.al)",
  "license": "AGPL-3.0-or-later"
}
```

Then, install the [cows node module](https://www.npmjs.com/package/cows) using npm:

```sh
npm i cows
```

This will create a directory called _node_modules_ in your _.dynamic_ folder and install the cows module (and any dependencies it may have) inside it. Now is also a good time to create a `.gitignore` file in the root of your web project and add the _node_modules_ directory to it if you’re using Git for source control so that you do not end up accidentally checking in your node modules. Here’s how you would do this using the command-line on Linux-like systems:

```sh
echo 'node_modules' >> .gitignore
```

Now, let’s create the route. We want it reachable at `https://localhost/cows` (of course), so let’s put it in:

```
.dynamic/
    └ cows
        └ index.js
```

And, finally, here’s the code for the route itself:

```js
const cows = require('cows')()

module.exports = function (request, response) {
  const randomCowIndex = Math.round(Math.random()*cows.length)-1
  const randomCow = cows[randomCowIndex]

  function randomColor () {
    const c = () => (Math.round(Math.random() * 63) + 191).toString(16)
    return `#${c()}${c()}${c()}`
  }

  response
    .type('html')
    .end(`
      <!doctype html>
      <html lang='en'>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Cows!</title>
        <style>
          html { font-family: sans-serif; color: dark-grey; background-color: ${randomColor()}; }
          body {
            display: grid; align-items: center; justify-content: center;
            height: 100vh; vertical-align: top; margin: 0;
          }
          pre { font-size: 24px; color: ${randomColor()}; mix-blend-mode: difference;}
        </style>
      </head>
      <body>
          <pre>${randomCow}</pre>
      </body>
      </html>
    `)
}
```

Now if you run `site` on the root of your web folder (the one that contains the _.dynamic_ folder) and hit `https://localhost/cows`, you should get a random cow in a random colour every time you refresh.

If including HTML and CSS directly in your dynamic route makes you cringe, feel free to `require` your templating library of choice and move them to external files. As hidden folders (directories that begin with a dot) are ignored in the _.dynamic_ folder and its subfolders, you can place any assets (HTML, CSS, images, etc.) into a directory that starts with a dot and load them in from there.

For example, if I wanted to move the HTML and CSS into their own files in the example above, I could create the following directory structure:

```
.dynamic/
    └ cows
        ├ .assets
        │     ├ index.html
        │     └ index.css
        └ index.js
```

For this example, I’m not going to use an external templating engine but will instead rely on the built-in template string functionality in JavaScript along with `eval()` (which is perfectly safe to use here as we are not processing external input).

So I move the HTML to the _index.html_ file (and add a template placeholder for the CSS in addition to the existing random cow placeholder):

```html
<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Cows!</title>
  <style>${css}</style>
</head>
<body>
    <pre>${randomCow}</pre>
</body>
</html>
```

And, similarly, I move the CSS to its own file, _index.css_:

```css
html {
  font-family: sans-serif;
  color: dark-grey;
  background-color: ${randomColor()};
}

body {
  display: grid;
  align-items: center;
  justify-content: center;
  height: 100vh;
  vertical-align: top;
  margin: 0;
}

pre {
  font-size: 24px;
  mix-blend-mode: difference;
  color: ${randomColor()};
}
```

Then, finally, I modify my `cows` route to read in these two template files and to dynamically render them in response to requests. My _index.js_ now looks like this:

```js
// These are run when the server starts so sync calls are fine.
const fs = require('fs')
const cssTemplate = fs.readFileSync('cows/.assets/index.css')
const htmlTemplate = fs.readFileSync('cows/.assets/index.html')
const cows = require('cows')()

module.exports = function (request, response) {
  const randomCowIndex = Math.round(Math.random()*cows.length)-1
  const randomCow = cows[randomCowIndex]

  function randomColor () {
    const c = () => (Math.round(Math.random() * 63) + 191).toString(16)
    return `#${c()}${c()}${c()}`
  }

  function render (template) {
    return eval('`' + template + '`')
  }

  // We render the CSS template first…
  const css = render(cssTemplate)

  // … because the HTML template references the rendered CSS template.
  const html = render(htmlTemplate)

  response.type('html').end(html)
}
```

When you save this update, Site.js will automatically reload the server with your new code (version 12.9.7 onwards). When you refresh in your browser, you should see exactly the same behaviour as before.

As you can see, you can create quite a bit of dynamic functionality just by using DotJS with its most basic file-based routing mode. However, with this convention you are limited to GET routes. To use both GET and POST routes, you have to do a tiny bit more work, as explained in the next section.

#### GET and POST routes

If you need POST routes (e.g., you want to post form content back to the server) in addition to GET routes, the directory structure works a little differently. In this case, you have to create a _.get_ directory for your GET routes and a _.post_ directory for your post routes.

Otherwise, the naming and directory structure conventions work exactly as before.

So, for example, if you have the following directory structure:

```
site/
  └ .dynamic/
        ├ .get/
        │   └ index.js
        └ .post/
            └ index.js
```

Then a GET request for `https://localhost` will be routed to _site/.dynamic/.get/index.js_ and a POST request for `https://localhost` will be routed to _site/.dynamic/.post/index.js_.

These two routes are enough to cover your needs for dynamic routes and form handling.

#### WebSocket (WSS) routes

Site.js is not limited to HTTPS, it also supports secure WebSockets.

To define WebSocket (WSS) routes alongside HTTPS routes, modify your directory structure so it resembles the one below:

```
site/
  └ .dynamic/
        ├ .https/
        │   ├ .get/
        │   │   └ index.js
        │   └ .post/
        │       └ index.js
        └ .wss/
            └ index.js
```

Note that all we’ve done is to move our HTTPS _.get_ and _.post_ directories under a _.https_ directory and we’ve created a separate _.wss_ directory for our WebSocket routes.

Here’s how you would implement a simple echo server that sends a copy of the message it receives from a client to that client:

```js
module.exports = (client, request) => {
  client.on('message', (data) => {
    client.send(data)
  })
}
```

You can also broadcast messages to all or a subset of connected clients. Here, for example, is a naïve single-room chat server implementation that broadcasts messages to all connected WebSocket clients (including the client that originally sent the message and any other clients that might be connected to different WebSocket routes on the same server):

```js
module.exports = (currentClient, request) {
  ws.on('message', message => {
    this.getWss().clients.forEach(client => {
      client.send(message)
    })
  })
})
```

To test it out, run Site.js and then open up the JavaScript console in a couple of browser windows and enter the following code into them:

```js
const socket = new WebSocket('https://localhost/chat')
socket.onmessage = message => console.log(message.data)
socket.send('Hello!')
```

For a slightly more sophisticated example that doesn’t broadcast a client’s own messages to itself and selectively broadcasts to only the clients in the same “rooms”, see the [Simple Chat example](examples/simple-chat). And here’s [a step-by-step tutorial](https://ar.al/2019/10/11/build-a-simple-chat-app-with-site.js/) that takes you through how to build it.

Here’s a simplified listing of the code for the server component of this example:

```js
module.exports = function (client, request) {
  // A new client connection has been made.
  // Persist the client’s room based on the path in the request.
  client.room = this.setRoom(request)

  console.log(`New client connected to ${client.room}`)

  client.on('message', message => {
    // A new message has been received from a client.
    // Broadcast it to every other client in the same room.
    const numberOfRecipients = this.broadcast(client, message)

    console.log(`${client.room} message broadcast to ${numberOfRecipients} recipient${numberOfRecipients === 1 ? '' : 's'}.`)
  })
}
```

### Advanced routing (routes.js file)

DotJS should get you pretty far for simpler use cases, but if you need full flexibility in routing (to use regular expressions in defining route paths, for example, or for initialising global objects that need to survive for the lifetime of the server), simply define a _routes.js_ in your _.dynamic_ folder:

```
site/
  └ .dynamic/
        └ routes.js
```

The _routes.js_ file should export a function that accepts a reference to the Express app created by Site.js and defines its routes on it. For example:

```js
module.exports = app => {
  // HTTPS route with a parameter called thing.
  app.get('/hello/:thing', (request, response) => {
    response
      .type('html')
      .end(`<h1>Hello, ${request.params.thing}!</h1>`)
  })

  // WebSocket route: echos messages back to the client that sent them.
  app.ws('/echo', (client, request) => {
  client.on('message', (data) => {
    client.send(data)
  })
}
```

When using the _routes.js_ file, you can use all of the features in [express](https://expressjs.com/) and [our fork of express-ws](https://github.com/aral/express-ws) (which itself wraps [ws](https://github.com/websockets/ws#usage-examples)).

### Routing precedence

#### Between dynamic route and static route

If a dynamic route and a static route have the same name, the dynamic route will take precedence. So, for example, if you’re serving the following site:

```
site/
  ├ index.html
  └ .dynamic/
        └ index.js
```

When you hit `https://localhost`, you will get the dynamic route defined in _index.js_.

#### Between two dynamic routes (TL; DR: do not rely on this)

In the following scenario:

```
site/
  └ .dynamic/
        ├ fun.html
        └ fun/
           └ index.js
```

The behaviour observed under Linux at the time of writing is that _fun/index.js_ will have precendence and mask _fun.html_. __Do not rely on this behaviour.__ The order of dynamic routes is based on a directory crawl and is not guaranteed to be the same in all future versions. For your peace of mind, please do not mix file-name-based and directory-name-based routing.

#### Between the various routing methods

Each of the routing conventions are mutually exclusive and applied according to the following precedence rules:

1. Advanced _routes.js_-based advanced routing.

2. DotJS with separate folders for _.https_ and _.wss_ routes routing (the _.http_ folder itself will apply precedence rules 3 and 4 internally).

3. DotJS with separate folders for _.get_ and _.post_ routes in HTTPS-only routing.

4. DotJS with GET-only routing.

So, if Site.js finds a _routes.js_ file in the root folder of your site’s folder, it will only use the routes from that file (it will not apply file-based routing).

If Site.js cannot find a _routes.js_ file, it will look to see if separate _.https_ and _.wss_ folders have been defined (the existence of just one of these is enough) and attempt to load DotJS routes from those folders. (If it finds separate _.get_ or _.post_ folders within the _.https_ folder, it will add the relevant routes from those folders; if it can’t it will load GET-only routes from the _.https_ folder and its subfolders.)

If separate _.https_ and _.wss_ folders do not exist, Site.js will expect all defined DotJS routes to be HTTPS and will initially look for separate _.get_ and _.post_ folders (the existence of either is enough to trigger this mode). If they exist, it will add the relevant routes from those folders and their subfolders.

Finally, if Site.js cannot find separate _.get_ and _.post_ folders either, it will assume that any DotJS routes it finds in the _.dynamic_ folder are HTTPS GET routes and attempt to add them from there (and any subfolders).

### Directory paths in your application

Your dynamic web routes are running within Site.js, which is a Node application compiled into a native binary. Here are how the various common directories for Node.js apps will behave:

  - `os.homedir()`: __(writable)__ This is the home folder of the account running Site.js. You can write to it to store persistent objects (e.g., save data).

  - `os.tmpdir()`: __(writable)__ Path to the system temporary folder. Use for content you can afford to lose and can recreate (e.g., cache API calls).

  - `.`: __(writable)__ Path to the root of your web content. Since you can write here, you can, if you want to, create content dynamically that will then automatically be served by the static web server.

  - `__dirname`: __(writeable)__ Path to the `.dynamic` folder.

  - `/`: __(read-only)__ Path to the `/usr` folder (Site.js is installed in `/usr/local/site`). You should not have any reason to use this.

If you want to access the directory of Site.js itself (e.g., to load in the `package.json` to read the app’s version), you can use the following code:

```js
const appPath = require.main.filename.replace('bin/site.js', '')
```

### Security

The code within your JavaScript routes is executed on the server. Exercise the same caution as you would when creating any Node.js app (sanitise input, etc.)

## API

You can also include Site.js as a Node module into your Node project. This section details the API you can use if you do that.

Site.js’s `createServer` method behaves like the built-in _https_ module’s `createServer` function. Anywhere you use `require('https').createServer`, you can simply replace it with:

```js
const Site = require('@small-tech/site.js')
new Site().createServer
```

### createServer([options], [requestListener])

  - __options__ _(object)_: see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener). Populates the `cert` and `key` properties from the automatically-created [Auto Encrypt Localhost](https://source.small-tech.org/site.js/lib/auto-encrypt-localhost) or Let’s Encrypt certificates and will overwrite them if they exist in the options object you pass in. If your options has `options.global = true` set, globally-trusted TLS certificates are obtained from Let’s Encrypt using [Auto Encrypt](https://source.small-tech.org/site.js/lib/auto-encrypt).

  - __requestListener__ _(function)_: see [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener). If you don’t pass a request listener, Site.js will use its default one.

    __Returns:__ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with either locally-trusted certificates via Auto Encrypt Localhost or globally-trusted ones from Let’s Encrypt via Auto Encrypt.

#### Example

```js
const Site = require('@small-tech/site.js')
const express = require('express')

const app = express()
app.use(express.static('.'))

const options = {} // to use globally-trusted certificates instead, set this to {global: true}
const server = new Site().createServer(options, app).listen(443, () => {
  console.log(` 🎉 Serving on https://localhost\n`)
})
```

### constructor (options)

Options is an optional parameter object that may contain the following properties, all optional:

  - __path__ _(string)_: the directory to serve using [Express](http://expressjs.com/).static.

  - __port__ _(number)_: the port to serve on. Defaults to 443. (On Linux, privileges to bind to the port are automatically obtained for you.)

  - __global__ _(boolean)_: if true, globally-trusted Let’s Encrypt certificates will be provisioned (if necessary) and used via Auto Encrypt. If false (default), locally-trusted certificates will be provisioned (if necessary) and used using _Auto Encrypt Localhost_.

  - __proxyPort__ _(number)_: if provided, a proxy server will be created for the port (and `path` will be ignored).

    __Returns:__ Site instance.

__Note:__ if you want to run the site on a port < 1024 on Linux, ensure that privileged ports are disabled ([see details](https://source.small-tech.org/site.js/app/-/issues/169)). e.g., use:

```js
require('lib/ensure').disablePrivilegedPorts()

// You can safely bind to ports below 1024 on Linux now.
```

### serve(callback)

  - __callback__ _(function)_: a function to be called when the server is ready. This parameter is optional. Default callbacks are provided for both regular and proxy servers.

    __Returns:__ [https.Server](https://nodejs.org/api/https.html#https_class_https_server) instance, configured with either locally or globally-trusted certificates.


#### Examples

Serve the current directory at https://localhost using locally-trusted TLS certificates:

```js
const Site = require('@small-tech/site.js')
const server = new Site().serve()
```

Serve the current directory at your hostname using globally-trusted Let’s Encrypt TLS certificates:

```js
const Site = require('@small-tech/site.js')
const server = new Site().serve({global: true})
```

Start a proxy server to proxy local port 1313 at your hostname:

```js
const Site = require('@small-tech/site.js')
const server = new Site().serve({proxyPort: 1313, global: true})
```

## Contributing

Site.js is [Small Technology](https://ar.al/2019/03/04/small-technology/). The emphasis is on _small_. It is, by design, a zero-configuration tool for creating and hosting single-tenant web applications. It is for humans, by humans. It is non-commercial. (It is not for enterprises, it is not for “startups”, and it is definitely not for unicorns.) As such, any new feature requests will have to be both fit for purpose and survive a trial by fire to be considered.

Please file issues and submit pull requests on the [Site.js Github Mirror](https://github.com/small-tech/site.js).

## Help wanted

For locally-trusted certificates, all dependencies are installed automatically for you if they do not exist if you have apt, pacman, or yum (untested) on Linux or if you have [Homebrew](https://brew.sh/) or [MacPorts](https://www.macports.org/) (untested) on macOS.

I can use your help to test Site.js on the following platform/package manager combinations:

  - Linux with yum
  - macOS with MacPorts

Please [let us know how/if it works](https://github.com/small-tech/site.js/issues). Thank you!

## Thanks

  * [thagoat](https://github.com/thagoat) for confirming that [installation works on Arch Linux with Pacman](https://github.com/indie-mirror/https-server/issues/1).

  * [Tim Knip](https://github.com/timknip) for confirming that [the module works with 64-bit Windows](https://github.com/indie-mirror/https-server/issues/2) with the following behaviour: “Install pops up a windows dialog to allow adding the cert.”

  * [Run Rabbit Run](https://hackers.town/@nobody) for [the following information](https://hackers.town/@nobody/101670447262172957) on 64-bit Windows: “Win64: works with the windows cert install popup on server launch. Chrome and ie are ok with the site then. FF 65 still throws the cert warning even after restarting.”
