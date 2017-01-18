exports.default = {
  paths: {
    public: 'public/'
  },
  plugins: {}
};

exports.publicVariables = {
  paths: {
    public: 'public/'
  },
  plugins: {}
};

exports.publicVariablesWithConfig = {
  paths: {
    public: 'public/'
  },
  plugins: {
    appcache: {
      ignore: /\/\./,
      manifestFile: 'my.appcache',
      staticRoot: '/static',
      network: [
        '/myapi'
      ],
      fallback: {
        '*.html': '/offline.html'
      },
      externalCacheEntries: [
        'http://other.example.org/image.jpg'
      ]
    }
  }
};

exports.write = {
  paths: {
    public: 'tmp/'
  },
  plugins: {
    appcache: {
      ignore: /\/\./,
      manifestFile: 'my.appcache',
      staticRoot: '/static',
      network: [
        '/myapi'
      ],
      fallback: {
        '*.html': '/offline.html'
      },
      externalCacheEntries: [
        'http://other.example.org/image.jpg'
      ]
    }
  }
};

