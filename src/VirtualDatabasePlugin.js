const VirtualDatabaseClient = require('./VirtualDatabaseClient');
const { DatabaseReference } = require('@adamite/sdk/database');

class VirtualDatabasePlugin {
  constructor(app) {
    this.app = app;
    this.app.database = this.database.bind(this);
    this.client = new VirtualDatabaseClient(this.app);
  }

  database(name = 'default') {
    return new DatabaseReference(name, this.app.ref);
  }
}

VirtualDatabasePlugin.PLUGIN_NAME = 'database';
module.exports = VirtualDatabasePlugin;