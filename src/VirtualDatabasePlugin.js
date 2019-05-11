const VirtualDatabaseClient = require("./VirtualDatabaseClient");
const { DatabaseReference } = require("@adamite/sdk");

class VirtualDatabasePlugin {
  constructor(app) {
    this.app = app;
  }

  database(name = "default") {
    return new DatabaseReference(name, this.app.ref);
  }

  getPluginName() {
    return "database";
  }

  initialize() {
    this.client = new VirtualDatabaseClient(this.app);
  }
}

VirtualDatabasePlugin.PLUGIN_NAME = "database";
module.exports = VirtualDatabasePlugin;
