const { MemoryAdapter } = require("./MemoryAdapter");

module.exports = function(config) {
  return new MemoryAdapter(config);
};
