const { App } = require('@adamite/sdk/app');
const VirtualDatabaseService = require('./VirtualDatabaseService');

App.addService('database', function(app) {
  const service = new VirtualDatabaseService(app);
  app.database = service.database.bind(service);
  return service;
});