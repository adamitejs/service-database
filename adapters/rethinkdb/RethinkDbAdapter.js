const r = require('rethinkdb');

class RethinkDbAdapater {
  constructor(config) {
    this.config = config;
  }

  connect() {
    r.connect({
      host: 'localhost',
      port: 28015
    }, (err, connection) => {
      if (err) throw err;
      this.connection = connection;
    });
  }

  readDocument(ref) {
    return (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.id)
        .run(this.connection)
    );
  }

  createDocument(ref, data) {
    return (
      r
        .db(ref.database.name)
        .table(ref.name)
        .insert(data, { returnChanges: true })
        .run(this.connection)
        .then((result) => result.changes[0].new_val)
    );
    // TODO: What if the result has a problem? Revisit error handling here later.
  }
  
  updateDocument(ref, data) {
    return (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.name)
        .update(data)
        .run(this.connection)
    );
  }

  deleteDocument(ref) {
    return (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.name)
        .delete()
        .run(this.connection)
    );
  }
}

module.exports = RethinkDbAdapater;