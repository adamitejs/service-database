const adamite = require("@adamite/sdk").default;
const VirtualDatabasePlugin = require("./VirtualDatabasePlugin");
const DatabaseCommands = require("./DatabaseCommands");

class DatabaseService {
  constructor(server, config, rootConfig) {
    this.config = config;
    this.rootConfig = rootConfig;
    this.server = server;
    this.commands = new DatabaseCommands(this);
    this.registerCommands();

    adamite().use(VirtualDatabasePlugin);
    adamite().initializeApp({ _database: this });

    this.commands.start();
  }

  registerCommands() {
    this.server.command("database.createDocument", this.commands.createDocument.bind(this.commands));
    this.server.command("database.readDocument", this.commands.readDocument.bind(this.commands));
    this.server.command("database.updateDocument", this.commands.updateDocument.bind(this.commands));
    this.server.command("database.deleteDocument", this.commands.deleteDocument.bind(this.commands));
    this.server.command("database.readCollection", this.commands.readCollection.bind(this.commands));
    this.server.command("database.subscribeDocument", this.commands.subscribeDocument.bind(this.commands));
    this.server.command("database.subscribeCollection", this.commands.subscribeCollection.bind(this.commands));
    this.server.command("database.unsubscribe", this.commands.unsubscribe.bind(this.commands));

    this.server.command("database.admin.getCollections", this.commands.adminGetCollections.bind(this.commands));
  }
}

module.exports = DatabaseService;
