'use strict';

const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const expect = require('chai').expect;
const mocks = require('./fixtures/mocks');
const config = require('./fixtures/brunch.conf');
const defaultOptions = require('./fixtures/defaultOptions').defaultOptions;
const Plugin = require('../index');

describe('Plugin', () => {
  let plugin;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    plugin = new Plugin(config.default);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should be an object', () => {
    expect(plugin).to.be.ok;
  });

  it('should has #onCompile method', () => {
    expect(plugin.onCompile).to.be.an.instanceof(Function);
  });

  describe('public variables', () => {
    describe('when config is not set', () => {
      beforeEach(() => {
        plugin = new Plugin(config.publicVariables);
      });

      it('should have publicPath', () => {
        expect(plugin.publicPath).to.be.equal(config.publicVariables.paths.public);
      });

      it('should have default options', () => {
        expect(plugin.config).to.be.deep.equal(defaultOptions);
      });

      it('should have empty array paths', () => {
        expect(plugin.paths).to.be.deep.equal([]);
      });
    });

    describe('when config is set', () => {
      beforeEach(() => {
        plugin = new Plugin(config.publicVariablesWithConfig);
      });

      it('should rewrite default options', () => {
        expect(plugin.config).to.be.deep.equal(config.publicVariablesWithConfig.plugins.appcache);
      });
    });
  });

  describe('onCompile', () => {
    let readStreamStub;

    beforeEach(() => {
      plugin = new Plugin(config.publicVariables);
      readStreamStub = sandbox.stub(plugin, '_readStream');
    });

    describe('when files are ignored', () => {
      it('should not fill "paths" with ignored files paths', () => {
        plugin.onCompile(mocks.ignoredFiles);
        expect(plugin.paths.length).to.be.equal(1);
        expect(plugin.paths).to.be.deep.equal(['path/to/file_2.js']);
      });

      it('should call "_readStream" method', () => {
        plugin.onCompile(mocks.ignoredFiles);
        expect(readStreamStub).to.be.have.been.calledOnce;
      });
    });

    it('should define "shasums" public variable', () => {
      plugin.onCompile(mocks.files);
      expect(plugin.shasums).to.be.deep.equal([]);
    });

    it('should fill "paths" with files paths', () => {
      const expected = mocks.files.map(file => file.path);
      plugin.onCompile(mocks.files);
      expect(plugin.paths.length).to.be.equal(2);
      expect(plugin.paths).to.be.deep.equal(expected);
    });

    it('should call "_readStream" method', () => {
      plugin.onCompile(mocks.files);
      expect(readStreamStub).to.be.have.been.calledTwice;
    });
  });

  describe('_format', () => {
    it('should format data', () => {
      const data = {
        'images/large/': 'images/offline.jpg',
        '*.html': '/offline.html'
      };
      const expected = '*.html /offline.html\nimages/large/ images/offline.jpg';
      expect(plugin._format(data)).to.be.equal(expected);
    });
  });

  describe('_readStream', () => {
    let writeStub;
    const filePath = './test/fixtures/compiled-resource.js';

    beforeEach(() => {
      plugin = new Plugin(config.publicVariables);
      writeStub = sandbox.stub(plugin, '_write');
      plugin.files = [filePath];
      plugin.shasums = [];
    });

    it('should have shasums', () => {
      return plugin._readStream(filePath).then(() => {
        expect(plugin.shasums.length).to.be.equal(1);
      }, error => expect(error).not.to.be.ok);
    });

    it('should call "write" method', () => {
      return plugin._readStream(filePath).then(() => {
        expect(writeStub).to.have.been.calledOnce;
      }, error => expect(error).not.to.be.ok);
    });
  });

  describe('_write', () => {
    const tmpDir = './tmp';

    before(() => {
      fs.mkdirSync(tmpDir);
    });

    beforeEach(() => {
      plugin = new Plugin(config.write);
    });

    it('should have shasums', () => {
      const expected =`CACHE MANIFEST
# 38445707d5a45be1e75fd44de16b3b65ce2bd4e9

NETWORK:
/myapi

FALLBACK:
*.html /offline.html

CACHE:

http://other.example.org/image.jpg`;

      plugin._write('38445707d5a45be1e75fd44de16b3b65ce2bd4e9');
      return new Promise(resolve => {
        fs.readFile(path.resolve(tmpDir, plugin.config.manifestFile), 'utf8', function(err, data) {
          expect(data).to.be.equal(expected);
          resolve();
        });
      });
    });

    after(() => {
      fs.unlinkSync(path.resolve(tmpDir, plugin.config.manifestFile));
      fs.rmdirSync(tmpDir);
    });
  });
});
