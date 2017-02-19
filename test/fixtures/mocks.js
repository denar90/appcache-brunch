exports.files = [
  {
    path: 'path/to/file_1.js',
    data: 'const foo = bar'
  },
  {
    path: 'path/to/file_2.css',
    data: 'const bar = baz'
  }
];

exports.ignoredFiles = [
  {
    path: 'path/to/file_1.appcache',
    data: 'appcache manifest'
  },
  {
    path: 'path/to/file_2.js',
    data: 'const bar = baz'
  }
];