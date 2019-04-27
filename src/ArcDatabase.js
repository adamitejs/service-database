const { server } = require('@arc/relay');
const { RuleValidator } = require('../rules');
const DatabaseDeserializer = require('@arc/sdk/core/serialization/DatabaseDeserializer');
const uuid = require('uuid');
const rethinkdb = require('../adapters/rethinkdb');

class ArcDatabase {
  constructor(config) {
    this.config = config;
    this.server = server({ apiUrl: 'http://localhost:9000', port: 9001 });
    this.rules = new RuleValidator(this.config.database.rules);
    this.adapter = rethinkdb(this.config);
    this.adapter.connect();
    this.registerCommands();
  }

  registerCommands() {
    this.server.command('database.readDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
      try {
        const data = await this.adapter.readDocument(ref);
        await this.rules.validateRule('read', ref, { ref }, { data });
        callback({ error: false, snapshot: { ref, data } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.readCollection', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
      
      try {
        const data = await this.adapter.readCollection(ref);
        const docs = data.map(doc => ({ ref: ref.doc(doc.id), data: doc }));
        callback({ error: false, snapshot: { ref, data: docs } });
      } catch (err) {
        console.error(err);
        callback({ error: err.message, snapshot: { ref } });
      }
    });

    this.server.command('database.createDocument', async (client, args, callback) => {
      const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
      
      try {
        await this.rules.validateRule('create', ref, { ref });
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
        await this.rules.validateRule('update', ref, { ref });
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
        await this.rules.validateRule('delete', ref, { ref });
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
        
        await this.adapter.subscribeDocument(ref, async (err, oldData, newData) => {
          if (err) {
            console.error(err);
            return this.client.socket.emit(id, { error: err.message, subscription: { ref, id } });
          }

          try {
            await this.rules.validateRule('read', ref, { ref }, { data: newData });

            client.socket.emit(id, {
              error: false,
              subscription: { ref, id },
              newSnapshot: newData && { ref, data: newData },
              oldSnapshot: oldData && { ref, data: oldData },
            });
          } catch (err) {
            console.error(err);
          }
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
        
        await this.adapter.subscribeCollection(ref, async (err, oldData, newData) => {
          if (err) {
            console.error(err);
            return this.client.socket.emit(id, { error: err.message, subscription: { ref, id } });
          }

          const newDocRef = newData && ref.doc(newData.id);
          const oldDocRef = oldData && ref.doc(oldData.id);

          try {            
            if (newDocRef) {
              await this.rules.validateRule('read', newDocRef, { newDocRef }, { data: newData });
            }

            client.socket.emit(id, {
              error: false,
              subscription: { ref, id },
              newSnapshot: newData && { ref: newDocRef, data: newData },
              oldSnapshot: oldData && { ref: oldDocRef, data: oldData },
            });
          } catch (err) {
            console.error(err);

            if (oldData) {
              client.socket.emit(id, {
                error: false,
                subscription: { ref, id },
                oldSnapshot: oldData && { ref: oldDocRef, data: oldData },
              });
            }
          }
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