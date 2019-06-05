const knex = require("knex");

class PostgresAdapter {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    this.client = knex(
      this.config || {
        client: "pg",
        version: "7.2",
        connection: {
          host: "127.0.0.1",
          database: "adamite"
        }
      }
    );
  }

  async readDocument(ref) {
    const rows = await this.client
      .select("*")
      .from(ref.collection.name)
      .where({ id: ref.id });
    return rows[0];
  }

  readCollection(ref) {
    let query = this.client.select("*").from(ref.name);

    if (ref.query.where) {
      ref.query.where.forEach(where => {
        const [fieldName, operation, value] = where;
        query = query.where(fieldName, operation, value);
      });
    }

    if (ref.query.orderBy) {
      ref.query.orderBy.forEach(ordering => {
        const [fieldName, direction] = ordering;
        query = query.orderBy(fieldName, direction);
      });
    }

    if (ref.query.limit) {
      query = query.limit(ref.query.limit);
    }

    return query;
  }

  async createDocument(ref, data) {
    const rows = await this.client
      .insert(data)
      .into(ref.name)
      .returning("*");

    return rows[0];
  }

  async updateDocument(ref, data, options = {}) {
    const rows = await this.client(ref.collection.name)
      .update(data, "*")
      .where({ id: ref.id });

    return rows[0];
  }

  async deleteDocument(ref) {
    const rows = await this.client(ref.collection.name)
      .delete()
      .where({ id: ref.id })
      .returning("*");

    return rows[0];
  }

  async subscribeDocument(subscriptionId, ref, callback) {}

  async subscribeCollection(subscriptionId, ref, callback) {}

  unsubscribe(subscriptionId) {}

  async getCollections(ref) {
    const tables = await this.client
      .select("tablename")
      .from("pg_tables")
      .where({ schemaname: "public" });

    return tables.map(t => t.tablename);
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

module.exports = PostgresAdapter;
