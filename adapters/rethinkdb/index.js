const RethinkDbAdapter = require('./RethinkDbAdapter');

module.exports = function(config) {
  return new RethinkDbAdapter(config);
};