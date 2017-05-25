'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const mocks = require('./fixtures/mocks');
const config = require('./fixtures/brunch.conf');

const Plugin = require('..');

describe('Plugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin(config.default);
  });

  describe('_processFile', () => {
    it('adds file to "paths"', () => {
      const [file] = mocks.files;
      plugin._processFile(file);
      assert.deepEqual(plugin.paths, ['path/to/file_1.js']);
    });

    it('ignores appcache files', () => {
      const [ignoredFiles] = mocks.ignoredFiles;
      plugin._processFile(ignoredFiles);
      assert.deepEqual(plugin.paths, []);
    });

    it('sets changedFileContentShasum', () => {
      const [file] = mocks.files;
      plugin._processFile(file);
      assert.equal(plugin.changedFileContentShasum, 'a7b003bdeb8e286c215e85e5537cfc080abdc9db');
    });
  });

  describe('onCompile', () => {
    it('writes appcache file', () => {
      const folderPath = path.join(process.cwd(), config.default.paths.public);
      const appcacheFilePath = path.join(folderPath, 'appcache.appcache');

      fs.mkdirSync(folderPath);

      plugin.changedFileContentShasum = 'a7b003bdeb8e286c215e85e5537cfc080abdc9db';
      return plugin.onCompile(mocks.files)
        .then(() => {
          const actualAppCacheContent = fs.readFileSync(appcacheFilePath, 'utf8');
          const expectedAppCacheContent = `CACHE MANIFEST
# a7b003bdeb8e286c215e85e5537cfc080abdc9db\n
NETWORK:
*\n
FALLBACK:\n\n
CACHE:
./path/to/file_1.js
./path/to/file_2.css\n`;
          fs.unlinkSync(appcacheFilePath);
          fs.rmdirSync(folderPath);

          assert.equal(actualAppCacheContent, expectedAppCacheContent);
        });
    });

    it('writes appcache file with fallback option', () => {
      const folderPath = path.join(process.cwd(), config.default.paths.public);
      const appcacheFilePath = path.join(folderPath, 'appcache.appcache');

      fs.mkdirSync(folderPath);

      plugin.changedFileContentShasum = 'a7b003bdeb8e286c215e85e5537cfc080abdc9db';
      plugin.config.fallback = config.fallback;
      return plugin.onCompile(mocks.files)
        .then(() => {
          const actualAppCacheContent = fs.readFileSync(appcacheFilePath, 'utf8');
          const expectedAppCacheContent = `CACHE MANIFEST
# a7b003bdeb8e286c215e85e5537cfc080abdc9db\n
NETWORK:
*\n
FALLBACK:
*.html /offline.html
/main.py /static.html
images/large/ images/offline.jpg\n
CACHE:
./path/to/file_1.js
./path/to/file_2.css\n`;
          fs.unlinkSync(appcacheFilePath);
          fs.rmdirSync(folderPath);

          assert.equal(actualAppCacheContent, expectedAppCacheContent);
        });
    });
  });
});
