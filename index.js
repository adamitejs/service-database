const ArcDatabase = require('./src/ArcDatabase');

module.exports = function(config) {
  const database = new ArcDatabase(config);
  database.start();
  return database;
};