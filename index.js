'use strict';

const crypto = require('crypto');
const pathlib = require('path');
const promisify = require('micro-promisify');
const fsWriteFile = promisify(require('fs').writeFile);

const format = obj => (Array.from(Object.keys(obj).sort(), k => `${k} ${obj[k]}`)).join('\n');

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
    return this._compile(file);
  }

  compileStatic(file) {
    return this._compile(file);
  }

  onCompile(files) {
    this.shasums = [];
    this.paths = [];

    try {
      if (this.changedFileContentShasum) {
        const pathsToCache = files
          .filter(file => this._includePath(file.path, this.pathsToCache))
          .map(file => file.path)
          .sort();

        this.pathsToCache.push(...pathsToCache);
        return this._write(this.changedFileContentShasum).then(() => {
          this.changedFileContentShasum = null;
        });
      }

      this.changedFileContentShasum = null;
      return Promise.resolve(files);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  _compile(file) {
    try {
      this._processFile(file);
      return Promise.resolve(file);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  _processFile(file) {
    const path = file.path;
    let shasum = crypto.createHash('sha1');
    shasum.update(file.data);
    this.shasums.push(shasum.digest('hex'));

    if (this._includePath(path, this.paths)) {
      this.paths.push(path);
      this.paths.sort();
    }

    if (this.shasums.length === this.paths.length) {
      shasum = crypto.createHash('sha1');
      shasum.update(this.shasums.sort().join(), 'ascii');
      this.changedFileContentShasum = shasum.digest('hex');
    }
  }

  _includePath(path, paths) {
    return !path.endsWith('.appcache') && !this.config.ignore.test(path) && !paths.includes(path);
  }

  _write(shasum) {
    return fsWriteFile(pathlib.join(this.publicPath, this.config.manifestFile),
      `\
CACHE MANIFEST
# ${shasum}

NETWORK:
${this.config.network.join('\n')}

FALLBACK:
${format(this.config.fallback)}

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
