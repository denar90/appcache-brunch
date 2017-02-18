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
      manifestFile: 'appcache.appcache',
    };

    this.config = Object.assign({}, defaultOptions, this.config);

    this.paths = [];
    this.pathsToCache = [];
    this.shasums = [];
    this.changedFileContentShasum = null;
  }

  compile(file) {
    try {
      return this.processFile(file).then(() => file);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  compileStatic(file) {
    try {
      return this.processFile(file).then(() => file);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  processFile(file) {
    if (!/[.]appcache$/.test(file.path) && !this.config.ignore.test(file.path) && !this.paths.includes(file.path)) {
      this.paths.push(file.path);
      this.paths.sort();
    }
    return this._readStream(file.path).catch(error => {
      throw new Error(error);
    });
  }


  onCompile(files) {
    this.shasums = [];
    this.paths = [];

    try {
      if (this.changedFileContentShasum) {
        this.pathsToCache = files
          .filter(file => !/[.]appcache$/.test(file.path) && !this.config.ignore.test(file.path) && !this.pathsToCache.includes(file.path))
          .map(file => file.path)
          .sort();

        this._write(this.changedFileContentShasum);
      }

      this.changedFileContentShasum = null;
      return Promise.resolve(files);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  _format(obj) {
    return (Array.from(Object.keys(obj).sort()).map(k => `${k} ${obj[k]}`)).join('\n');
  };

  _readStream(path) {
    return new Promise((resolve, reject) => {
      try {
        let shasum = crypto.createHash('sha1');
        const stream = fs.createReadStream(path);

        stream.on('data', data => shasum.update(data));

        stream.on('end', () => {
          this.shasums.push(shasum.digest('hex'));
          if (this.shasums.length === this.paths.length) {
            shasum = crypto.createHash('sha1');
            shasum.update(this.shasums.sort().join(), 'ascii');
            this.changedFileContentShasum = shasum.digest('hex');
          }
          resolve();
        });
        stream.on('finish', resolve);
        stream.on('error', reject);

      } catch (error) {
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
${(Array.from(this.pathsToCache).map(p => `${this.config.staticRoot}/${p}`)).join('\n')}
${this.config.externalCacheEntries.join('\n')}\
`
    );
  }
}

AppCacheCompiler.prototype.brunchPlugin = true;
AppCacheCompiler.prototype.pattern = /(?:)/;

module.exports = AppCacheCompiler;
