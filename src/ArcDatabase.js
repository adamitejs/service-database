const rethinkdb = require('../adapters/rethinkdb');
const { server } = require('@arc/relay');
const DatabaseDeserializer = require('@arc/sdk/core/serialization/DatabaseDeserializer');

class ArcDatabase {
  constructor(config) {
    this.config = config;
    this.server = server({ apiUrl: 'http://localhost:9000', port: 9001 });
    this.adapter = rethinkdb(this.config);
    this.adapter.connect();
    this.registerCommands();
  }

  registerCommands() {
    this.server.command('database.readDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
        const data = await this.adapter.readDocument(ref);
        callback({ error: false, snapshot: { ref, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.createDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
        const data = await this.adapter.createDocument(ref, args.data);
        const documentRef = ref.doc(data.id);
        callback({ error: false, snapshot: { ref: documentRef, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.updateDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
        const data = await this.adapter.updateDocument(ref, args.data);
        callback({ error: false, snapshot: { ref, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.deleteDocument', async (client, args, callback) => {
      try {
        const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
        await this.adapter.deleteDocument(ref, args.data);
        callback({ error: false, snapshot: { ref } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });
  }

  start() {
    this.server.start();
  }
}

module.exports = ArcDatabase;