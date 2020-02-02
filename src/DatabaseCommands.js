const { isEqual } = require("lodash");
const uuid = require("uuid");
const traverse = require("traverse");
const RuleValidator = require("../rules/RuleValidator");
const { DatabaseDeserializer, DatabaseServerValue } = require("@adamite/sdk");

class DatabaseCommands {
  constructor(service) {
    this.service = service;
    this.adapter = this.service.config.adapter;
    this.rules = new RuleValidator(this.service.config.rules);
  }

  start() {
    this.adapter.connect();
  }

  async createDocument(client, args) {
    const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);

    if (args.data) this._replaceServerValues(args.data);
    await this.rules.validateRule("create", ref, { client, ref, data: args.data });
    const data = await this.adapter.createDocument(ref, args.data);
    const documentRef = ref.doc(data.id);

    return { snapshot: { ref: documentRef, data } };
  }

  async readDocument(client, args) {
    const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);

    const data = await this.adapter.readDocument(ref);
    await this.rules.validateRule("read", ref, { client, ref }, { data });

    return { snapshot: { ref, data } };
  }

  async updateDocument(client, args) {
    const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);

    if (args.data) this._replaceServerValues(args.data);
    await this.rules.validateRule("update", ref, { client, ref, data: args.data });
    const data = await this.adapter.updateDocument(ref, args.data, args.options);

    return { snapshot: { ref, data } };
  }

  async deleteDocument(client, args) {
    const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);

    await this.rules.validateRule("delete", ref, { client, ref });
    await this.adapter.deleteDocument(ref, args.data);

    return { snapshot: { ref } };
  }

  async readCollection(client, args) {
    const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);

    const data = await this.adapter.readCollection(ref);

    const docPromises = data.map(async doc => {
      try {
        const docRef = ref.doc(doc.id);
        await this.rules.validateRule("read", docRef, { client, ref: docRef }, { data: doc });
        return { ref: docRef, data: doc };
      } catch (err) {
        console.error(err);
        return undefined;
      }
    });

    const resolvedDocs = await Promise.all(docPromises);
    const definedDocs = resolvedDocs.filter(doc => !!doc);

    return { snapshot: { ref, data: definedDocs } };
  }

  async subscribeDocument(client, args) {
    const ref = DatabaseDeserializer.deserializeDocumentReference(args.ref);
    const subscriptionId = uuid.v4();

    await this.adapter.subscribeDocument(
      subscriptionId,
      ref,
      this._handleDocumentSubscriptionUpdate(ref, client, subscriptionId)
    );

    return { subscription: { ref, id: subscriptionId } };
  }

  async subscribeCollection(client, args) {
    const ref = DatabaseDeserializer.deserializeCollectionReference(args.ref);
    const subscriptionId = uuid.v4();

    await this.adapter.subscribeCollection(
      subscriptionId,
      ref,
      this._handleCollectionSubscriptionUpdate(ref, client, subscriptionId)
    );

    return { subscription: { ref, id: subscriptionId } };
  }

  unsubscribe(client, args) {
    this.adapter.unsubscribe(args.subscriptionId);
  }

  async adminGetCollections(client, args) {
    this._verifyAdminAccess(client);
    const ref = DatabaseDeserializer.deserializeDatabaseReference(args.ref);
    const collections = await this.adapter.getCollections(ref);
    return { collections };
  }

  _verifyAdminAccess(client) {
    if (!client.socket.request._query.secret) throw new Error("Admin commands require secret authentication.");
  }

  _replaceServerValues(data) {
    traverse(data).forEach(function(x) {
      if (isEqual(x, DatabaseServerValue.timestamp)) {
        this.update(Date.now());
      }
    });
  }

  _handleCollectionSubscriptionUpdate(ref, client, subscriptionId) {
    return async (err, oldData, newData) => {
      if (err) {
        console.error(err);

        this.service.client.socket.emit(subscriptionId, {
          error: err.message,
          subscription: { ref, id: subscriptionId }
        });

        return;
      }

      const oldDocRef = oldData && ref.doc(oldData.id);
      const newDocRef = newData && ref.doc(newData.id);

      if (oldData) {
        try {
          await this.rules.validateRule("read", oldDocRef, { client, ref: oldDocRef }, { data: oldData });
        } catch (err) {
          console.error(err);
          oldData = undefined;
        }
      }

      if (newData) {
        try {
          await this.rules.validateRule("read", newDocRef, { client, ref: newDocRef }, { data: newData });
        } catch (err) {
          console.error(err);
          newData = undefined;
        }
      }

      if (!oldData && !newData) return; // no change required;
      const changeType = this._computeChangeType(oldData, newData);

      client.socket.emit(subscriptionId, {
        error: false,
        subscription: { ref, id: subscriptionId },
        changeType,
        newSnapshot: newData && { ref: newDocRef, data: newData },
        oldSnapshot: oldData && { ref: oldDocRef, data: oldData }
      });
    };
  }

  _handleDocumentSubscriptionUpdate(ref, client, subscriptionId) {
    return async (err, oldData, newData) => {
      if (err) {
        console.error(err);

        this.service.client.socket.emit(subscriptionId, {
          error: err.message,
          subscription: { ref, id: subscriptionId }
        });

        return;
      }

      if (oldData) {
        try {
          await this.rules.validateRule("read", ref, { client, ref }, { data: oldData });
        } catch (err) {
          console.error(err);
          oldData = undefined;
        }
      }

      if (newData) {
        try {
          await this.rules.validateRule("read", ref, { client, ref }, { data: newData });
        } catch (err) {
          console.error(err);
          newData = undefined;
        }
      }

      if (!oldData && !newData) return; // no change required;
      const changeType = this._computeChangeType(oldData, newData);

      client.socket.emit(subscriptionId, {
        error: false,
        subscription: { ref, id: subscriptionId },
        changeType,
        newSnapshot: newData && { ref, data: newData },
        oldSnapshot: oldData && { ref, data: oldData }
      });
    };
  }

  _computeChangeType(oldData, newData) {
    if (oldData && newData) return "update";
    else if (!oldData && newData) return "create";
    else return "delete";
  }
}

module.exports = DatabaseCommands;
