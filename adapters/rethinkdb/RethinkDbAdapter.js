const r = require("rethinkdb");
const { EventEmitter } = require("events");
const createDeferred = require("./createDeferred");

class RethinkDbAdapater extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.subscriptions = {};
    this.tablesBeingCreated = {};
  }

  connect() {
    r.connect(
      this.config || {
        host: "localhost",
        port: 28015
      },
      (err, connection) => {
        if (err) throw err;
        this.connection = connection;
        this._createDefaultDbIfNecessary();
      }
    );
  }

  async readDocument(ref) {
    await this._createCollectionTableIfNecessary(ref.collection);

    return r
      .db(this._getDbNameOrDefault(ref.collection.database.name))
      .table(ref.collection.name)
      .get(ref.id)
      .run(this.connection);
  }

  async readCollection(ref) {
    await this._createCollectionTableIfNecessary(ref);

    let query = r.db(this._getDbNameOrDefault(ref.database.name)).table(ref.name);

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
      .db(this._getDbNameOrDefault(ref.database.name))
      .table(ref.name)
      .insert(data, { returnChanges: true })
      .run(this.connection)
      .then(result => result.changes[0].new_val);
    // TODO: What if the result has a problem? Revisit error handling here later.
  }

  async updateDocument(ref, data, options = {}) {
    await this._createCollectionTableIfNecessary(ref.collection);

    if (options.replace) {
      return r
        .db(this._getDbNameOrDefault(ref.collection.database.name))
        .table(ref.collection.name)
        .replace(
          {
            id: ref.id,
            ...data
          },
          {
            returnChanges: true
          }
        )
        .run(this.connection)
        .then(result => result.changes.length > 0 && result.changes[0].new_val);
    }

    return r
      .db(this._getDbNameOrDefault(ref.collection.database.name))
      .table(ref.collection.name)
      .insert(
        {
          id: ref.id,
          ...data
        },
        {
          conflict: "update",
          returnChanges: true
        }
      )
      .run(this.connection)
      .then(result => result.changes.length > 0 && result.changes[0].new_val);
  }

  async deleteDocument(ref) {
    await this._createCollectionTableIfNecessary(ref.collection);

    const result = await r
      .db(this._getDbNameOrDefault(ref.collection.database.name))
      .table(ref.collection.name)
      .get(ref.id)
      .delete()
      .run(this.connection);

    return result;
  }

  async subscribeDocument(subscriptionId, ref, callback) {
    await this._createCollectionTableIfNecessary(ref.collection);

    const changes = r
      .db(this._getDbNameOrDefault(ref.collection.database.name))
      .table(ref.collection.name)
      .get(ref.id)
      .changes();

    changes.run(this.connection, (err, cursor) => {
      this.subscriptions[subscriptionId] = cursor;

      cursor.each((err, row) => {
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  async subscribeCollection(subscriptionId, ref, callback) {
    await this._createCollectionTableIfNecessary(ref);

    const changes = r
      .db(this._getDbNameOrDefault(ref.database.name))
      .table(ref.name)
      .changes();

    changes.run(this.connection, (err, cursor) => {
      this.subscriptions[subscriptionId] = cursor;

      cursor.each((err, row) => {
        if (err) return;
        callback(err, row.old_val, row.new_val);
      });
    });
  }

  unsubscribe(subscriptionId) {
    if (!this.subscriptions[subscriptionId]) return;
    this.subscriptions[subscriptionId].close();
    delete this.subscriptions[subscriptionId];
  }

  getCollections(ref) {
    return r
      .db(this._getDbNameOrDefault(ref.name))
      .tableList()
      .run(this.connection);
  }

  _getDbNameOrDefault(name) {
    return name === "default" ? this.config.defaultDb || "default" : name;
  }

  async _createDefaultDbIfNecessary() {
    const dbList = await r.dbList().run(this.connection);
    if (dbList.includes(this.config.defaultDb || "default")) return;
    await r.dbCreate(this.config.defaultDb || "default").run(this.connection);
  }

  async _createTable(ref) {
    const tableList = await this.getCollections(ref.database);

    if (!tableList.includes(ref.name)) {
      return r
        .db(this._getDbNameOrDefault(ref.database.name))
        .tableCreate(ref.name)
        .run(this.connection);
    }
  }

  async _createCollectionTableIfNecessary(ref) {
    if (!this.tablesBeingCreated[ref.name]) {
      const def = createDeferred();
      def.resolve(this._createTable(ref));
      this.tablesBeingCreated[ref.name] = def;
      return def.promise;
    }

    return this.tablesBeingCreated[ref.name].promise;
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
    if (operation === "array-contains") return row.contains(value);
    if (operation === "array-not-contains") return row.contains(value).not();
  }
}

module.exports = RethinkDbAdapater;
