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
        .get(ref.name)
        .run(this.connection)
    );
  }

  createDocument(ref, data) {
    return (
      r
        .db(ref.database.name)
        .table(ref.name)
        .insert({ data })
        .run(this.connection)
    );
  }
}

module.exports = RethinkDbAdapater;