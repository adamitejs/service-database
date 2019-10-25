const DatabaseService = require("./src/DatabaseService");

module.exports = function(config, rootConfig) {
  const service = new DatabaseService(config, rootConfig);
  service.start();
  return service;
};
