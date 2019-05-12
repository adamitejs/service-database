const r = require("rethinkdb");

class RethinkDbAdapater {
  constructor(config) {
    this.config = config;
  }

  connect() {
    r.connect(
      {
        host: "localhost",
        port: 28015
      },
      (err, connection) => {
        if (err) throw err;
        this.connection = connection;
      }
    );
  }

  async readDocument(ref) {
    await this._createCollectionTableIfNecessary(ref.collection);

    return r
      .db(ref.collection.database.name)
      .table(ref.collection.name)
      .get(ref.id)
      .run(this.connection);
  }

  async readCollection(ref) {
    await this._createCollectionTableIfNecessary(ref);

    let query = r.db(ref.database.name).table(ref.name);

    if (ref.query.where) {
      ref.query.where.forEach(where => {
        query = query.filter(this._getFilter(where));
      });
    }

    if (ref.query.orderBy) {
      ref.query.orderBy.forEach(ordering => {
        const func = ordering[1] === "asc" ? r.asc : r.desc;
        query = query.orderBy(func(ordering[0]));
      });
    }

    if (ref.query.limit) {
      query = query.limit(ref.query.limit);
    }

    return query.run(this.connection).then(r => r.toArray());
  }

  async createDocument(ref, data) {
    await this._createCollectionTableIfNecessary(ref);

    return r
      .db(ref.database.name)
      .table(ref.name)
      .insert(data, { returnChanges: true })
      .run(this.connection)
      .then(result => result.changes[0].new_val);
    // TODO: What if the result has a problem? Revisit error handling here later.
  }

  async updateDocument(ref, data) {
    await this._createCollectionTableIfNecessary(ref.collection);

    return r
      .db(ref.collection.database.name)
      .table(ref.collection.name)
      .get(ref.id)
      .update(data, { returnChanges: true })
      .run(this.connection)
      .then(result => result.changes.length > 0 && result.changes[0].new_val);
  }

  async deleteDocument(ref) {
    await this._createCollectionTableIfNecessary(ref.collection);

    const result = await r
      .db(ref.collection.database.name)
      .table(ref.collection.name)
      .get(ref.id)
      .delete()
      .run(this.connection);

    await this._deleteCollectionTableIfNecessary(ref.collection);
    return result;
  }

  subscribeDocument(ref, options, callback) {
    const changes = r
      .db(ref.collection.database.name)
      .table(ref.collection.name)
      .get(ref.id)
      .changes({ includeInitial: options.initialValues });

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  subscribeCollection(ref, options, callback) {
    const changes = r
      .db(ref.database.name)
      .table(ref.name)
      .changes({ includeInitial: options.initialValues });

    changes.run(this.connection, (err, cursor) => {
      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  async _createCollectionTableIfNecessary(ref) {
    const db = r.db(ref.database.name);
    const tables = await db.tableList().run(this.connection);
    if (tables.indexOf(ref.name) > -1) return;
    await db.tableCreate(ref.name).run(this.connection);
  }

  async _deleteCollectionTableIfNecessary(ref) {
    const db = r.db(ref.database.name);
    const table = db.table(ref.name);
    const rowCount = await table.count().run(this.connection);
    if (rowCount > 0) return;
    await db.tableDrop(ref.name).run(this.connection);
  }

  _getFilter(where) {
    const [fieldName, operation, value] = where;
    const row = r.row(fieldName);

    if (operation === "==") return row.eq(value);
    if (operation === "!=") return row.ne(value);
    if (operation === ">") return row.gt(value);
    if (operation === "<") return row.lt(value);
    if (operation === ">=") return row.ge(value);
    if (operation === "<=") return row.le(value);
  }
}

module.exports = RethinkDbAdapater;
