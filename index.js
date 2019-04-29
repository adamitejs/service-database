const AdamiteDatabase = require('./src/AdamiteDatabase');

module.exports = function(config) {
  const database = new AdamiteDatabase(config);
  database.start();
  return database;
};