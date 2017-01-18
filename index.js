'use strict';

const crypto = require('crypto');
const fs = require('fs');
const pathlib = require('path');

class AppCacheCompiler {
  constructor(config) {
    this.publicPath = config.paths.public;
    this.config = config.plugins.appcache || {};

    if ('appcache' in this.config) {
      console.warn('Warning: config.appcache is deprecated, please move it to config.plugins.appcache');
    }

    const defaultOptions = {
      ignore: /\/\./,
      externalCacheEntries: [],
      network: ['*'],
      fallback: {},
      staticRoot: '.',
      manifestFile: 'appcache.appcache'
    };

    this.config = Object.assign({}, defaultOptions, this.config);

    this.paths = [];
  }

  onCompile(files) {
    this.shasums = [];

    files.forEach(file => {
      const path = file.path;

      if (!/[.]appcache$/.test(path) && !this.config.ignore.test(path) && !this.paths.includes(path)) {
        this.paths.push(path);
        this.paths.sort();
      }
    });

    let results = this.paths.map(path => this._readStream(path));

    return Promise.all(results).catch(error => console.log(error));
  }

  _format(obj) {
    return (Array.from(Object.keys(obj).sort()).map((k) => `${k} ${obj[k]}`)).join('\n');
  };

  _readStream(path) {
    return new Promise((resolve, reject) => {
      try {
        let shasum = crypto.createHash('sha1');
        let stream = fs.ReadStream(path);

        stream.on('data', data => shasum.update(data));

        stream.on('end', () => {
          this.shasums.push(shasum.digest('hex'));
          if (this.shasums.length === this.paths.length) {
            shasum = crypto.createHash('sha1');
            shasum.update(this.shasums.sort().join(), 'ascii');
            this._write(shasum.digest('hex'));
            resolve();
          }
        });
        stream.on('finish', resolve);
        stream.on('error', reject);

      } catch(error) {
        reject(error);
      }
    });
  }

  _write(shasum) {
    return fs.writeFileSync(pathlib.join(this.publicPath, this.config.manifestFile),
      `\
CACHE MANIFEST
# ${shasum}

NETWORK:
${this.config.network.join('\n')}

FALLBACK:
${this._format(this.config.fallback)}

CACHE:
${(Array.from(this.paths).map((p) => `${this.config.staticRoot}/${p}`)).join('\n')}
${this.config.externalCacheEntries.join('\n')}\
`
    );
  }
}

AppCacheCompiler.prototype.brunchPlugin = true;

module.exports = AppCacheCompiler;