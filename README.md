# pully-svc

Youtube channel and playlist auto-downloader!

[![Build Status](https://img.shields.io/travis/JimmyBoh/pully-server/master.svg?style=flat-square)](https://travis-ci.org/JimmyBoh/pully-server)
[![Code Coverage](https://img.shields.io/coveralls/JimmyBoh/pully-server/master.svg?style=flat-square)](https://coveralls.io/github/JimmyBoh/pully-server?branch=master)
[![Dependencies](https://img.shields.io/david/JimmyBoh/pully-server.svg?style=flat-square)](https://david-dm.org/JimmyBoh/pully-server)
[![DevDependencies](https://img.shields.io/david/dev/JimmyBoh/pully-server.svg?style=flat-square)](https://david-dm.org/JimmyBoh/pully-server?type=dev)
[![npm](https://img.shields.io/npm/v/pully-server.svg?style=flat-square)](https://www.npmjs.com/package/pully-server)
[![Monthly Downloads](https://img.shields.io/npm/dm/pully-server.svg?style=flat-square)](https://www.npmjs.com/package/pully-server)
[![Total Downloads](https://img.shields.io/npm/dt/pully-server.svg?style=flat-square)](https://www.npmjs.com/package/pully-server)


*More Details - Coming Soon!*


## Usage:

```bash
pully-svc init # creates a default config file at cwd called ./pully.conf.json

pully-svc init -c ./special.json # creates a default config file called ./special.json

pully-svc # starts the service with the config ./pully.conf.json

pully-svc -c ./special.json # starts the service with the config at ./special.json

```


## Features:
 - Simple JSON configuration, with global and per-feed customization.
 - Simple command line (two commands, one argument).
 - Periodically checks channels and/or playlists for new videos.
 - Downloads complete metadata, contains internal database of video information.
 
## Contribute
 
 0. Fork it
 1. `npm i`
 2. `npm run watch`
 3. Make changes and **write tests**.
 4. Send pull request! :sunglasses:
 
## License:
 
MIT