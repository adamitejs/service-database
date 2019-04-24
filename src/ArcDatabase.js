const rethinkdb = require('../adapters/rethinkdb');
const uuid = require('uuid');
const { server } = require('@arc/relay');
const { DatabaseReference, DocumentReference } = require('@arc/sdk/database');

class ArcDatabase {
  constructor(config) {
    this.config = config;
    this.server = server({ apiUrl: 'http://localhost:8081', port: 9000 });
    this.adapter = rethinkdb(this.config);
    this.adapter.connect();
    this.registerCommands();
  }

  registerCommands() {
    this.server.command('database.readDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseReference.fromPath(args.ref);
        const data = await this.adapter.readDocument(ref);
        callback({ ref: args.ref, error: false, data });
      } catch (err) {
        callback({ ref: args.ref, error: err });
      }
    });

    this.server.command('database.createDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseReference.fromPath(args.ref);
        const result = await this.adapter.createDocument(ref, args.data);
        callback({ ref: args.ref, error: false, data: result });
      } catch (err) {
        callback({ ref: args.ref, error: err });
      }
    });

    this.server.command('database.updateDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseReference.fromPath(args.ref);
        const result = await this.adapter.updateDocument(ref, args.data);
        callback({ ref: args.ref, error: false, data: result });
      } catch (err) {
        callback({ ref: args.ref, error: err.message });
      }
    });

    this.server.command('database.deleteDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseReference.fromPath(args.ref);
        await this.adapter.deleteDocument(ref);
        callback({ ref: args.ref, error: false });
      } catch (err) {
        callback({ ref: args.ref, error: err });
      }
    });
  }

  start() {
    this.server.start();
  }
}

module.exports = ArcDatabase;