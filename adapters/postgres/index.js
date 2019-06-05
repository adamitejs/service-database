const PostgresAdapter = require("./PostgresAdapter");

module.exports = function(config) {
  return new PostgresAdapter(config);
};
