const DatabaseService = require("./src/DatabaseService");

module.exports = function(config) {
  const service = new DatabaseService(config);
  service.start();
  return service;
};
