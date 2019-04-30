const adamite = require('@adamite/sdk');
const VirtualDatabasePlugin = require('./VirtualDatabasePlugin');
const { server } = require('@adamite/relay');
const DatabaseCommands = require('./DatabaseCommands');

class DatabaseService {
  constructor(config) {
    this.config = config;
    this.server = server({ apiUrl: 'http://localhost:9000', port: 9001 });
    this.commands = new DatabaseCommands(this);
    this.registerCommands();
    
    adamite.use(VirtualDatabasePlugin);
    adamite().initializeApp({ _database: this });
  }

  registerCommands() {
    this.server.command(
      'database.createDocument',
      this.commands.createDocument.bind(this.commands)
    );

    this.server.command(
      'database.readDocument',
      this.commands.readDocument.bind(this.commands)
    );    

    this.server.command(
      'database.updateDocument',
      this.commands.updateDocument.bind(this.commands)
    );

    this.server.command(
      'database.deleteDocument',
      this.commands.deleteDocument.bind(this.commands)
    );
    
    this.server.command(
      'database.readCollection',
      this.commands.readCollection.bind(this.commands)
    );

    this.server.command(
      'database.subscribeDocument',
      this.commands.subscribeDocument.bind(this.commands)
    );

    this.server.command(
      'database.subscribeCollection',
      this.commands.subscribeCollection.bind(this.commands)
    );
  }

  start() {
    this.commands.start();
    this.server.start();
  }
}

module.exports = DatabaseService;