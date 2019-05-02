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

    if (ref.query.where) {
      ref.query.where.forEach(where => {
        query = query.filter(this._getFilter(where));
      });
    }

    if (ref.query.orderBy) {
      ref.query.orderBy.forEach(ordering => {
        const func = (ordering[1] === 'asc') ? r.asc : r.desc;
        query = query.orderBy(func(ordering[0]));
      });
    }

    if (ref.query.limit) {
      query = query.limit(ref.query.limit);
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
        .then((result) => result.changes.length > 0 && result.changes[0].new_val)
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

  subscribeDocument(ref, options, callback) {
    const changes = (
      r
        .db(ref.collection.database.name)
        .table(ref.collection.name)
        .get(ref.id)
        .changes({ includeInitial: options.initialValues })
    );

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  subscribeCollection(ref, options, callback) {
    const changes = (
      r
        .db(ref.database.name)
        .table(ref.name)
        .changes({ includeInitial: options.initialValues })
    );

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  _getFilter(where) {
    const [ fieldName, operation, value ] = where;
    const row = r.row(fieldName);

    if (operation === '==') return row.eq(value);
    if (operation === '!=') return row.ne(value);
    if (operation === '>')  return row.gt(value);
    if (operation === '<')  return row.lt(value);
    if (operation === '>=') return row.ge(value);
    if (operation === '<=') return row.le(value);
  }
}

module.exports = RethinkDbAdapater;