const VirtualClient = require('./VirtualClient');
const { DatabaseReference } = require('@adamite/sdk/database');

class VirtualDatabaseService {
  constructor(app) {
    this.app = app;
    this.client = new VirtualClient(this.app);
  }

  database(name = 'default') {
    return new DatabaseReference(name, this.app.ref);
  }
}

module.exports = VirtualDatabaseService;