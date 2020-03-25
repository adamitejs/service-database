let database = {};
let docEvents = [];
let colEvents = [];

function documentEvent(collection, id, oldData, newData) {
  const docSubs = docEvents.filter(evt => evt.collection === collection && evt.id === id);
  const colSubs = colEvents.filter(evt => evt.collection === collection);

  docSubs.forEach(sub => sub.callback(null, oldData, newData));
  colSubs.forEach(sub => sub.callback(null, oldData, newData));
}

const adapter = {
  documentEvent,
  readDocument(collection, id) {
    database[collection] = database[collection] || {};
    return database[collection][id];
  },
  readCollection(collection) {
    database[collection] = database[collection] || {};
    return Object.keys(database[collection]).map(id => ({
      id,
      ...database[collection][id]
    }));
  },
  createDocument(collection, data) {
    const id =
      data.id ||
      Math.random()
        .toString(36)
        .substring(2, 15) +
        Math.random()
          .toString(36)
          .substring(2, 15);

    database[collection] = database[collection] || {};
    delete data.id;
    database[collection][id] = data;

    documentEvent(collection, id, null, { id, ...data });

    return { id, ...data };
  },
  updateDocument(collection, id, data) {
    database[collection] = database[collection] || {};
    delete data.id;

    const oldData = { id, ...database[collection][id] };

    Object.assign(database[collection][id], data);

    documentEvent(collection, id, oldData, { id, ...database[collection][id] });

    return { id, ...database[collection][id] };
  },
  deleteDocument(collection, id) {
    database[collection] = database[collection] || {};

    const result = { id, ...database[collection][id] };

    delete database[collection][id];

    documentEvent(collection, id, result, null);
    return result;
  },

  createDocuments(collection, documents) {
    return documents.map(doc => this.createDocument(collection, doc));
  },
  updateDocuments(collection, documents) {
    return documents.map(doc => this.updateDocument(collection, doc.id, doc));
  },
  deleteDocuments(collection, ids) {
    return ids.map(id => this.deleteDocument(collection, id));
  },

  subscribeDocument(subscriptionId, collection, id, callback) {
    docEvents.push({ subscriptionId, collection, id, callback });
  },
  subscribeCollection(subscriptionId, collection, callback) {
    colEvents.push({ subscriptionId, collection, callback });
  },
  unsubscribe(subscriptionId) {
    docEvents = docEvents.filter(evt => evt.subscriptionId !== subscriptionId);
    colEvents = colEvents.filter(evt => evt.subscriptionId !== subscriptionId);
  }
};

function comparator(value, test, operation) {
  if (operation === "==") return value === test;
  if (operation === "!=") return value !== test;
  if (operation === ">") return value > test;
  if (operation === "<") return value < test;
  if (operation === ">=") return value >= test;
  if (operation === "<=") return value <= test;
  if (operation === "array-contains") return value.indexOf(test) >= 0;
  if (operation === "array-not-contains") return value.indexOf(test) == -1;
  // if (operation === "matches") return inVal..match(value);
  // if (operation === "not-matches") return row.match(value).not();
}

class MemoryAdapter {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    try {
      database = (await this.config.readDatabase()) || (await this.config.getDefaultDatabase());
    } catch (e) {
      console.log(e);
      database = await this.config.getDefaultDatabase();
    }

    setInterval(() => {
      this.config.writeDatabase(database);
    }, 10000);
  }

  async readDocument(ref) {
    return adapter.readDocument(ref.collection.name, ref.id);
  }

  async readCollection(ref) {
    let result = adapter.readCollection(ref.name);

    if (ref.query.where) {
      // TODO:  PZC - similar to document subscribe, this can use "where.every" within a single filter
      ref.query.where.forEach(([fieldName, operation, value]) => {
        result = result.filter(row => comparator(row[fieldName], value, operation));
      });
    }

    // if (ref.query.orderBy) {
    //   ref.query.orderBy.forEach(ordering => {
    //     const func = ordering[1] === "asc" ? r.asc : r.desc;
    //     query = query.orderBy(func(ordering[0]));
    //   });
    // }

    // if (ref.query.limit) {
    //   query = query.limit(ref.query.limit);
    // }

    return result;
  }

  async createDocument(ref, data) {
    return adapter.createDocument(ref.name, data);
  }

  async updateDocument(ref, data, options = {}) {
    return adapter.updateDocument(ref.collection.name, ref.id, data);
  }

  async deleteDocument(ref) {
    return adapter.deleteDocument(ref.collection.name, ref.id);
  }

  async subscribeDocument(subscriptionId, ref, callback) {
    adapter.subscribeDocument(subscriptionId, ref.collection.name, ref.id, callback);
  }

  async subscribeCollection(subscriptionId, ref, callback) {
    adapter.subscribeCollection(subscriptionId, ref.name, (err, oldValue, newValue) => {
      let allowed = true;
      if (ref.query.where) {
        allowed = ref.query.where.every(([fieldName, operation, value]) => comparator(newValue[fieldName], value, operation));
      }

      if (allowed) {
        callback(err, oldValue, newValue);
      }
    });
  }

  unsubscribe(subscriptionId) {
    adapter.unsubscribe(subscriptionId);
  }

  getCollections(ref) {
    return Object.keys(database);
  }
}

module.exports = {
  adapter,
  MemoryAdapter
};
