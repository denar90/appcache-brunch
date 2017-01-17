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

    // Defaults options
    this.options = {
      ignore: /[\\/][.]/,
      externalCacheEntries: [],
      network: ['*'],
      fallback: {},
      staticRoot: '.',
      manifestFile: 'appcache.appcache'
    };

    // Merge config
    Object.assign(this.options, this.config);

    this.paths = [];
    this.shasums = [];
  }

  onCompile(files) {
    let results = files.map(file => {
      const path = file.path;

      // ignore appcache file if it was iether present in assets or set in options
      if (!/[.]appcache$/.test(path) && !this.options.ignore.test(path) && !this.paths.includes(path)) {
        this.paths.push(path);
        this.paths.sort();
      }

      return this._readStream(file.path);
    });

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
    return fs.writeFileSync(pathlib.join(this.publicPath, this.options.manifestFile),
      `\
CACHE MANIFEST
# ${shasum}

NETWORK:
${this.options.network.join('\n')}

FALLBACK:
${this._format(this.options.fallback)}

CACHE:
${(Array.from(this.paths).map((p) => `${this.options.staticRoot}/${p}`)).join('\n')}
${this.options.externalCacheEntries.join('\n')}\
`
    );
  }
}

AppCacheCompiler.prototype.brunchPlugin = true;
AppCacheCompiler.prototype.staticTargetExtension = 'html';

module.exports = AppCacheCompiler;