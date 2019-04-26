const { server } = require('@arc/relay');
const DatabaseDeserializer = require('@arc/sdk/core/serialization/DatabaseDeserializer');
const uuid = require('uuid');
const rethinkdb = require('../adapters/rethinkdb');

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
      const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
      try {
        const data = await this.adapter.readDocument(ref);
        callback({ error: false, snapshot: { ref, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.createDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
      
      try {
        const data = await this.adapter.createDocument(ref, args.data);
        const documentRef = ref.doc(data.id);
        callback({ error: false, snapshot: { ref: documentRef, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.updateDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
      try {
        const data = await this.adapter.updateDocument(ref, args.data);
        callback({ error: false, snapshot: { ref, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.deleteDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
      try {
        await this.adapter.deleteDocument(ref, args.data);
        callback({ error: false, snapshot: { ref } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.subscribeDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
      try {
        const id = uuid.v4();
        
        await this.adapter.subscribeDocument(ref, (err, oldData, newData) => {
          if (err) {
            console.error(err);
            return this.client.socket.emit(id, { error: err.message, subscription: { ref, id } });
          }

          client.socket.emit(id, {
            error: false,
            subscription: { ref, id },
            newSnapshot: newData && { ref, data: newData },
            oldSnapshot: oldData && { ref, data: oldData },
          });
        });

        callback({ error: false, subscription: { ref, id } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, subscription: { ref } });
      }
    });

    this.server.command('database.subscribeCollection', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
      
      try {
        const id = uuid.v4();
        
        await this.adapter.subscribeCollection(ref, (err, oldData, newData) => {
          if (err) {
            console.error(err);
            return this.client.socket.emit(id, { error: err.message, subscription: { ref, id } });
          }

          client.socket.emit(id, {
            error: false,
            subscription: { ref, id },
            newSnapshot: newData && { ref: ref.doc(newData.id), data: newData },
            oldSnapshot: oldData && { ref: ref.doc(oldData.id), data: oldData },
          });
        });

        callback({ error: false, subscription: { ref, id } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, subscription: { ref } });
      }
    });
  }

  start() {
    this.server.start();
  }
}

module.exports = ArcDatabase;