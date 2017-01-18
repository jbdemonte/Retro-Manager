var path = require('path');

var exports = module.exports = {};

exports.SOURCES_PATH = path.resolve('sources');
exports.TMP_PATH = __base + 'tmp';

Object.freeze(exports);