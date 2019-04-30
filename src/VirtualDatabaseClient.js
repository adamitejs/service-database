const DatabaseDeserializer = require('@adamite/sdk/core/serialization/DatabaseDeserializer');

/**
 * VirtualClient serves as an artificial socket.io client instance, which
 * can serve as a replacement for DatabaseService.client within the
 * Database Service itself. The purpose of this is to allow internal
 * database service functionality to communicate with the database without
 * having to establish an internal connection to itself.
 */
class VirtualClient {
  constructor(app) {
    this.app = app;
  }

  async emit(eventName, eventArgs, callback) {
    if (eventName !== 'command') return;

    const { commands: { adapter } } = this.app.config._database;
    const { name, args } = eventArgs;

    switch (name) {
      case 'database.readDocument': {
        const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
      
        try {
          const data = await adapter.readDocument(ref);
          callback({ error: false, snapshot: { ref, data } });
        } catch (err) {
          console.error(err);
          callback({ error: err.message, snapshot: { ref } });
        }

        break;
      }

      case 'database.readCollection': {
        const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
        
        try {
          const data = await adapter.readCollection(ref);
          const docs = data.map((doc) => ({ ref: ref.doc(doc.id), data: doc }))
          callback({ error: false, snapshot: { ref, data: docs } });
        } catch (err) {
          console.error(err);
          callback({ error: err.message, snapshot: { ref } });
        }

        break;
      }

      default: {
        callback({ error: 'Operation not supported on VirtualClient: ' + name });
        break;
      }
    }
  }
}

module.exports = VirtualClient;