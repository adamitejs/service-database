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

  readCollection(ref) {
    let query = (
      r
        .db(ref.database.name)
        .table(ref.name)
    );

    if (ref._limit) {
      query = query.limit(ref._limit);
    }

    return (
      query
        .run(this.connection)
        .then(r => r.toArray())
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
        .get(ref.id)
        .update(data, { returnChanges: true })
        .run(this.connection)
        .then((result) => result.changes[0].new_val)
    );
  }

  deleteDocument(ref) {
    return (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.id)
        .delete()
        .run(this.connection)
    );
  }

  subscribeDocument(ref, callback) {
    const changes = (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.id)
        .changes({ includeInitial: true })
    );

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  subscribeCollection(ref, callback) {
    const changes = (
      r
        .db(ref.database.name)
        .table(ref.name)
        .changes({ includeInitial: true })
    );

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }
}

module.exports = RethinkDbAdapater;