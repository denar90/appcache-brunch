exports.default = {
  paths: {
    public: 'public/'
  },
  plugins: {}
};

exports.fallback = {
  '/main.py': '/static.html',
  'images/large/': 'images/offline.jpg',
  '*.html': '/offline.html'
};