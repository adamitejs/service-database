const { App } = require('@adamite/sdk/app');
const VirtualDatabaseService = require('./VirtualDatabaseService');

module.exports = {
  registerDatabasePlugin: () => {
    App.addPlugin('database', function(app) {
      const service = new VirtualDatabaseService(app);
      app.database = service.database.bind(service);
      return service;
    });
  }
};